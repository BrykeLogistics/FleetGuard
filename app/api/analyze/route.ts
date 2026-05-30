import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'
import { createClient } from '@supabase/supabase-js'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// ───────────────────────────────────────────────────────────────────
// MODEL CONFIG — keyed by pass type, read from env, Sonnet defaults.
// To put Opus on the baseline pass once you've validated it:
//   set  ANALYZE_MODEL_BASELINE=claude-opus-4-8  in Vercel. No code change.
// Weeklies (comparison) intentionally stay on Sonnet for margin + because
// comparison mode already works well and is tuned to Sonnet's judgment.
// ───────────────────────────────────────────────────────────────────
const MODELS = {
  baseline:   process.env.ANALYZE_MODEL_BASELINE   || 'claude-sonnet-4-6',
  comparison: process.env.ANALYZE_MODEL_COMPARISON || 'claude-sonnet-4-6',
  interior:   process.env.ANALYZE_MODEL_INTERIOR   || 'claude-sonnet-4-6',
}

// Bumped from 3000 → 4096 because exterior is now ONE consolidated call
// (all photos) instead of two half-calls, so a single response carries every
// finding. Truncation recovery below still guards the worst case.
// NOTE: if you see Vercel timeouts, that's the request-path/Hobby ceiling we
// discussed — the fix is moving analysis to a background job, not lowering this.
const MAX_TOKENS = 4096

const STORAGE_BUCKET = process.env.ANALYZE_STORAGE_BUCKET || 'inspection-photos'

// Lazy admin client — only constructed if a request actually sends storage
// paths (i.e. after the Storage-URL migration). Base64 requests never touch it.
let _admin: ReturnType<typeof createClient> | null = null
function admin() {
  if (!_admin) {
    _admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
    )
  }
  return _admin
}

// ───────────────────────────────────────────────────────────────────
// Tuned knowledge blocks — UNCHANGED from your version.
// ───────────────────────────────────────────────────────────────────
const WEAK_POINTS: Record<string, string> = {
  sprinter: `Transit/Sprinter/ProMaster:
- Front: gray/charcoal bumper = FACTORY. Cab cheek panels (headlight-to-wheel-arch) = curb strikes. 3 amber roof marker lights = DOT, check all.
- Roof: ALUMINUM — dents = subtle ripples. Full-length drip rail seam both sides — separation = water intrusion. Rear roof lights.
- Sides: sliding door track, body side step rail (chrome strip, wheel-to-wheel).
- Rear: white bumper — bare gray/silver = paint-through (moderate, not scuff). Corner gap from body = unmounted. Door hinges.`,

  stepvan: `Step Van (Utilimaster/Alvan/Grumman/P-series):
- Front: CRITICAL — zone between grille bottom and bumper top. Mechanical components visible = missing lower fascia (moderate-critical). Bumper end caps both corners. Bumper level as unit. Cab cheek panels. A-pillar/cab junction below windshield both sides.
- Roof: Front edge seam both corners. Full-length side seams. Rear top seam flashing full width — lifted/rust = water intrusion (urgent FL humidity).
- Sides: Area above front tires. Lower 18" full length — white-on-white scrapes, scan for tonal variation. Sub-12" = flag for physical verification.
- Rear: Upper corners BOTH sides (dock dents). Door vertical edges. Door hardware. Rear bumper. Step platform corners.
- DO NOT FLAG: door pull straps/chains/holders/vent latches = standard. Tan/beige grille surround = factory. Rotor/drum rust = normal wear.`,

  boxtruck: `Box Truck: rear bumper dock strikes, lower panel rust/scrapes, roof front edge, dual rear tire outer sidewalls, cargo door seals, underride guard, frame rails.`,
}

const ORIENTATION = `USA: driver=LEFT. Front photo: driver=YOUR LEFT. Rear photo: driver=YOUR RIGHT. Always say "driver side" or "passenger side", never left/right alone. Each photo is labeled with the angle it was taken from — use that label to orient every finding.`

