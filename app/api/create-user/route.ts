import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
  try {
    const { email, password, full_name, role, csa, phone, fedex_id } = await req.json()

    const adminSupabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data, error: authErr } = await adminSupabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name }
    })
    if (authErr) throw authErr
    if (!data.user) throw new Error('User creation failed')

    const { error: profileErr } = await adminSupabase.from('profiles').insert({
      id: data.user.id,
      full_name,
      role,
      csa: csa || '',
      email,
      phone: phone || '',
      fedex_id: fedex_id || '',
      is_active: true
    })
    if (profileErr) throw profileErr

    return NextResponse.json({ success: true, userId: data.user.id })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
