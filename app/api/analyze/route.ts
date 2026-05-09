import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// ─────────────────────────────────────────────────────────────────────────────
// VEHICLE-SPECIFIC WEAK POINTS
// Updated from 25 annotated training photos across 4 vehicles (2 step vans,
// 1 Ford Transit), Bryke Logistics fleet, Fort Lauderdale FL.
// ─────────────────────────────────────────────────────────────────────────────
const WEAK_POINTS: Record<string, string> = {

  sprinter: `Ford Transit / Mercedes Sprinter / Ram ProMaster known weak points:

FRONT END:
- Front bumper fascia: dark gray/charcoal on Transit is FACTORY COLOR — not damage
- Front bumper lower: scrapes from curbs, misalignment from prior impact
- Cab "cheek" panels: lower front corners BETWEEN headlight housing and front wheel arch — crease or dent here = curb/parking strike, commonly missed because it's a curved transition zone
- Roof marker lights (Ford Transit): THREE amber lights across top of windshield — check ALL THREE for cracked or missing lenses, this is a DOT compliance issue and a known failure point
- Mirror housing: cracks, missing glass, broken or missing housing

ROOF (Ford Transit):
- Roof panels are ALUMINUM — dents appear as subtle surface ripples or irregular reflections, not sharp creases
- Scan full roof surface for ANY irregular light reflection pattern indicating dents
- Roof-to-side-wall drip rail seam: inspect FULL LENGTH on both sides for separation, lifting, or gaps — a thin shadow line or color change along the roof edge = seam damage, water intrusion risk in Florida
- Rear roof clearance lights (Ford Transit): check rear roof-mounted lights for cracked or missing lenses

SIDES:
- Sliding door track (Transit/Sprinter): deformation, damage from curbs
- Body side step rail / rocker protection strip (Ford Transit): chrome/silver trim running between front and rear wheel arches — check for bends, scrapes, missing sections — commonly missed as it blends with shadow line at bottom of body

REAR:
- Rear bumper cover (Ford Transit): WHITE PAINTED PLASTIC — any bare gray/silver plastic visible = paint through to substrate, flag as moderate (not a scuff)
- Rear bumper corners: check both corners for separation/gap from body — separated corner = bumper no longer properly mounted, safety issue
- Rear door hinges: wear, misalignment, separation`,

  stepvan: `Step Van (Utilimaster, Alvan, Grumman, Ford P-series P700/P1000) known weak points:

FRONT END:
- Lower front fascia panel (CRITICAL ZONE): the panel between the BOTTOM of the grille bars and the TOP of the bumper — on older step vans this panel is frequently missing, collapsed, or severely damaged, exposing the radiator support and mechanical components. DO NOT assume this is a normal open grille. If mechanical components are visible below the grille, flag as missing/damaged lower front fascia, moderate-to-critical.
- Front bumper end caps (both corners): rubber/plastic end caps at driver and passenger corners of bumper — check for missing, cracked, or deformed caps
- Bumper alignment: assess whole bumper unit — if it sits unevenly or is canted, prior impact suspected even without denting
- Cab "cheek" panels: lower front corners between headlight housing and front wheel arch — crease = curb/parking strike
- A-pillar to cab panel junction: check both sides for impact dents at the junction where A-pillar meets the front cab panel just below windshield — absorbs sideswipe impacts, hard to see on curved surface
- Front panel above windshield: paint loss, chips, impact damage

ROOF:
- Roof front edge seam (BOTH corners): where roof meets front wall — known corrosion and impact point, check BOTH driver and passenger front corners
- Mid-roof longitudinal seam: scan the roof-to-side-wall seam along the FULL LENGTH on both sides — not just corners — deformation or separation along this seam = low-clearance contact
- Roof-to-rear-wall seam flashing (CRITICAL): inspect the metal flashing strip across the FULL WIDTH of the top rear edge — lifting, separation, or rust staining here = water intrusion, urgent in Florida humidity. This looks like a thin dark line or shadow — do NOT dismiss as normal seam.
- Clearance lights: cracked, missing, or non-functional

SIDES:
- Area above front tires (both sides): high contact zone, inspect carefully
- Lower body side panels: dock contact scrapes — describe FULL length with start and end points. White-on-white scrapes are low contrast — scan for tonal variation and sheen differences along the full lower body length
- Lower body damage under 12 inches from ground: may not be resolvable from a full-side photo — flag for physical close-up verification if ANY tonal variation is visible at the lower body edge

REAR:
- Upper rear corners (BOTH sides): dock impact dents are common — document both corners. If one corner is dented, CHECK THE OPPOSITE CORNER too.
- Rear cargo door vertical edges: inspect both vertical door edges for bending or deformation along their full length — bent door edge affects weatherseal and latching
- Rear cargo door hardware (handle/latch): check for bent, scraped, or damaged exterior hardware
- Rear cargo door lower corners: rust, damage, seal condition
- Rear bumper: dock strikes, deformation
- Rear step platform: check for bending or deformation at corners
- Rear cargo door center seam: NORMAL construction — do NOT flag unless dramatically misaligned

DO NOT FLAG (standard equipment):
- Door pull straps, door chains, door holders, vent window latches = STANDARD EQUIPMENT
- Utilimaster/Alvan tan/beige grille surround = FACTORY COLOR, not paint damage
- Wheel rust/oxidation on brake drums/rotors = NORMAL WEAR`,

  boxtruck: `Box Truck / Straight Truck known weak points:
- Rear bumper: dock strikes, deformation, underride guard damage
- Cargo box lower panels: rust, scrapes from dock contact
- Roof front edge: low-clearance damage
- Dual rear tires: outer sidewall damage, curb rash on outer rims
- Cargo door seals: cracked, torn, missing
- Frame rails and cross members: check undercarriage for damage`,
}