const DAMAGE_KNOWLEDGE = `FLEET-TRAINED RULES:

PAINT SEVERITY: scuff(paint intact)=minor → clearcoat scratch=minor-mod → bare metal=moderate+RUST RISK → bubbling rust=moderate urgent → active rust=critical. Transit bare gray bumper=moderate not scuff.

RUST: rotor/drum rust=NORMAL WEAR. Surface corrosion=minor. Bubbling/flaking=moderate escalate. Seam rust=water intrusion risk.

PHOTO DISTANCE: Photos may be taken from varying distances due to tight hub/dock spaces. Close-up photos showing partial panels are valid — assess what IS visible fully and accurately. Do not penalize for incomplete vehicle coverage. If only part of a panel is visible, assess that area thoroughly. Note "partial view — [zone]" in description only if the partial view limits your assessment.

HIGH-MISS PATTERNS:
1. Missing lower front fascia — mechanical parts visible below grille = flag moderate-critical
2. Lower body scrapes — white-on-white, scan full 18" for tonal/sheen variation, one continuous finding
3. Rear roof seam flashing — thin dark line or rust at top rear edge = NOT normal shadow, flag moderate-critical
4. Upper rear corner dents — dock impacts, check BOTH corners if one is dented
5. Sub-12" lower body — can't resolve from full-side photo, flag for physical verification
6. Cab cheek crease — curved panel between headlight and wheel arch, curb strikes
7. Transit drip rail separation — thin lifted edge along roof line, full length both sides
8. Rear cargo door edge deformation — bent vertical edge = seal/latch issue
9. A-pillar/cab dent — below windshield junction, sideswipe damage
10. Transit step rail — chrome strip lower body, blends with shadow

RULES: Continuous damage = ONE finding with start/end points. Bumper = whole unit assessment. Each photo independent. Headlight oxidation only if clearly visible. Uncertain curved surface = "possible — verify".`

