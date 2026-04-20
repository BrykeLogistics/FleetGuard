import { NextRequest, NextResponse } from 'next/server'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export async function POST(req: NextRequest) {
  try {
    const { images, truckInfo, inspectionType, inspector, notes, baselineDamages } = await req.json()
    const hasBaseline = baselineDamages && baselineDamages.length > 0
    const baselineText = hasBaseline
      ? `\n\nPREVIOUS KNOWN DAMAGE:\n${baselineDamages.map((d: any) => `- ${d.location}: ${d.description} (${d.severity})`).join('\n')}`
      : ''
    const prompt = `You are an expert fleet damage inspector AI. Analyze these truck photos carefully.\n\nTruck: ${truckInfo}\nInspection type: ${inspectionType}\nInspector: ${inspector}\nNotes: ${notes || 'None'}${baselineText}\n\n${hasBaseline ? 'Only mark damage as is_new: true if NOT present before.' : 'This is a baseline — mark all damage as is_new: false.'}\n\nRespond ONLY with valid JSON:\n{\n  "overallCondition": "Good|Fair|Poor|Critical",\n  "summary": "2-3 sentence summary",\n  "damages": [{"severity": "critical|moderate|minor","location": "location","description": "description","recommendation": "recommendation","is_new": false}],\n  "areasChecked": ["areas"],\n  "followUpRequired": false,\n  "estimatedRepairUrgency": "Immediate|Within 1 week|Within 1 month|Monitoring only"\n}`
    const content: any[] = []
    if (images && images.length > 0) {
      for (const img of images) {
        content.push({ type: 'image', source: { type: 'base64', media_type: img.media_type, data: img.data } })
      }
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
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