// ─────────────────────────────────────────────────────────────────────────────
// USA ORIENTATION
// ─────────────────────────────────────────────────────────────────────────────
const ORIENTATION = `USA VEHICLE ORIENTATION (driver=LEFT side of vehicle):
- Front photo: driver side = YOUR LEFT, passenger side = YOUR RIGHT
- Rear photo: driver side = YOUR RIGHT, passenger side = YOUR LEFT
- Driver side photo: LEFT side of vehicle as viewed from outside
- Passenger side photo: RIGHT side of vehicle as viewed from outside
- Front-left corner = DRIVER SIDE front. Front-right corner = PASSENGER SIDE front.
- Rear-left corner = DRIVER SIDE rear. Rear-right corner = PASSENGER SIDE rear.
ALWAYS use "driver side" or "passenger side" — NEVER "left" or "right" alone.`

// ─────────────────────────────────────────────────────────────────────────────
// CORE DAMAGE KNOWLEDGE
// Derived from 25 annotated training photos, Bryke Logistics fleet.
// ─────────────────────────────────────────────────────────────────────────────
const DAMAGE_KNOWLEDGE = `DAMAGE ASSESSMENT KNOWLEDGE — BRYKE LOGISTICS FLEET TRAINED RULES:

━━━ PAINT / SURFACE SEVERITY ━━━
1. Surface scuff — paint intact → minor
2. Scratch through clearcoat, primer intact → minor-to-moderate
3. Paint scraped to bare metal → moderate — always flag RUST RISK (Florida humidity)
4. Deep scratch/gouge through primer → moderate-to-critical by size
5. Bubbling or flaking paint over rust → moderate minimum, urgency "Within 1 week"
6. Active rust through body panels → critical
On Ford Transit: bare GRAY/SILVER plastic showing on white bumper = paint-through damage, NOT a scuff → moderate

━━━ RUST / CORROSION ━━━
- Wheel rust on rotors/drums = NORMAL WEAR — do NOT flag
- Surface corrosion, no bubbling = minor wear item
- Bubbling/flaking paint over rust = moderate, urgency escalate
- Rust staining at seam joints (especially rear roof seam) = water intrusion risk → moderate-to-critical

━━━ HIGH-MISS-RISK DAMAGE PATTERNS (from fleet training) ━━━

1. MISSING LOWER FRONT FASCIA (step vans)
   If mechanical components (radiator, frame cross-member, tow hook hardware) are visible BELOW the grille bars and ABOVE the bumper, the lower front fascia panel is missing or collapsed. This is NOT a normal open-grille appearance. Flag as: "Lower front fascia missing/collapsed — radiator support exposed." Severity: moderate-to-critical.

2. LONG LOWER BODY PANEL SCRAPES
   White step van panels show dock contact scrapes as subtle tonal variations — slightly different sheen or gray tone along the lower 18 inches of the cargo body. Scan the FULL LENGTH of both sides. Report as one continuous finding with start and end points. Do NOT skip because the van is white.

3. REAR ROOF SEAM FLASHING FAILURE (step vans)
   The metal flashing strip along the TOP REAR EDGE of the cargo body (full width) can separate, lift, or rust. It appears as a thin dark line, lifted edge, or rust-brown staining along the top rear. This is NOT a normal shadow line. Flag as: "Rear roof seam flashing — separation/rust across [width]." Severity: moderate-to-critical. Water intrusion urgency in Florida.

4. UPPER REAR CORNER DENTS (step vans)
   Dock impact dents at the upper rear corners of the cargo body appear as circular depressions 4–8 inches across. They can look like shadows from a distance. If one corner is dented, CHECK THE OPPOSITE CORNER — dock impacts frequently affect both sides. Flag each separately.

5. SUB-12-INCH LOWER BODY DAMAGE
   Damage on the bottom 12 inches of the body may not be resolvable from a full-side photo. If ANY tonal variation or shadow irregularity is visible along the lower body edge, flag it and note: "Requires physical close-up verification — damage may be present at lower body edge."

6. CAB CHEEK PANEL CREASE
   The panel between the headlight housing and the front wheel arch (lower front corner on both sides) absorbs curb and parking strikes. A subtle inward crease here is easy to miss on curved white panels. Check both sides on every front-facing photo.

7. TRANSIT DRIP RAIL / ROOF SEAM SEPARATION
   On Ford Transit vans, inspect the full-length roof-to-side-wall seam (drip rail) on both sides. Separation looks like a thin lifted edge or color discontinuity along the roof line. Flag as: "Roof drip rail seam — separation/lifting, [driver/passenger] side, [extent]." Moderate-to-critical.

8. REAR CARGO DOOR VERTICAL EDGE DEFORMATION (step vans)
   The vertical edges of rear cargo doors can be bent or scraped along their length from backing into objects. This is distinct from a panel scrape — the door edge itself is deformed, affecting seal and latch. Flag each door edge separately.

9. A-PILLAR / CAB CORNER IMPACT DENT
   At the junction of the A-pillar and front cab panel just below the windshield line — impact dents here absorb sideswipe damage and are hard to see on curved panels. Check both sides. Flag as: "A-pillar/cab corner dent, [side], approx [size], possible prior sideswipe."

10. TRANSIT BODY SIDE STEP RAIL DAMAGE
    Ford Transit vans have a chrome/silver step protection rail running between the wheel arches along the lower body. Scrapes, bends, or missing sections blend with the body shadow line. Check both sides on every side-view photo.

━━━ CONTINUOUS DAMAGE ZONES ━━━
- One scrape/scratch running over a continuous area = ONE finding with start and end points
- Do NOT fragment a continuous damage zone into multiple findings

━━━ BUMPER RULES ━━━
- Assess bumper as a WHOLE UNIT — crooked/canted = prior impact even without denting
- Check bumper END CAPS on step vans (both corners) — commonly missing or cracked
- Check bumper CORNER SEPARATION on Transits — gap between corner and body = not mounted correctly

━━━ PANEL GAPS ━━━
- Any gap where panels should sit flush = flag for verification
- Hood/windshield/cab junctions especially important

━━━ REFLECTORS / DOT ━━━
- All reflectors must be present and intact — partial/cracked = DOT compliance issue, moderate
- Ford Transit: 3 front roof marker lights + rear roof lights — ALL must be checked, cracked/missing lens = DOT issue

━━━ DAMAGE BENEATH DECALS ━━━
- Actively scan for scratches or impacts visible through/beneath graphic areas

━━━ INDEPENDENT PHOTO ASSESSMENT ━━━
- Each photo assessed independently — never pattern-match between trucks
- Headlight oxidation: flag ONLY if clearly visible in THIS photo
- Uncertain deformation on curved surfaces: flag as "possible — verify with close-up"

━━━ ROOF SEAM CHECKLIST (run on every inspection) ━━━
Check all four roof corner seam joints:
1. Front driver corner
2. Front passenger corner
3. Rear driver corner
4. Rear passenger corner
Plus: full-length side seams (both sides) and full-width rear top seam`