// ───────────────────────────────────────────────────────────────────
// Prompt builder. Comparison-mode block is UNCHANGED. Baseline block now
// asks for visible evidence per finding (grounding) while KEEPING the
// legal-completeness requirement. New `evidence` field added to schema.
// ───────────────────────────────────────────────────────────────────
function buildPrompt(
  truckInfo: string, vehicleContext: string, vehicleType: string,
  inspectionType: string, inspector: string, notes: string,
  baselineText: string, hasBaseline: boolean, isRental: boolean,
  photoGroup: 'exterior' | 'interior'
): string {
  const weakPoints = WEAK_POINTS[vehicleType] || ''

  const exteriorChecklist = `REPORT DAMAGE ONLY. Skip undamaged areas.

FRONT: Lower fascia (grille-to-bumper gap), bumper alignment+condition+end caps, cab cheeks, A-pillar junctions, lights/lenses, roof marker lights (Transits), panel above windshield.
ROOF: Front edge seam corners, full-length side seams, rear top seam flashing, surface dents, clearance lights.
SIDES: Upper panels, lower 18" full length (tonal scan), sub-12" zone, step rail (Transits), above-tire zones (step vans), mirrors (glass + housing).
REAR: Upper corners both sides, rear seam flashing, door vertical edges, door hardware, bumper, step platform, all reflectors.
DECALS: Tears, peeling, damage beneath graphics.

COVERAGE: You have the full set of exterior photos for this vehicle in one batch. Only assess zones you can actually SEE in the provided photos. Do not infer or report damage for a zone that no photo shows.`

  const interiorChecklist = `REPORT DAMAGE ONLY.
Dash: warning lights (list each), cracked dash.
Cargo: threshold plate, tie-down tracks, floor damage, wall/ceiling dents or holes (ignore light scuffing).`

  const rentalNote = isRental ? `\nRENTAL: Heightened sensitivity — document even minor items, do not round down severity.` : ''

  const baselineInstructions = !hasBaseline
    ? `BASELINE INSPECTION — INITIAL DOCUMENTATION MODE:
This is the legal baseline for all future comparisons. Document ALL damage including minor items — completeness is required.
GROUNDING (anti-guessing): For every finding, the "evidence" field must state what is VISIBLY observable in a specific labeled photo (e.g. "Photo 3 (rear): ~6in dark dent lower passenger corner, casts shadow, paint cracked"). If you cannot point to specific visible evidence in a specific photo, do NOT assert the finding as fact — include it but set needsVerification:true and confidence to your true (lower) value. Normal factory geometry (seams, panel gaps, grille surrounds, drip rails) is NOT damage. Mark all findings is_new: false.`
    : `ROLLING COMPARISON MODE — WEEK-OVER-WEEK CHANGE DETECTION:
You are comparing this week's photos against last week's documented damage listed below.

CRITICAL RULES FOR COMPARISON MODE:
1. is_new: true ONLY if you are highly confident (confidence ≥ 85) the damage was NOT present last week
2. Lighting differences, shadow variation, and camera angle changes are NOT new damage — default to is_new: false when uncertain
3. A finding must be in a clearly DIFFERENT location than any existing baseline entry to be flagged as new
4. If a baseline entry says "lower driver side panel scrape" and you see a mark in the same zone, mark is_new: false even if it looks slightly different — angle/lighting variation is expected
5. Only flag is_new: true for damage that is unambiguously in a new location or is a clearly different type of damage
6. When in doubt — is_new: false. False negatives are better than false positives for weekly checks.
7. Still document ALL damage (old and new) so the record is complete, but is_new must be conservative.`

  return `Expert FedEx fleet damage inspector, Bryke Logistics Fort Lauderdale FL. Legal/DOT documentation.

VEHICLE: ${truckInfo} | TYPE: ${vehicleContext} | INSPECTION: ${inspectionType} | INSPECTOR: ${inspector}
NOTES: ${notes || 'None'}${baselineText}${rentalNote}

${ORIENTATION}

${baselineInstructions}

${weakPoints ? `VEHICLE WEAK POINTS:\n${weakPoints}\n` : ''}${DAMAGE_KNOWLEDGE}

${photoGroup === 'interior' ? interiorChecklist : exteriorChecklist}

SEVERITY: critical=structural/safety/DOT fail/frame/missing fascia. moderate=fist-size+ dent/bare metal/cracked lens/missing trim/rust bubbling/bumper misalignment/seam separation. minor=scuff/small ding/chip/light curb rash.
CONFIDENCE: rate 0-100. Under 70: needsVerification:true + verificationNote.${hasBaseline ? ' In comparison mode, confidence < 85 for any is_new:true finding = automatically set is_new:false.' : ''}
REPAIR: DIY=mirrors/lights/trim/bumper covers/steps/hubcaps/reflectors/handles. Shop=frame/major panels/roof/windshield/structural/seams.

JSON only, no markdown:
{"overallCondition":"Good|Fair|Poor|Critical","summary":"2-3 sentences","totalEstimatedRepairCost":{"low":0,"high":0},"damages":[{"severity":"critical|moderate|minor","location":"driver/passenger side + zone","description":"size, paint status, full extent","evidence":"which labeled photo + what is visibly seen","recommendation":"specific action","is_new":false,"confidence":85,"needsVerification":false,"verificationNote":"","repairEstimate":{"low":0,"high":0,"method":"DIY or Shop"},"diyReplaceable":false,"partName":"","partSearchQuery":""}],"followUpRequired":false,"estimatedRepairUrgency":"Immediate|Within 1 week|Within 1 month|Monitoring only"}`
}

// ───────────────────────────────────────────────────────────────────
// Dedup — FIXED: driver vs passenger can never merge (was silently deleting
// one of two corner findings, defeating the "check BOTH corners" rule).
// ───────────────────────────────────────────────────────────────────
function sideOf(loc: string): 'driver' | 'passenger' | 'unknown' {
  const l = loc.toLowerCase()
  const d = l.includes('driver')
  const p = l.includes('passenger')
  if (d && !p) return 'driver'
  if (p && !d) return 'passenger'
  return 'unknown'
}

function deduplicateDamages(damages1: any[], damages2: any[]): any[] {
  const all = [...damages1, ...damages2]
  const deduped: any[] = []
  for (const d of all) {
    const dLoc = (d.location || '').toLowerCase()
    const dDesc = (d.description || '').toLowerCase()
    const dSide = sideOf(dLoc)
    const dLocWords = dLoc.split(/\s+/).filter((w: string) => w.length > 3)
    const dupIdx = deduped.findIndex(existing => {
      // Hard guard: opposite, known sides are never the same damage.
      const eSide = sideOf((existing.location || '').toLowerCase())
      if (dSide !== 'unknown' && eSide !== 'unknown' && dSide !== eSide) return false
      const eLoc = (existing.location || '').toLowerCase()
      const eDesc = (existing.description || '').toLowerCase()
      if (dLocWords.filter((w: string) => eLoc.includes(w)).length < 2) return false
      const dDescWords = dDesc.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 4)
      return dDescWords.filter((w: string) => eDesc.includes(w)).length >= 2
    })
    if (dupIdx === -1) deduped.push(d)
    else if ((d.confidence || 0) > (deduped[dupIdx].confidence || 0)) deduped[dupIdx] = d
  }
  return deduped
}

