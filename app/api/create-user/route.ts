import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json()
    const { action, ...data } = body

    // ── Create user ──────────────────────────────────────────────
    if (!action || action === 'create') {
      const { full_name, role, csa, email, phone, fedex_id, password, company_id } = data

      const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })
      if (authError) return NextResponse.json({ error: authError.message }, { status: 400 })

      const { error: profileError } = await supabaseAdmin.from('profiles').insert({
        id: authData.user.id,
        full_name,
        role,
        csa: csa || '',
        email,
        phone: phone || '',
        fedex_id: fedex_id || '',
        is_active: true,
        company_id,
      })
      if (profileError) return NextResponse.json({ error: profileError.message }, { status: 400 })

      return NextResponse.json({ success: true, userId: authData.user.id })
    }

    // ── Delete user ──────────────────────────────────────────────
    if (action === 'delete') {
      const { userId } = data
      await supabaseAdmin.from('profiles').delete().eq('id', userId)
      const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    // ── Reset password ───────────────────────────────────────────
    if (action === 'reset_password') {
      const { userId, newPassword } = data
      const { error } = await supabaseAdmin.auth.admin.updateUserById(userId, { password: newPassword })
      if (error) return NextResponse.json({ error: error.message }, { status: 400 })
      return NextResponse.json({ success: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Server error' }, { status: 500 })
  }
}