// ─────────────────────────────────────────────────────────────────────────────
// PROMPT BUILDER
// ─────────────────────────────────────────────────────────────────────────────
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

  const exteriorChecklist = `EXTERIOR INSPECTION CHECKLIST — REPORT DAMAGE ONLY. Do not comment on undamaged areas.

FRONT END:
- Lower front fascia (BETWEEN grille bottom and bumper top): missing or collapsed? Mechanical components exposed?
- Bumper: alignment as whole unit (crooked = prior impact), surface condition, end caps (step vans), corner separation (Transits)
- Cab cheek panels (both sides, between headlight and wheel arch): crease or dent?
- A-pillar to cab panel junction (both sides, below windshield): impact dent?
- Headlights/taillights: cracks, broken lenses, moisture — flag oxidation ONLY if clearly visible
- Roof marker lights (Transits): all three front lights — cracked or missing lens?
- Front panel above windshield: paint loss, chips, damage

ROOF:
- Front edge seam (both corners): corrosion, damage, separation
- Full-length side seams (both sides): separation, lifting, damage along entire length
- Rear top seam flashing (full width): separation, lifting, rust staining
- Roof surface: dents, depressions, low-clearance damage (Transits: look for subtle ripples)
- Clearance/marker lights: cracked, missing

SIDES (scan full length of both sides):
- Upper body panels: dents, scrapes, impact damage
- Lower body panels (full length): dock contact scrapes — scan for tonal variation along ENTIRE lower 18 inches
- Sub-12-inch zone: flag any tonal irregularity for physical verification
- Step rail/rocker trim (Transits): damage along full length
- Area above front tires (both sides, step vans): scrapes, dents
- Mirrors: glass condition AND housing condition separately

REAR:
- Upper rear corners (BOTH sides): dents — if one is dented, check the other
- Rear roof seam flashing: lifting, separation, rust
- Rear cargo door vertical edges (step vans): bending or deformation full length
- Rear cargo door hardware: handle, latch, hinges
- Rear bumper: dock strikes, deformation, paint condition
- Rear step platform corners: deformation, bending
- Reflectors: all present, intact, no cracks

BRANDING / DECALS:
- Tears, peeling, missing sections
- Damage visible through or beneath graphic areas`

  const interiorChecklist = `INTERIOR/CARGO INSPECTION — REPORT DAMAGE ONLY.

DASHBOARD:
- Warning lights illuminated (list each)
- Cracked dash, damaged controls

CARGO AREA:
- Floor step/threshold plate: bent, broken, loose, missing
- Tie-down tracks: damage, missing anchors
- Cargo floor: punctures, major damage (ignore light scuffing)
- Walls/ceiling: dents, holes, tears (ignore light scuffing)`

  const checklist = photoGroup === 'interior' ? interiorChecklist : exteriorChecklist

  const rentalNote = isRental
    ? `\nRENTAL — HEIGHTENED SENSITIVITY: Every finding is legal/financial evidence. Document even minor scuffs and chips. Do not round down severity.`
    : ''

  const baselineInstructions = hasBaseline
    ? `FOLLOW-UP INSPECTION — COMPARISON MODE:
- Mark is_new: true ONLY for damage NOT in the baseline list below
- Flag any existing damage that has worsened (larger, deeper, new rust, etc.)
- Do NOT re-flag baseline damage as new`
    : `BASELINE INSPECTION — INITIAL DOCUMENTATION MODE:
This is the legal baseline for all future comparisons. Document ALL damage including minor items. When in doubt, include it.`

  return `You are an expert commercial fleet damage inspector for FedEx delivery vehicles operated by Bryke Logistics, Fort Lauderdale FL. Findings are used for driver accountability, DOT compliance, and legal documentation.

VEHICLE: ${truckInfo}
VEHICLE TYPE: ${vehicleContext}
INSPECTION TYPE: ${inspectionType}
INSPECTOR: ${inspector}
NOTES: ${notes || 'None'}${baselineText}
${rentalNote}

${ORIENTATION}

${baselineInstructions}

${weakPoints ? `VEHICLE-SPECIFIC KNOWN WEAK POINTS:\n${weakPoints}\n` : ''}

${DAMAGE_KNOWLEDGE}

${checklist}

SEVERITY:
- critical: structural damage, safety hazard, DOT failure, major collision, frame damage, missing fascia exposing mechanical components
- moderate: fist-size+ dent, paint to bare metal, cracked lens, missing trim, mirror damage, bumping/flaking rust, DOT reflector issue, bumper misalignment, seam separation, bumper corner separation
- minor: surface scuff (paint intact), door ding under fist-size, paint chip, light curb rash, surface corrosion without bubbling

CONFIDENCE:
- Rate 0–100 per finding
- Under 70: add needsVerification: true and verificationNote explaining why

REPAIR ESTIMATES (USD, commercial vehicle rates):
- DIY: mirrors, lights, trim, moldings, bumper covers, steps, hubcaps, reflectors, door handles, step rails
- Shop: frame, major panels, roof, windshield, structural, seam repair

Respond ONLY in valid JSON, no markdown, no code fences:
{
  "overallCondition": "Good|Fair|Poor|Critical",
  "summary": "2–3 sentence professional summary",
  "totalEstimatedRepairCost": { "low": 0, "high": 0 },
  "damages": [
    {
      "severity": "critical|moderate|minor",
      "location": "precise location using driver/passenger side + zone",
      "description": "detailed description with size, paint status, full extent of damage zone",
      "recommendation": "specific repair action",
      "is_new": false,
      "confidence": 85,
      "needsVerification": false,
      "verificationNote": "",
      "repairEstimate": { "low": 0, "high": 0, "method": "DIY or Shop" },
      "diyReplaceable": false,
      "partName": "",
      "partSearchQuery": ""
    }
  ],
  "followUpRequired": false,
  "estimatedRepairUrgency": "Immediate|Within 1 week|Within 1 month|Monitoring only"
}`
}