// UNCHANGED — comparison-mode enforcement stays exactly as-is.
function enforceComparisonRules(damages: any[], hasBaseline: boolean): any[] {
  if (!hasBaseline) return damages
  return damages.map(d => ({
    ...d,
    is_new: d.is_new && (d.confidence || 0) >= 85 ? true : false,
  }))
}

// ───────────────────────────────────────────────────────────────────
// Image input normalization. Accepts EITHER:
//   { data, media_type, label }              ← base64 (today's client)
//   { storage_path, bucket?, label }         ← Supabase path (after migration)
// Returns base64 ready for the Anthropic SDK. This dual support is what lets
// the Storage-URL migration happen later without re-touching this route.
// ───────────────────────────────────────────────────────────────────
type ImgIn = { data?: string; media_type?: string; storage_path?: string; bucket?: string; label?: string }
type ImgResolved = { data: string; media_type: string; label: string }

async function resolveImage(img: ImgIn): Promise<ImgResolved | null> {
  const media_type = img.media_type || 'image/jpeg'
  const label = img.label || 'unlabeled'
  if (img.data) return { data: img.data, media_type, label }
  if (img.storage_path) {
    try {
      const { data, error } = await admin().storage
        .from(img.bucket || STORAGE_BUCKET)
        .download(img.storage_path)
      if (error || !data) return null
      const buf = Buffer.from(await data.arrayBuffer())
      return { data: buf.toString('base64'), media_type, label }
    } catch {
      return null
    }
  }
  return null
}

// ───────────────────────────────────────────────────────────────────
// One model call. Photos are now LABELED and interleaved with a text marker
// before each image, so ORIENTATION rules actually have something to bind to.
// ───────────────────────────────────────────────────────────────────
async function analyzePhotos(images: ImgResolved[], prompt: string, model: string): Promise<any> {
  const content: any[] = []
  images.forEach((img, i) => {
    content.push({ type: 'text', text: `--- Photo ${i + 1} of ${images.length} — ${img.label} ---` })
    content.push({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } })
  })
  content.push({ type: 'text', text: prompt })

  const response = await anthropic.messages.create({
    model,
    max_tokens: MAX_TOKENS,
    messages: [{ role: 'user', content }],
  })

  const text = response.content.map((c: any) => c.text || '').join('')
  const clean = text.replace(/```json|```/g, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    const lastComplete = clean.lastIndexOf('},')
    if (lastComplete > 0) {
      try {
        const result = JSON.parse(clean.slice(0, lastComplete + 1) + ']}')
        result._truncated = true
        return result
      } catch { return null }
    }
    return null
  }
}

