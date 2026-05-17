import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// ── Vehicle weak points ───────────────────────────────────────────
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
BODY MANUFACTURERS (for parts identification):
- Morgan Olson walk-in vans: morganolsonparts.com for OEM parts
- Utilimaster/Alvan bodies: fleetpartsonline.com
- Morgan Corp box/dry freight bodies: morganparts.com
- DO NOT FLAG: door pull straps/chains/holders/vent latches = standard. Tan/beige grille surround = factory. Rotor/drum rust = normal wear.`,

  boxtruck: `Box Truck: rear bumper dock strikes, lower panel rust/scrapes, roof front edge, dual rear tire outer sidewalls, cargo door seals, underride guard, frame rails.`,
}

// ── Orientation ───────────────────────────────────────────────────
const ORIENTATION = `USA: driver=LEFT. Front photo: driver=YOUR LEFT. Rear photo: driver=YOUR RIGHT. Always say "driver side" or "passenger side", never left/right alone.`

// ── Damage knowledge ──────────────────────────────────────────────
const DAMAGE_KNOWLEDGE = `FLEET-TRAINED RULES:

PAINT SEVERITY: scuff(paint intact)=minor → clearcoat scratch=minor-mod → bare metal=moderate+RUST RISK → bubbling rust=moderate urgent → active rust=critical. Transit bare gray bumper=moderate not scuff.

RUST: rotor/drum rust=NORMAL WEAR. Surface corrosion=minor. Bubbling/flaking=moderate escalate. Seam rust=water intrusion risk.

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

// ── Prompt builder ────────────────────────────────────────────────
function buildPrompt(
  truckInfo: string,
  vehicleContext: string,
  vehicleType: string,
  inspectionType: string,
  inspector: string,
  notes: string,
  baselineText: string,
  hasBaseline: boolean,
  isRental: boolean,
  photoGroup: 'exterior' | 'interior'
): string {
  const weakPoints = WEAK_POINTS[vehicleType] || ''

  const exteriorChecklist = `REPORT DAMAGE ONLY. Skip undamaged areas.

FRONT: Lower fascia (grille-to-bumper gap), bumper alignment+condition+end caps, cab cheeks, A-pillar junctions, lights/lenses, roof marker lights (Transits), panel above windshield.
ROOF: Front edge seam corners, full-length side seams, rear top seam flashing, surface dents, clearance lights.
SIDES: Upper panels, lower 18" full length (tonal scan), sub-12" zone, step rail (Transits), above-tire zones (step vans), mirrors (glass + housing).
REAR: Upper corners both sides, rear seam flashing, door vertical edges, door hardware, bumper, step platform, all reflectors.
DECALS: Tears, peeling, damage beneath graphics.`

  const interiorChecklist = `REPORT DAMAGE ONLY.
Dash: warning lights (list each), cracked dash.
Cargo: threshold plate, tie-down tracks, floor damage, wall/ceiling dents or holes (ignore light scuffing).`

  const rentalNote = isRental ? `\nRENTAL: Heightened sensitivity — document even minor items, do not round down severity.` : ''

  const baselineInstructions = hasBaseline
    ? `FOLLOW-UP: is_new:true ONLY for damage NOT in baseline below. Flag worsening existing damage.`
    : `BASELINE: Legal record — document ALL damage. When in doubt, include it.`

  return `Expert FedEx fleet damage inspector, Bryke Logistics Fort Lauderdale FL. Legal/DOT documentation.

VEHICLE: ${truckInfo} | TYPE: ${vehicleContext} | INSPECTION: ${inspectionType} | INSPECTOR: ${inspector}
NOTES: ${notes || 'None'}${baselineText}${rentalNote}

${ORIENTATION}

${baselineInstructions}

${weakPoints ? `VEHICLE WEAK POINTS:\n${weakPoints}\n` : ''}${DAMAGE_KNOWLEDGE}

${photoGroup === 'interior' ? interiorChecklist : exteriorChecklist}

SEVERITY: critical=structural/safety/DOT fail/frame/missing fascia. moderate=fist-size+ dent/bare metal/cracked lens/missing trim/rust bubbling/bumper misalignment/seam separation. minor=scuff/small ding/chip/light curb rash.
CONFIDENCE: rate 0-100. Under 70: needsVerification:true + verificationNote.
REPAIR: DIY=mirrors/lights/trim/bumper covers/steps/hubcaps/reflectors/handles. Shop=frame/major panels/roof/windshield/structural/seams.

JSON only, no markdown:
{"overallCondition":"Good|Fair|Poor|Critical","summary":"2-3 sentences","totalEstimatedRepairCost":{"low":0,"high":0},"damages":[{"severity":"critical|moderate|minor","location":"driver/passenger side + zone","description":"size, paint status, full extent","recommendation":"specific action","is_new":false,"confidence":85,"needsVerification":false,"verificationNote":"","repairEstimate":{"low":0,"high":0,"method":"DIY or Shop"},"diyReplaceable":false,"partName":"","partSearchQuery":""}],"followUpRequired":false,"estimatedRepairUrgency":"Immediate|Within 1 week|Within 1 month|Monitoring only"}`
}

