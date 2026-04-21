import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export const maxDuration = 60
export const dynamic = 'force-dynamic'

// Resize base64 image to max 1000px and compress
async function resizeImage(base64: string, mimeType: string): Promise<string> {
  // Return as-is on server side — resizing happens client side
  return base64
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { images, truckInfo, inspectionType, inspector, notes, baselineDamages } = body

    const hasBaseline = baselineDamages && baselineDamages.length > 0
    const baselineText = hasBaseline
      ? `\n\nPREVIOUS KNOWN DAMAGE (do NOT flag these as new):\n${baselineDamages.map((d: any) => `- ${d.location}: ${d.description} (${d.severity})`).join('\n')}`
      : ''

    const prompt = `You are an expert fleet damage inspector AI for a logistics company. Analyze these truck photos carefully.

Truck: ${truckInfo}
Inspection type: ${inspectionType}
Inspector: ${inspector}
Notes: ${notes || 'None'}${baselineText}

${hasBaseline ? 'IMPORTANT: Only mark damage as "is_new: true" if it was NOT in the previous damage list above.' : 'This is a baseline inspection — mark all damage is_new: false.'}

Respond ONLY with valid JSON, no markdown:
{
  "overallCondition": "Good|Fair|Poor|Critical",
  "summary": "2-3 sentence summary",
  "damages": [{"severity": "critical|moderate|minor","location": "location on truck","description": "damage description","recommendation": "repair recommendation","is_new": false}],
  "areasChecked": ["list of visible areas"],
  "followUpRequired": false,
  "estimatedRepairUrgency": "Immediate|Within 1 week|Within 1 month|Monitoring only"
}`

    const content: any[] = []

    // Only send first 3 images to avoid size limits
    const limitedImages = (images || []).slice(0, 3)
    for (const img of limitedImages) {
      content.push({
        type: 'image',
        source: { type: 'base64', media_type: img.media_type || 'image/jpeg', data: img.data }
      })
    }
    content.push({ type: 'text', text: prompt })

    const response = await anthropic.messages.create({
      model: 'claude-sonnet-4-5',
      max_tokens: 2000,
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