export async function POST(req: NextRequest) {
  try {
    const { images, truckInfo, inspectionType, inspector, notes, baselineDamages, vehicleType, fleetType } = await req.json()

    const hasBaseline = baselineDamages && baselineDamages.length > 0
    const isRental = fleetType === 'rental'
    const baselineText = hasBaseline
      ? `\n\nLAST INSPECTION DAMAGE RECORD (compare against these — do NOT flag as new unless clearly different location/type):\n${baselineDamages.map((d: any) => `- [${d.severity}] ${d.location}: ${d.description}`).join('\n')}`
      : ''

    const vehicleContext = vehicleType === 'stepvan'
      ? 'Step Van / Walk-in Van (Utilimaster, Alvan, Grumman, Ford P-series)'
      : vehicleType === 'boxtruck' ? 'Box Truck / Straight Truck'
      : 'Sprinter / Cargo Van (Ford Transit, Mercedes Sprinter, Ram ProMaster)'

    // Resolve all inputs (base64 or storage paths) to base64 in parallel.
    const allResolved = (await Promise.all((images || []).map(resolveImage))).filter(Boolean) as ImgResolved[]
    if (allResolved.length === 0) {
      return NextResponse.json({ error: 'No usable images were provided.' }, { status: 400 })
    }

    // First 8 = exterior, remainder = interior (matches existing convention).
    const exteriorImages = allResolved.slice(0, 8)
    const interiorImages = allResolved.slice(8)

    // CHANGED: exterior is now ONE consolidated call with every exterior photo,
    // instead of two arbitrary halves each told to inspect the whole truck.
    // That arbitrary split was the main source of cold-pass guessing.
    const exteriorModel = hasBaseline ? MODELS.comparison : MODELS.baseline
    const exteriorPrompt = buildPrompt(
      truckInfo, vehicleContext, vehicleType || '', inspectionType, inspector, notes,
      baselineText, hasBaseline, isRental, 'exterior',
    )

    const calls: Promise<any>[] = [analyzePhotos(exteriorImages, exteriorPrompt, exteriorModel)]
    if (interiorImages.length > 0) {
      const interiorPrompt = buildPrompt(
        truckInfo, vehicleContext, vehicleType || '', inspectionType, inspector, notes,
        baselineText, hasBaseline, isRental, 'interior',
      )
      calls.push(analyzePhotos(interiorImages, interiorPrompt, MODELS.interior))
    }

    const [exteriorResult, interiorResult] = await Promise.all(calls)
    if (!exteriorResult) {
      return NextResponse.json({ error: 'Analysis failed — no results returned. Please try again.' }, { status: 500 })
    }

    const rawDamages = deduplicateDamages(
      exteriorResult?.damages || [],
      interiorResult?.damages || [],
    )
    const allDamages = enforceComparisonRules(rawDamages, hasBaseline)
    allDamages.sort((a, b) => {
      const s: Record<string, number> = { critical: 0, moderate: 1, minor: 2 }
      const diff = (s[a.severity] ?? 2) - (s[b.severity] ?? 2)
      return diff !== 0 ? diff : (b.confidence || 0) - (a.confidence || 0)
    })

    const lowConf = allDamages.filter(d => (d.confidence || 100) < 70).length
    const needsVerif = allDamages.filter(d => d.needsVerification).length
    const newDamageCount = allDamages.filter(d => d.is_new).length

    // Condition/urgency: take the worse of exterior and interior (interior
    // rarely drives it, but don't let it silently downgrade a bad exterior).
    const condOrder = ['Critical', 'Poor', 'Fair', 'Good']
    const urgOrder = ['Immediate', 'Within 1 week', 'Within 1 month', 'Monitoring only']
    const worstCond = (a?: string, b?: string) => {
      const ia = condOrder.indexOf(a || 'Good'); const ib = condOrder.indexOf(b || 'Good')
      return condOrder[Math.min(ia < 0 ? 3 : ia, ib < 0 ? 3 : ib)]
    }
    const worstUrg = (a?: string, b?: string) => {
      const ia = urgOrder.indexOf(a || 'Monitoring only'); const ib = urgOrder.indexOf(b || 'Monitoring only')
      return urgOrder[Math.min(ia < 0 ? 3 : ia, ib < 0 ? 3 : ib)]
    }

    const mergedCond = interiorResult
      ? worstCond(exteriorResult?.overallCondition, interiorResult?.overallCondition)
      : (exteriorResult?.overallCondition || 'Good')
    const mergedUrg = interiorResult
      ? worstUrg(exteriorResult?.estimatedRepairUrgency, interiorResult?.estimatedRepairUrgency)
      : (exteriorResult?.estimatedRepairUrgency || 'Monitoring only')

    return NextResponse.json({
      overallCondition: hasBaseline && newDamageCount === 0 ? 'Good' : mergedCond,
      summary: exteriorResult?.summary || interiorResult?.summary || '',
      totalEstimatedRepairCost: {
        low: allDamages.filter(d => d.is_new).reduce((s, d) => s + (d.repairEstimate?.low || 0), 0),
        high: allDamages.filter(d => d.is_new).reduce((s, d) => s + (d.repairEstimate?.high || 0), 0),
      },
      damages: allDamages,
      followUpRequired: exteriorResult?.followUpRequired || interiorResult?.followUpRequired || lowConf > 0 || needsVerif > 0 || newDamageCount > 0,
      estimatedRepairUrgency: hasBaseline && newDamageCount === 0 ? 'Monitoring only' : mergedUrg,
      lowConfidenceFindings: lowConf,
      needsVerificationFindings: needsVerif,
      newDamageCount,
      comparisonMode: hasBaseline,
      _truncated: exteriorResult?._truncated || interiorResult?._truncated,
    })
  } catch (err: any) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
