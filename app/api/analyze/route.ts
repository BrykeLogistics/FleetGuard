import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60
export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { images, truckInfo, inspectionType, inspector, notes, baselineDamages, vehicleType } = body

    const hasBaseline = baselineDamages && baselineDamages.length > 0
    const baselineText = hasBaseline
      ? `\n\nPREVIOUSLY DOCUMENTED DAMAGE (already on record — do NOT flag these as new):\n${baselineDamages.map((d: any) => `- ${d.location}: ${d.description} (${d.severity})`).join('\n')}`
      : ''

    const vehicleContext = vehicleType === 'stepvan'
      ? 'Step Van / Walk-in Van (Utilimaster, Grumman, P-series) used for FedEx/Amazon delivery'
      : vehicleType === 'boxtruck'
      ? 'Box Truck / Straight Truck used for FedEx/Amazon delivery'
      : 'Sprinter / Cargo Van (Ford Transit, Mercedes Sprinter, Ram ProMaster) used for FedEx/Amazon delivery'

    const prompt = `You are an expert commercial fleet damage inspector with 20 years of experience inspecting FedEx, Amazon, and last-mile delivery vehicles. Your findings are used for two critical purposes:

1. DRIVER ACCOUNTABILITY — Detecting damage that drivers may not have reported, including damage they caused during delivery routes (backing into docks, low clearances, parking lot incidents).

2. RENTAL VEHICLE PROTECTION — When operators rent vehicles (Penske, Ryder, etc.), this inspection serves as legal documentation to PROVE the condition at pickup/return and dispute false damage claims.

Your inspection must be THOROUGH and AGGRESSIVE. Do not overlook anything. A missed finding could cost the operator thousands of dollars.

VEHICLE: ${truckInfo}
TYPE: ${vehicleContext}
INSPECTION TYPE: ${inspectionType}
INSPECTOR: ${inspector}
NOTES: ${notes || 'None'}${baselineText}

${hasBaseline
  ? 'COMPARISON MODE: Compare carefully against the documented baseline damage above. Mark is_new: true ONLY for damage NOT previously documented. Even small changes in existing damage (e.g. a scratch that has grown, a dent that has deepened) should be flagged as new.'
  : 'BASELINE MODE: This is the initial condition documentation. Capture EVERYTHING visible. This is the legal baseline all future inspections will compare against.'}

INSPECT EVERY VISIBLE AREA THOROUGHLY. For each photo examine:

EXTERIOR BODY:
- All body panels for dents (any size, including minor door dings), creases, and collision damage
- Paint condition: scratches (any depth), scrapes, scuffs, chips, fading, oxidation
- Body side moldings and trim strips — check if present, cracked, loose, or missing entirely
- ROOF (look very carefully — this is the most commonly missed area): dents from low-clearance strikes (look for depressions, creases, or paint cracking on the roof surface, especially toward the front above the cab and along the sides), antenna or marker light damage, any separation of roof seams
- Roof marker/clearance lights: present, cracked, missing, or damaged (these amber lights on top of the cab are frequently broken in low-clearance incidents)
- Wheel wells and lower body panels: rust, corrosion, road damage
- Undercarriage areas visible in photos: rust, damage, dragging components
- Any evidence of prior repair: mismatched paint, body filler (Bondo), overspray, misaligned panels
- SCANNING TECHNIQUE: Mentally examine each photo at full resolution. Flat surfaces like roofs and side panels can hide subtle dents that only show as slight changes in light reflection or shadow. Do not dismiss any surface irregularity.

GLASS & LIGHTS:
- Windshield: cracks (any size including chips), pitting
- All mirrors: cracks, missing glass, housing damage, missing housing
- Headlights/taillights: cracks, broken lenses, missing covers, moisture inside
- Turn signals and marker lights: damage or missing

DOORS & OPENINGS:
- All door edges for dings and impact damage
- Door hinges: sagging, damage
- Sliding cargo door (sprinter vans): track damage, dents, operation
- Rear cargo doors (step vans/box trucks): dents, damage, seal condition, latch/lock hardware
- Step and entry areas: damage, missing steps

TIRES & WHEELS:
- Visible tire condition: sidewall damage, cuts, bulges, uneven wear
- Wheel/rim damage: curb rash, bends, cracks
- Hubcaps: missing, cracked, damaged

BRANDING & COMPLIANCE:
- FedEx/Amazon decals and wraps: tears, peeling, missing sections, graffiti
- DOT number placard: present and legible
- Any compliance stickers: condition

STRUCTURAL CONCERNS (flag as critical):
- Frame damage or bending
- Suspension components visible and damaged
- Any damage suggesting major collision

SEVERITY GUIDELINES:
- critical: Structural damage, safety hazard, would fail DOT roadside inspection, major collision damage, non-functional lights, severely damaged tires
- moderate: Dents larger than a fist, deep scratches through paint to metal, cracked lenses, missing trim pieces, mirror damage, damaged decals/wraps
- minor: Surface scratches, small door dings, minor scuffs, paint chips, light curb rash, minor fading

IMPORTANT: Be specific about EXACT location (e.g. "driver side rear quarter panel, lower section near wheel well" not just "side panel"). Include dimensions when estimable (e.g. "approximately 6-inch scratch").

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "overallCondition": "Good|Fair|Poor|Critical",
  "summary": "2-3 sentence professional summary suitable for an insurance or legal document",
  "damages": [
    {
      "severity": "critical|moderate|minor",
      "location": "precise location on vehicle",
      "description": "detailed professional description including size, depth, and appearance",
      "recommendation": "specific repair recommendation with urgency",
      "is_new": false
    }
  ],
  "areasChecked": ["list of all areas visible and inspected in the photos"],
  "followUpRequired": false,
  "estimatedRepairUrgency": "Immediate|Within 1 week|Within 1 month|Monitoring only",
  "rentalProtectionNotes": "Any notes specifically relevant to disputing rental damage claims or proving pre-existing condition"
}`

    const content: any[] = []
    const limitedImages = (images || []).slice(0, 6)
    for (const img of limitedImages) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: img.media_type || 'image/jpeg', data: img.data }
      })
    }
    content.push({ type: 'text', text: prompt })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 3000,
      messages: [{ role: 'user', content }],
    })

    const text = response.content.map((c: any) => c.text || '').join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    return NextResponse.json(result)
  } catch (err: any) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
