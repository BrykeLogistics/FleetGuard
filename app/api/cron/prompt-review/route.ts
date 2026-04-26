import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import Anthropic from '@anthropic-ai/sdk'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
  const authHeader = req.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )
  const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

  const fourteenDaysAgo = new Date()
  fourteenDaysAgo.setDate(fourteenDaysAgo.getDate() - 14)

  const { data: feedback } = await supabase
    .from('damages')
    .select('location, description, severity, created_at')
    .eq('recommendation', 'Flagged by manager — missed by AI inspection')
    .gte('created_at', fourteenDaysAgo.toISOString())

  if (!feedback || feedback.length === 0) {
    return NextResponse.json({ message: 'No feedback to review' })
  }

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-5',
    max_tokens: 1500,
    messages: [{
      role: 'user',
      content: `You are reviewing manager feedback on a fleet inspection AI. Managers flagged these damages that the AI missed in the last 14 days:

${feedback.map(f => `- ${f.location}: ${f.description} (${f.severity})`).join('\n')}

Analyze patterns and suggest specific improvements to the inspection prompt. Focus on what types of damage and locations the AI is consistently missing. Be concise and specific. Format as numbered suggestions.`
    }]
  })

  const suggestions = response.content.map((c: any) => c.text || '').join('')

  const { data: ownerData } = await supabase.from('profiles').select('id').eq('role', 'owner').single()

  await supabase.from('prompt_reviews').insert({
    feedback_items: feedback,
    suggestions,
    status: 'pending',
    user_id: ownerData?.id
  })

  return NextResponse.json({ success: true, itemsAnalyzed: feedback.length })
}
