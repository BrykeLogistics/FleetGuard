import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// Vehicle-specific weak points known from fleet experience
const WEAK_POINTS: Record<string, string> = {
  sprinter: `Ford Transit / Mercedes Sprinter / Ram ProMaster known weak points:
- Lower sliding door track: rust, deformation, damage from curbs
- Front lower bumper: scrapes from curbs, misalignment from prior impact
- Roof front lip: dents from low clearances
- Mirror housing: cracks, missing glass, broken housings
- Rear door hinge: wear, misalignment
- Mercedes Sprinter: front bumper lower valance cracks, roof rack damage, sliding door track deformation`,

  stepvan: `Step Van (Utilimaster, Grumman, P-series, Ford P700/P1000) known weak points:
- Rear upper corners: active rust/corrosion is common on older vans — document on baseline, escalate ONLY if bubbling/flaking paint appears on follow-up
- Area above front tires (both sides): high contact zone, inspect carefully for scrapes and dents
- Step entry: dents, cracks, bent metal
- Lower body side panels: dock contact scrapes — describe FULL length from start to end point
- Roof front edge seam: check for corrosion at seam where roof meets front wall — known weak point on older vans
- Front panel above windshield: check for paint loss, chips, impact damage
- Rear cargo door lower corners: rust, damage, seal condition
- Clearance lights: cracked, missing, or non-functional
- Rear bumper: dock strikes, deformation
- Grille surround: Utilimaster/Alvan tan/beige surround is FACTORY COLOR — do NOT flag as paint damage
- Door pull straps, door chains, door holders, vent window latches: STANDARD EQUIPMENT — do NOT flag these
- Rear cargo door center seam: NORMAL construction feature — do NOT flag unless dramatically misaligned`,

  boxtruck: `Box Truck / Straight Truck known weak points:
- Rear bumper: dock strikes, deformation, underride guard damage
- Cargo box lower panels: rust, scrapes from dock contact
- Roof front edge: low-clearance damage
- Dual rear tires: outer sidewall damage, curb rash on outer rims
- Cargo door seals: cracked, torn, missing
- Frame rails and cross members: check undercarriage for damage`,
}

// USA side orientation — compact version
const ORIENTATION = `USA VEHICLE ORIENTATION (driver=LEFT side of vehicle):
- Front photo: driver side = YOUR LEFT, passenger side = YOUR RIGHT
- Rear photo: driver side = YOUR RIGHT, passenger side = YOUR LEFT
- Driver side photo: LEFT side of vehicle as viewed from outside
- Passenger side photo: RIGHT side of vehicle as viewed from outside
- Front-left corner = DRIVER SIDE front. Front-right corner = PASSENGER SIDE front.
- Rear-left corner = DRIVER SIDE rear. Rear-right corner = PASSENGER SIDE rear.
ALWAYS use "driver side" or "passenger side" — NEVER "left" or "right" alone.`

