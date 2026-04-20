import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { images, truckInfo, inspectionType, inspector, notes, baselineDamages } = await req.json()

    const hasBaseline = baselineDamages && baselineDamages.length > 0
    const baselineText = hasBaseline
      ? `\n\nPREVIOUS KNOWN DAMAGE (from baseline inspection — do NOT flag these as new):\n${baselineDamages.map((d: any) => `- ${d.location}: ${d.description} (${d.severity})`).join('\n')}`
      : ''

    const prompt = `You are an expert fleet damage inspector AI for a logistics company. Analyze these truck photos carefully.

Truck: ${truckInfo}
Inspection type: ${inspectionType}
Inspector: ${inspector}
Notes: ${notes || 'None'}${baselineText}

${hasBaseline ? 'IMPORTANT: Compare against the known existing damage above. Only mark damage as "is_new: true" if it was NOT present before.' : 'This is a baseline inspection — all damage found should be marked is_new: false.'}

Respond ONLY with valid JSON, no markdown, no explanation:
{
  "overallCondition": "Good|Fair|Poor|Critical",
  "summary": "2-3 sentence summary of findings",
  "damages": [
    {
      "severity": "critical|moderate|minor",
      "location": "specific location on truck",
      "description": "detailed description of damage",
      "recommendation": "repair recommendation",
      "is_new": true or false
    }
  ],
  "areasChecked": ["list of visible areas"],
  "followUpRequired": true or false,
  "estimatedRepairUrgency": "Immediate|Within 1 week|Within 1 month|Monitoring only"
}`

    const content: any[] = []
    if (images && images.length > 0) {
      for (const img of images) {
        content.push({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } })
      }
    }
    content.push({ type: 'text', text: prompt })

    const response = await anthropic.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 2000,
      messages: [{ role: 'user', content }],
    })

    const text = response.content.map((c: any) => c.text || '').join('')
    const clean = text.replace(/```json|```/g, '').trim()
    const result = JSON.parse(clean)
    return NextResponse.json(result)
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
