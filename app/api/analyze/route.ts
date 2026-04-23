import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// Vehicle-specific weak points known from fleet experience
const WEAK_POINTS: Record<string, string> = {
  sprinter: 'Known weak points: Ford Transit lower sliding door track rust/damage, front lower bumper scrapes from curbs, roof front lip dents from low clearances, mirror housing cracks, rear door hinge wear. Mercedes Sprinter: front bumper lower valance cracks, roof rack damage, sliding door track deformation.',
  stepvan: 'Known weak points: rear cargo door lower corners rust/damage, step entry dents and cracks, body side panel lower section damage from dock contact, roof low-clearance dents (especially front), clearance light damage, rear bumper dock strikes.',
  boxtruck: 'Known weak points: rear bumper dock strikes, cargo box lower panels rust, roof front edge low-clearance damage, dual rear tire outer sidewall damage, cargo door seal damage, underride guard damage.',
}

// USA side orientation — compact version
const ORIENTATION = `USA VEHICLE ORIENTATION (driver=LEFT):
Front photo: driver side=YOUR LEFT, passenger side=YOUR RIGHT
Rear photo: driver side=YOUR RIGHT, passenger side=YOUR LEFT
Driver side photo: LEFT side of vehicle
Passenger side photo: RIGHT side of vehicle
Front-left corner=DRIVER SIDE front. Front-right corner=PASSENGER SIDE front.
Rear-left corner=DRIVER SIDE rear. Rear-right corner=PASSENGER SIDE rear.
Always use "driver side" or "passenger side" — never "left" or "right" alone.`

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

  const exteriorChecklist = `INSPECT EVERY VISIBLE AREA:

EXTERIOR BODY: dents (any size), creases, collision damage, scratches (any depth), scrapes, scuffs, chips, fading, oxidation, body side moldings/trim strips (present/cracked/loose/missing), evidence of prior repair (mismatched paint, Bondo, overspray, misaligned panels)
ROOF: dents from low-clearance strikes (depressions/creases/paint cracking especially front above cab), roof marker/clearance lights (present/cracked/missing), antenna damage, seam separation
GLASS & LIGHTS: windshield cracks/chips, all mirrors (glass/housing), headlights/taillights (cracks/broken lenses/moisture), turn signals and marker lights
DOORS: all door edges for dings, hinges, sliding cargo door track (sprinters), rear cargo doors/seals/latches (step vans/box trucks), steps and entry areas
TIRES & WHEELS: sidewall damage/cuts/bulges, rim damage/curb rash, missing/cracked hubcaps
BRANDING: FedEx/Amazon decal/wrap tears/peeling/missing, DOT placard present and legible
STRUCTURAL: frame damage, suspension damage, major collision evidence`

  const interiorChecklist = `INSPECT INTERIOR/CARGO AREA:
DASHBOARD: warning lights illuminated (describe each), cracked dash, damaged controls, odometer reading if visible, any interior damage
CARGO BED/AREA: dents, scratches, stains, damage to walls/floor/ceiling, missing tie-down rings, damage to cargo door interior, any modifications or damage not consistent with normal use`

  const checklist = photoGroup === 'interior' ? interiorChecklist : exteriorChecklist

  const rentalInstructions = isRental ? `
RENTAL DOCUMENTATION MODE: This vehicle is a rental. Document EVERYTHING with extreme precision. Your findings are legal evidence to dispute damage claims. Note pre-existing damage explicitly. Flag anything that could be charged back to the operator.` : ''

  const baselineInstructions = hasBaseline
    ? `COMPARISON: Compare against baseline below. Mark is_new:true ONLY for damage NOT in baseline. Flag even small changes to existing damage.`
    : `BASELINE: Initial documentation. Capture EVERYTHING. This is the legal baseline for all future comparisons.`

  return `You are an expert commercial fleet damage inspector for FedEx/Amazon delivery vehicles. Findings are used for driver accountability and legal documentation.

VEHICLE: ${truckInfo}
TYPE: ${vehicleContext}
INSPECTION: ${inspectionType} | INSPECTOR: ${inspector}
NOTES: ${notes || 'None'}${baselineText}
${rentalInstructions}

${ORIENTATION}

${baselineInstructions}

${weakPoints ? `VEHICLE-SPECIFIC WATCH LIST: ${weakPoints}` : ''}

${checklist}

SEVERITY: critical=structural/safety/DOT fail/major collision. moderate=fist-size+ dent/deep scratch to metal/cracked lens/missing trim/mirror damage. minor=surface scratch/door ding/scuff/paint chip/light curb rash.

Be specific about EXACT location with driver/passenger side. Include estimated dimensions.
For each damage, estimate USA commercial vehicle repair cost range and determine if DIY-replaceable (mirrors/lights/moldings/trim/bumper covers/steps/hubcaps=DIY. Frame/major panels/roof/windshield=shop).
Rate your confidence 0-100 for each finding. Flag anything under 70 as needing physical verification.

Respond ONLY in valid JSON, no markdown:
{
  "overallCondition": "Good|Fair|Poor|Critical",
  "summary": "2-3 sentence professional summary",
  "totalEstimatedRepairCost": { "low": 0, "high": 0 },
  "damages": [
    {
      "severity": "critical|moderate|minor",
      "location": "precise location with driver/passenger side",
      "description": "detailed description with size and appearance",
      "recommendation": "specific repair recommendation",
      "is_new": false,
      "confidence": 85,
      "repairEstimate": { "low": 0, "high": 0, "method": "DIY or shop" },
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
    // Check if a similar damage already exists (same location + similar description)
    const isDuplicate = deduped.some(existing => {
      const locMatch = existing.location?.toLowerCase().includes(d.location?.toLowerCase().split(' ')[0]) ||
        d.location?.toLowerCase().includes(existing.location?.toLowerCase().split(' ')[0])
      const descWords = d.description?.toLowerCase().split(' ').slice(0, 3).join(' ')
      const descMatch = existing.description?.toLowerCase().includes(descWords)
      return locMatch && descMatch
    })

    if (!isDuplicate) {
      deduped.push(d)
    } else {
      // Keep the higher confidence version
      const existingIdx = deduped.findIndex(existing => {
        const locMatch = existing.location?.toLowerCase().includes(d.location?.toLowerCase().split(' ')[0]) ||
          d.location?.toLowerCase().includes(existing.location?.toLowerCase().split(' ')[0])
        return locMatch
      })
      if (existingIdx >= 0 && (d.confidence || 0) > (deduped[existingIdx].confidence || 0)) {
        deduped[existingIdx] = d
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
    model: 'claude-sonnet-4-5',
    max_tokens: 3000,
    messages: [{ role: 'user', content }],
  })

  const text = response.content.map((c: any) => c.text || '').join('')
  const clean = text.replace(/```json|```/g, '').trim()

  try {
    return JSON.parse(clean)
  } catch {
    // Try to recover truncated JSON
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
    const { images, truckInfo, inspectionType, inspector, notes, baselineDamages, vehicleType, fleetType } = body

    const hasBaseline = baselineDamages && baselineDamages.length > 0
    const isRental = fleetType === 'rental'
    const baselineText = hasBaseline
      ? `\n\nBASELINE DAMAGE ON RECORD (do NOT flag as new):\n${baselineDamages.map((d: any) => `- ${d.location}: ${d.description} (${d.severity})`).join('\n')}`
      : ''

    const vehicleContext = vehicleType === 'stepvan'
      ? 'Step Van / Walk-in Van (Utilimaster, Grumman, P-series)'
      : vehicleType === 'boxtruck'
      ? 'Box Truck / Straight Truck'
      : 'Sprinter / Cargo Van (Ford Transit, Mercedes Sprinter, Ram ProMaster)'

    const allImages = images || []

    // Split photos into two groups for parallel analysis
    // Group 1: first half (front, driver front corner, driver side, driver rear corner)
    // Group 2: second half (rear, passenger rear corner, passenger side, passenger front corner)
    // Interior photos (if any) go to group 2
    const exteriorImages = allImages.filter((_: any, i: number) => i < 8)
    const interiorImages = allImages.filter((_: any, i: number) => i >= 8)

    const mid = Math.ceil(exteriorImages.length / 2)
    const group1 = exteriorImages.slice(0, mid)
    const group2 = exteriorImages.slice(mid)

    // Build prompts for each group
    const prompt1 = buildPrompt(truckInfo, vehicleContext, vehicleType || '', inspectionType, inspector, notes, baselineText, hasBaseline, isRental, 'exterior')
    const prompt2 = buildPrompt(truckInfo, vehicleContext, vehicleType || '', inspectionType, inspector, notes, baselineText, hasBaseline, isRental, 'exterior')
    const prompt3 = interiorImages.length > 0
      ? buildPrompt(truckInfo, vehicleContext, vehicleType || '', inspectionType, inspector, notes, baselineText, hasBaseline, isRental, 'interior')
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
      return NextResponse.json({ error: 'Analysis failed — no results returned. Please try again.' }, { status: 500 })
    }

    // Merge results
    const damages1 = result1?.damages || []
    const damages2 = result2?.damages || []
    const damages3 = result3?.damages || []

    const allDamages = deduplicateDamages(
      deduplicateDamages(damages1, damages2),
      damages3
    )

    // Sort by severity then confidence
    allDamages.sort((a, b) => {
      const sevOrder: Record<string, number> = { critical: 0, moderate: 1, minor: 2 }
      const sevDiff = (sevOrder[a.severity] || 2) - (sevOrder[b.severity] || 2)
      if (sevDiff !== 0) return sevDiff
      return (b.confidence || 0) - (a.confidence || 0)
    })

    // Flag low confidence items
    const lowConfidenceCount = allDamages.filter(d => (d.confidence || 100) < 70).length

    // Calculate total repair cost
    const totalLow = allDamages.reduce((sum, d) => sum + (d.repairEstimate?.low || 0), 0)
    const totalHigh = allDamages.reduce((sum, d) => sum + (d.repairEstimate?.high || 0), 0)

    // Use best overall condition from both results
    const conditionOrder = ['Critical', 'Poor', 'Fair', 'Good']
    const condition1 = result1?.overallCondition || 'Good'
    const condition2 = result2?.overallCondition || 'Good'
    const overallCondition = conditionOrder[Math.min(
      conditionOrder.indexOf(condition1),
      conditionOrder.indexOf(condition2)
    )] || condition1

    const merged = {
      overallCondition,
      summary: result1?.summary || result2?.summary || '',
      totalEstimatedRepairCost: { low: totalLow, high: totalHigh },
      damages: allDamages,
      followUpRequired: result1?.followUpRequired || result2?.followUpRequired || lowConfidenceCount > 0,
      estimatedRepairUrgency: result1?.estimatedRepairUrgency || result2?.estimatedRepairUrgency || 'Monitoring only',
      lowConfidenceFindings: lowConfidenceCount,
      _truncated: result1?._truncated || result2?._truncated,
    }

    return NextResponse.json(merged)
  } catch (err: any) {
    console.error('Analyze error:', err)
    return NextResponse.json({ error: err.message || 'Analysis failed' }, { status: 500 })
  }
}