// Core damage knowledge accumulated from fleet training
const DAMAGE_KNOWLEDGE = `DAMAGE ASSESSMENT KNOWLEDGE:

PAINT/SURFACE SEVERITY HIERARCHY (escalate accordingly):
1. Surface scuff — paint intact, no penetration → minor
2. Paint scratched through clearcoat but primer intact → minor-to-moderate
3. Paint scraped to bare metal (primer removed) → moderate — flag RUST RISK, especially in Florida humidity
4. Deep scratch through primer to bare metal + gouging → moderate-to-critical depending on size
5. Active rust with bubbling or flaking paint → moderate minimum, escalate urgency

RUST/CORROSION DISTINCTION:
- Wheel rust/oxidation on rotors and drums = NORMAL WEAR — do NOT flag
- Surface corrosion (minor discoloration, no bubbling) = document as minor wear item
- Bubbling or flaking paint over rust = MODERATE severity, flag urgency "Within 1 week"
- Active rust through body panels = CRITICAL

CONTINUOUS DAMAGE ZONES:
- When a scrape, scratch, or damage runs across a continuous area, describe it as ONE finding
- Include explicit start and end points: e.g., "lower driver-side panel scrape running from front wheel arch to rear wheel arch, approx 8 ft long"
- Do NOT split a continuous damage zone into multiple findings

BUMPER ALIGNMENT RULE:
- Assess bumper as a WHOLE UNIT, not just surface condition
- A bumper that is crooked, canted, or offset = evidence of PRIOR IMPACT even without visible denting
- Flag misaligned bumpers as moderate severity with note "prior impact suspected"

PANEL GAPS AND SEPARATIONS:
- Flag any visible gap where panels should sit flush — especially at hood/windshield/cab junctions
- Visible panel separation = potential structural concern, flag for physical verification

REFLECTORS AND DOT COMPLIANCE:
- Check ALL reflectors: front, side, and rear
- Any reflector that is partially missing, cracked, or non-reflective = DOT compliance issue = moderate severity

DAMAGE BENEATH DECALS AND WRAPS:
- Actively scan for scratches, gashes, or impact damage visible through or beneath graphic areas
- Report these separately with note "damage beneath/through decal"

HEADLIGHT OXIDATION:
- ONLY flag if clearly visible in this photo
- Do NOT assume oxidation based on vehicle age or other trucks in the fleet
- Each photo is assessed independently

UNCERTAIN DEFORMATION:
- Curved body panels can make it hard to confirm deformation from photos
- When uncertain, flag as "possible deformation — verify with close-up or physical inspection" with confidence < 70

ROOF/SEAM WELD CORNERS:
- Check weld corners at roof-to-wall and panel junctions for cracking or separation
- Any separation or crack at a weld corner = moderate severity

EACH PHOTO IS INDEPENDENT:
- Never pattern-match damage between trucks or assume damage from one photo exists in another
- Assess only what is visible in the current photo set`

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

  const exteriorChecklist = `EXTERIOR INSPECTION CHECKLIST — REPORT DAMAGE ONLY. Do not comment on undamaged areas. Do not speculate on cause.

BODY PANELS:
- Dents, creases, scratches, scrapes, scuffs, paint chips
- Paint transfer marks (color smears from contact with other objects)
- Body side moldings/trim: missing, cracked, or loose
- Prior repair evidence: mismatched paint, body filler, overspray
- Panel gaps and separations at hood/windshield/cab junctions
- Damage beneath or through decals/wraps

ROOF:
- Dents, depressions, creases — especially above cab and front edge seam
- Roof marker/clearance lights: cracked or missing
- Antenna: bent or missing
- Seam weld corners: check for cracking or separation

FRONT BUMPER (always check both):
- Alignment: is the bumper straight and level as a whole unit? Crooked = prior impact
- Surface condition: scrapes, deformation, cracks

MIRRORS:
- Inspect glass AND housing separately
- Missing glass, cracked glass, broken housing, missing housing

GLASS & LIGHTS:
- Windshield: cracks, chips, star breaks
- Headlights/taillights: cracks, broken lenses, moisture intrusion
- Turn signals, marker lights, clearance lights: condition
- Headlight oxidation: flag ONLY if clearly visible in this photo

REFLECTORS (DOT COMPLIANCE):
- Check all reflectors: front, side, rear
- Partially missing, cracked, or non-reflective = DOT issue = moderate severity

DOORS:
- Door edge dings and scrapes
- Sliding cargo door track (Sprinters/Transits): deformation, damage
- Rear cargo doors: seal condition, latch condition, alignment
- Entry steps: bent, broken, or missing

TIRES & WHEELS:
- Tire sidewall: cuts, bulges, damage (NOT normal oxidation on rotors)
- Rims: curb rash, bends, cracks
- Hubcaps: missing or cracked

BRANDING:
- Decal/wrap tears, peeling, or missing sections

STRUCTURAL:
- Frame or cross member damage
- Major collision evidence
- Box trucks: inspect undercarriage cross members and frame rails`

  const interiorChecklist = `INTERIOR/CARGO INSPECTION CHECKLIST — REPORT DAMAGE ONLY. Do not comment on undamaged areas.

DASHBOARD:
- Warning lights illuminated (list each individually)
- Cracked dash, damaged controls or switches

CARGO AREA:
- Floor-mounted step/threshold plate: bent, broken, loose, or missing
- Tie-down track: damage, missing anchors
- Cargo floor: punctures, major damage (ignore light cosmetic scuffing)
- Cargo walls/ceiling: dents, holes, tears in panels (ignore light cosmetic scuffing)`

  const checklist = photoGroup === 'interior' ? interiorChecklist : exteriorChecklist

  const rentalNote = isRental
    ? `\nRENTAL VEHICLE — HEIGHTENED SENSITIVITY: Every finding is legal and financial evidence. Document even minor scuffs and chips. Do not round down severity.`
    : ''

  const baselineInstructions = hasBaseline
    ? `FOLLOW-UP INSPECTION — COMPARISON MODE:
Compare each finding against the baseline damage list below.
- Mark is_new: true ONLY for damage that does NOT appear in the baseline
- For existing damage, flag if it has worsened (larger, deeper, new rust, etc.)
- Do NOT re-flag baseline damage as new
- Do flag even small changes to existing damage`
    : `BASELINE INSPECTION — INITIAL DOCUMENTATION MODE:
This is the legal baseline for all future comparisons. Document ALL damage thoroughly, including minor items.
Capture precise locations, dimensions, and descriptions. When in doubt, include it.`

  return `You are an expert commercial fleet damage inspector for FedEx delivery vehicles operated by Bryke Logistics, Fort Lauderdale, FL. Your findings are used for driver accountability, DOT compliance, and legal documentation.

VEHICLE: ${truckInfo}
VEHICLE TYPE: ${vehicleContext}
INSPECTION TYPE: ${inspectionType}
INSPECTOR: ${inspector}
INSPECTOR NOTES: ${notes || 'None'}${baselineText}
${rentalNote}

${ORIENTATION}

${baselineInstructions}

${weakPoints ? `VEHICLE-SPECIFIC KNOWN WEAK POINTS:\n${weakPoints}\n` : ''}

${DAMAGE_KNOWLEDGE}

${checklist}

SEVERITY DEFINITIONS:
- critical: structural damage, safety hazard, DOT compliance failure, major collision damage, frame damage
- moderate: fist-size or larger dent, paint scraped to bare metal, cracked lens, missing trim, mirror damage, bubbling/flaking rust, DOT reflector issue, bumper misalignment
- minor: surface scuff (paint intact), door ding under fist-size, paint chip, light curb rash, surface corrosion without bubbling

CONFIDENCE AND VERIFICATION:
- Rate your confidence 0–100 for each finding
- Any finding under 70 confidence MUST include a note: "Requires physical verification — [reason]"
- For uncertain deformation on curved panels, use "possible deformation — verify with close-up"

REPAIR ESTIMATES:
- Provide USA commercial vehicle repair cost range in USD
- Determine repair method: DIY (mirrors, lights, moldings, trim, bumper covers, steps, hubcaps, reflectors) vs Shop (frame, major panels, roof, windshield, structural)

Respond ONLY in valid JSON with NO markdown, NO code fences, NO commentary before or after:
{
  "overallCondition": "Good|Fair|Poor|Critical",
  "summary": "2–3 sentence professional summary of overall vehicle condition",
  "totalEstimatedRepairCost": { "low": 0, "high": 0 },
  "damages": [
    {
      "severity": "critical|moderate|minor",
      "location": "precise location using driver side / passenger side terminology, with zone (front, mid, rear)",
      "description": "detailed description including size/dimensions, surface condition, paint status, and full extent of damage zone",
      "recommendation": "specific repair recommendation",
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

function deduplicateDamages(damages1: any[], damages2: any[]): any[] {
  const all = [...damages1, ...damages2]
  const deduped: any[] = []

  for (const d of all) {
    const dLoc = (d.location || '').toLowerCase()
    const dDesc = (d.description || '').toLowerCase()
    // Extract meaningful location keywords (skip short words)
    const dLocWords = dLoc.split(/\s+/).filter((w: string) => w.length > 3)

    const duplicateIdx = deduped.findIndex(existing => {
      const eLoc = (existing.location || '').toLowerCase()
      const eDesc = (existing.description || '').toLowerCase()

      // Location overlap: at least 2 meaningful words in common
      const locWordMatches = dLocWords.filter((w: string) => eLoc.includes(w)).length
      if (locWordMatches < 2) return false

      // Description similarity: first 4 meaningful words overlap
      const dDescWords = dDesc.split(/\s+/).filter((w: string) => w.length > 3).slice(0, 4)
      const descOverlap = dDescWords.filter((w: string) => eDesc.includes(w)).length
      return descOverlap >= 2
    })

    if (duplicateIdx === -1) {
      deduped.push(d)
    } else {
      // Keep the higher-confidence version
      if ((d.confidence || 0) > (deduped[duplicateIdx].confidence || 0)) {
        deduped[duplicateIdx] = d
      }
    }
  }

  return deduped
}

async function analyzePhotos(
  images: any[],
  prompt: string
): Promise<any> {
  const content: any[] = []
  for (const img of images) {
    content.push({
      type: 'image',
      source: { type: 'base64', media_type: img.media_type || 'image/jpeg', data: img.data }
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
    // Attempt to recover truncated JSON
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

    // Exterior = first 8 photos, interior = photos 9+ (rentals have 10 shots)
    const exteriorImages = allImages.filter((_: any, i: number) => i < 8)
    const interiorImages = allImages.filter((_: any, i: number) => i >= 8)

    const mid = Math.ceil(exteriorImages.length / 2)
    const group1 = exteriorImages.slice(0, mid)
    const group2 = exteriorImages.slice(mid)

    // Build prompts
    const promptArgs: [string, string, string, string, string, string, string, boolean, boolean, 'exterior' | 'interior'] = [
      truckInfo, vehicleContext, vehicleType || '', inspectionType,
      inspector, notes, baselineText, hasBaseline, isRental, 'exterior'
    ]
    const prompt1 = buildPrompt(...promptArgs)
    const prompt2 = buildPrompt(...promptArgs)
    const prompt3 = interiorImages.length > 0
      ? buildPrompt(
          truckInfo, vehicleContext, vehicleType || '', inspectionType,
          inspector, notes, baselineText, hasBaseline, isRental, 'interior'
        )
      : null

    // Run analyses in parallel
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

    // Merge and deduplicate damage findings
    const damages1 = result1?.damages || []
    const damages2 = result2?.damages || []
    const damages3 = result3?.damages || []

    const allDamages = deduplicateDamages(
      deduplicateDamages(damages1, damages2),
      damages3
    )

    // Sort: critical → moderate → minor, then by confidence descending
    allDamages.sort((a, b) => {
      const sevOrder: Record<string, number> = { critical: 0, moderate: 1, minor: 2 }
      const sevDiff = (sevOrder[a.severity] ?? 2) - (sevOrder[b.severity] ?? 2)
      if (sevDiff !== 0) return sevDiff
      return (b.confidence || 0) - (a.confidence || 0)
    })

    // Count items needing verification
    const lowConfidenceCount = allDamages.filter(d => (d.confidence || 100) < 70).length
    const needsVerificationCount = allDamages.filter(d => d.needsVerification).length

    // Aggregate repair costs
    const totalLow = allDamages.reduce((sum, d) => sum + (d.repairEstimate?.low || 0), 0)
    const totalHigh = allDamages.reduce((sum, d) => sum + (d.repairEstimate?.high || 0), 0)

    // Use worst overall condition across both results
    const conditionOrder = ['Critical', 'Poor', 'Fair', 'Good']
    const condition1 = result1?.overallCondition || 'Good'
    const condition2 = result2?.overallCondition || 'Good'
    const worstIdx = Math.min(
      conditionOrder.indexOf(condition1),
      conditionOrder.indexOf(condition2)
    )
    const overallCondition = conditionOrder[worstIdx] || condition1

    // Use most urgent repair urgency across both results
    const urgencyOrder = ['Immediate', 'Within 1 week', 'Within 1 month', 'Monitoring only']
    const urgency1 = result1?.estimatedRepairUrgency || 'Monitoring only'
    const urgency2 = result2?.estimatedRepairUrgency || 'Monitoring only'
    const urgencyIdx = Math.min(
      urgencyOrder.indexOf(urgency1),
      urgencyOrder.indexOf(urgency2)
    )
    const estimatedRepairUrgency = urgencyOrder[urgencyIdx] || urgency1

    const merged = {
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
    }

    return NextResponse.json(merged)
  } catch (err: any) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