// ─────────────────────────────────────────────────────────────────────────────
// DEDUPLICATION
// ─────────────────────────────────────────────────────────────────────────────
function deduplicateDamages(damages1: any[], damages2: any[]): any[] {
  const all = [...damages1, ...damages2]
  const deduped: any[] = []

  for (const d of all) {
    const dLoc = (d.location || '').toLowerCase()
    const dDesc = (d.description || '').toLowerCase()
    const dLocWords = dLoc.split(/\s+/).filter((w: string) => w.length > 3)

    const duplicateIdx = deduped.findIndex(existing => {
      const eLoc = (existing.location || '').toLowerCase()
      const eDesc = (existing.description || '').toLowerCase()
      const locWordMatches = dLocWords.filter((w: string) => eLoc.includes(w)).length
      if (locWordMatches < 2) return false
      const dDescWords = dDesc.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 4)
      const descOverlap = dDescWords.filter((w: string) => eDesc.includes(w)).length
      return descOverlap >= 2
    })

    if (duplicateIdx === -1) {
      deduped.push(d)
    } else {
      if ((d.confidence || 0) > (deduped[duplicateIdx].confidence || 0)) {
        deduped[duplicateIdx] = d
      }
    }
  }

  return deduped
}

// ─────────────────────────────────────────────────────────────────────────────
// AI ANALYSIS CALL
// ─────────────────────────────────────────────────────────────────────────────
async function analyzePhotos(images: any[], prompt: string): Promise<any> {
  const content: any[] = []
  for (const img of images) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.media_type || 'image/jpeg', data: img.data },
    })
  }
  content.push({ type: 'text', text: prompt })

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-6',
    max_tokens: 4000,
    messages: [{ role: 'user', content }],
  })

  const text = response.content.map((c: any) => c.text || '').join('')
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    let fixed = clean
    const lastComplete = fixed.lastIndexOf('},')
    if (lastComplete > 0) {
      fixed = fixed.slice(0, lastComplete + 1) + ']}'
    }
    try {
      const result = JSON.parse(fixed)
      result._truncated = true
      return result
    } catch {
      return null
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// MAIN HANDLER
// ─────────────────────────────────────────────────────────────────────────────
export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const {
      images,
      truckInfo,
      inspectionType,
      inspector,
      notes,
      baselineDamages,
      vehicleType,
      fleetType,
    } = body

    const hasBaseline = baselineDamages && baselineDamages.length > 0
    const isRental = fleetType === 'rental'

    const baselineText = hasBaseline
      ? `\n\nBASELINE DAMAGE ON RECORD — do NOT flag these as new:\n${baselineDamages
          .map((d: any) => `- [${d.severity}] ${d.location}: ${d.description}`)
          .join('\n')}`
      : ''

    const vehicleContext =
      vehicleType === 'stepvan'
        ? 'Step Van / Walk-in Van (Utilimaster, Alvan, Grumman, Ford P-series P700/P1000)'
        : vehicleType === 'boxtruck'
        ? 'Box Truck / Straight Truck'
        : 'Sprinter / Cargo Van (Ford Transit, Mercedes Sprinter, Ram ProMaster)'

    const allImages = images || []
    const exteriorImages = allImages.filter((_: any, i: number) => i < 8)
    const interiorImages = allImages.filter((_: any, i: number) => i >= 8)

    const mid = Math.ceil(exteriorImages.length / 2)
    const group1 = exteriorImages.slice(0, mid)
    const group2 = exteriorImages.slice(mid)

    const promptArgs: [string, string, string, string, string, string, string, boolean, boolean, 'exterior'] = [
      truckInfo, vehicleContext, vehicleType || '', inspectionType,
      inspector, notes, baselineText, hasBaseline, isRental, 'exterior',
    ]
    const prompt1 = buildPrompt(...promptArgs)
    const prompt2 = buildPrompt(...promptArgs)
    const prompt3 = interiorImages.length > 0
      ? buildPrompt(truckInfo, vehicleContext, vehicleType || '', inspectionType,
          inspector, notes, baselineText, hasBaseline, isRental, 'interior')
      : null

    const analysisPromises: Promise<any>[] = [
      analyzePhotos(group1, prompt1),
      analyzePhotos(group2, prompt2),
    ]
    if (prompt3 && interiorImages.length > 0) {
      analysisPromises.push(analyzePhotos(interiorImages, prompt3))
    }

    const results = await Promise.all(analysisPromises)
    const [result1, result2, result3] = results

    if (!result1 && !result2) {
      return NextResponse.json(
        { error: 'Analysis failed — no results returned. Please try again.' },
        { status: 500 }
      )
    }

    const allDamages = deduplicateDamages(
      deduplicateDamages(result1?.damages || [], result2?.damages || []),
      result3?.damages || []
    )

    allDamages.sort((a, b) => {
      const sevOrder: Record<string, number> = { critical: 0, moderate: 1, minor: 2 }
      const sevDiff = (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2)
      if (sevDiff !== 0) return sevDiff
      return (b.confidence || 0) - (a.confidence || 0)
    })

    const lowConfidenceCount = allDamages.filter(d => (d.confidence || 100) < 70).length
    const needsVerificationCount = allDamages.filter(d => d.needsVerification).length
    const totalLow = allDamages.reduce((sum, d) => sum + (d.repairEstimate?.low || 0), 0)
    const totalHigh = allDamages.reduce((sum, d) => sum + (d.repairEstimate?.high || 0), 0)

    const conditionOrder = ['Critical', 'Poor', 'Fair', 'Good']
    const condition1 = result1?.overallCondition || 'Good'
    const condition2 = result2?.overallCondition || 'Good'
    const overallCondition = conditionOrder[Math.min(
      conditionOrder.indexOf(condition1),
      conditionOrder.indexOf(condition2)
    )] || condition1

    const urgencyOrder = ['Immediate', 'Within 1 week', 'Within 1 month', 'Monitoring only']
    const urgency1 = result1?.estimatedRepairUrgency || 'Monitoring only'
    const urgency2 = result2?.estimatedRepairUrgency || 'Monitoring only'
    const estimatedRepairUrgency = urgencyOrder[Math.min(
      urgencyOrder.indexOf(urgency1),
      urgencyOrder.indexOf(urgency2)
    )] || urgency1

    return NextResponse.json({
      overallCondition,
      summary: result1?.summary || result2?.summary || '',
      totalEstimatedRepairCost: { low: totalLow, high: totalHigh },
      damages: allDamages,
      followUpRequired:
        result1?.followUpRequired ||
        result2?.followUpRequired ||
        lowConfidenceCount > 0 ||
        needsVerificationCount > 0,
      estimatedRepairUrgency,
      lowConfidenceFindings: lowConfidenceCount,
      needsVerificationFindings: needsVerificationCount,
      _truncated: result1?._truncated || result2?._truncated,
    })
  } catch (err: any) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