// ── Deduplication ─────────────────────────────────────────────────
function deduplicateDamages(damages1: any[], damages2: any[]): any[] {
  const all = [...damages1, ...damages2]
  const deduped: any[] = []
  for (const d of all) {
    const dLoc = (d.location || '').toLowerCase()
    const dDesc = (d.description || '').toLowerCase()
    const dLocWords = dLoc.split(/\s+/).filter((w: string) => w.length > 3)
    const dupIdx = deduped.findIndex(existing => {
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

// ── AI call ───────────────────────────────────────────────────────
async function analyzePhotos(images: any[], prompt: string): Promise<any> {
  const content: any[] = images.map(img => ({
    type: 'image',
    source: { type: 'base64', media_type: img.media_type || 'image/jpeg', data: img.data },
  }))
  content.push({ type: 'text', text: prompt })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 3000,
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

// ── Main handler ──────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const { images, truckInfo, inspectionType, inspector, notes, baselineDamages, vehicleType, fleetType } = await req.json()

    const hasBaseline = baselineDamages && baselineDamages.length > 0
    const isRental = fleetType === 'rental'
    const baselineText = hasBaseline
      ? `\n\nBASELINE (do NOT flag as new):\n${baselineDamages.map((d: any) => `- [${d.severity}] ${d.location}: ${d.description}`).join('\n')}`
      : ''

    const vehicleContext = vehicleType === 'stepvan'
      ? 'Step Van / Walk-in Van (Utilimaster, Alvan, Grumman, Ford P-series)'
      : vehicleType === 'boxtruck' ? 'Box Truck / Straight Truck'
      : 'Sprinter / Cargo Van (Ford Transit, Mercedes Sprinter, Ram ProMaster)'

    const allImages = images || []
    const exteriorImages = allImages.filter((_: any, i: number) => i < 8)
    const interiorImages = allImages.filter((_: any, i: number) => i >= 8)
    const mid = Math.ceil(exteriorImages.length / 2)

    const pArgs: [string, string, string, string, string, string, string, boolean, boolean, 'exterior'] =
      [truckInfo, vehicleContext, vehicleType || '', inspectionType, inspector, notes, baselineText, hasBaseline, isRental, 'exterior']

    const promises: Promise<any>[] = [
      analyzePhotos(exteriorImages.slice(0, mid), buildPrompt(...pArgs)),
      analyzePhotos(exteriorImages.slice(mid), buildPrompt(...pArgs)),
    ]
    if (interiorImages.length > 0) {
      promises.push(analyzePhotos(interiorImages,
        buildPrompt(truckInfo, vehicleContext, vehicleType || '', inspectionType, inspector, notes, baselineText, hasBaseline, isRental, 'interior')
      ))
    }

    const [r1, r2, r3] = await Promise.all(promises)
    if (!r1 && !r2) return NextResponse.json({ error: 'Analysis failed — no results returned. Please try again.' }, { status: 500 })

    const allDamages = deduplicateDamages(deduplicateDamages(r1?.damages || [], r2?.damages || []), r3?.damages || [])
    allDamages.sort((a, b) => {
      const s: Record<string, number> = { critical: 0, moderate: 1, minor: 2 }
      const diff = (s[a.severity] ?? 2) - (s[b.severity] ?? 2)
      return diff !== 0 ? diff : (b.confidence || 0) - (a.confidence || 0)
    })

    const lowConf = allDamages.filter(d => (d.confidence || 100) < 70).length
    const needsVerif = allDamages.filter(d => d.needsVerification).length
    const condOrder = ['Critical', 'Poor', 'Fair', 'Good']
    const urgOrder = ['Immediate', 'Within 1 week', 'Within 1 month', 'Monitoring only']

    const c1 = r1?.overallCondition || 'Good'
    const c2 = r2?.overallCondition || 'Good'
    const u1 = r1?.estimatedRepairUrgency || 'Monitoring only'
    const u2 = r2?.estimatedRepairUrgency || 'Monitoring only'

    return NextResponse.json({
      overallCondition: condOrder[Math.min(condOrder.indexOf(c1), condOrder.indexOf(c2))] || c1,
      summary: r1?.summary || r2?.summary || '',
      totalEstimatedRepairCost: {
        low: allDamages.reduce((s, d) => s + (d.repairEstimate?.low || 0), 0),
        high: allDamages.reduce((s, d) => s + (d.repairEstimate?.high || 0), 0),
      },
      damages: allDamages,
      followUpRequired: r1?.followUpRequired || r2?.followUpRequired || lowConf > 0 || needsVerif > 0,
      estimatedRepairUrgency: urgOrder[Math.min(urgOrder.indexOf(u1), urgOrder.indexOf(u2))] || u1,
      lowConfidenceFindings: lowConf,
      needsVerificationFindings: needsVerif,
      _truncated: r1?._truncated || r2?._truncated,
    })
  } catch (err: any) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
