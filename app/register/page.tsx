'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

export default function RegisterPage() {
  const router = useRouter()
  const [form, setForm] = useState({ company_name: '', full_name: '', email: '', password: '', confirm_password: '' })
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault()
    if (form.password !== form.confirm_password) { setError('Passwords do not match'); return }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return }
    setSaving(true); setError('')

    try {
      // 1. Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: form.email,
        password: form.password,
      })
      if (authError) throw authError
      if (!authData.user) throw new Error('Failed to create account')

      // 2. Create company
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({ name: form.company_name })
        .select()
        .single()
      if (companyError) throw companyError

      // 3. Create owner profile
      const { error: profileError } = await supabase.from('profiles').insert({
        id: authData.user.id,
        full_name: form.full_name,
        role: 'owner',
        email: form.email,
        company_id: company.id,
        csa: '',
        phone: '',
        fedex_id: '',
        is_active: true,
      })
      if (profileError) throw profileError

      router.push('/')
    } catch (err: any) {
      setError(err.message || 'Registration failed')
    }
    setSaving(false)
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f7f7f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '20px 16px' }}>
      <div style={{ width: '100%', maxWidth: 440 }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <svg width="40" height="48" viewBox="0 0 100 115" fill="none" style={{ margin: '0 auto 12px', display: 'block' }}>
            <path d="M50 4 L90 18 L90 54 Q90 80 50 96 Q10 80 10 54 L10 18 Z" fill="#185FA5"/>
            <path d="M50 10 L84 23 L84 54 Q84 76 50 90 Q16 76 16 54 L16 23 Z" fill="#0C447C"/>
            <rect x="22" y="38" width="32" height="20" rx="3.5" fill="white"/>
            <rect x="56" y="43" width="22" height="15" rx="2.5" fill="white" opacity="0.75"/>
            <circle cx="32" cy="63" r="6" fill="white"/><circle cx="32" cy="63" r="3" fill="#0C447C"/>
            <circle cx="64" cy="63" r="6" fill="white"/><circle cx="64" cy="63" r="3" fill="#0C447C"/>
          </svg>
          <div style={{ fontSize: 22, fontWeight: 700, color: '#1a1a1a' }}>FleetGuard</div>
          <div style={{ fontSize: 13, color: '#888', marginTop: 4 }}>Create your fleet account</div>
        </div>

        <div className="card" style={{ padding: '28px 24px' }}>
          <form onSubmit={handleRegister}>
            <div style={{ display: 'grid', gap: 14 }}>
              <div>
                <label>Company name *</label>
                <input value={form.company_name} onChange={e => setForm({...form, company_name: e.target.value})} placeholder="e.g. Bryke Logistics" required />
              </div>
              <div>
                <label>Your full name *</label>
                <input value={form.full_name} onChange={e => setForm({...form, full_name: e.target.value})} placeholder="e.g. Beau Brudzinski" required />
              </div>
              <div>
                <label>Email *</label>
                <input type="email" value={form.email} onChange={e => setForm({...form, email: e.target.value})} placeholder="you@company.com" required />
              </div>
              <div>
                <label>Password *</label>
                <input type="password" value={form.password} onChange={e => setForm({...form, password: e.target.value})} placeholder="Min 6 characters" required minLength={6} />
              </div>
              <div>
                <label>Confirm password *</label>
                <input type="password" value={form.confirm_password} onChange={e => setForm({...form, confirm_password: e.target.value})} placeholder="Repeat password" required />
              </div>
            </div>

            {error && <div style={{ marginTop: 12, color: '#A32D2D', fontSize: 13, background: '#FCEBEB', padding: '10px 12px', borderRadius: 8 }}>{error}</div>}

            <button type="submit" className="btn btn-primary" disabled={saving}
              style={{ width: '100%', marginTop: 20, padding: '14px', fontSize: 15, fontWeight: 600 }}>
              {saving ? 'Creating account...' : 'Create account →'}
            </button>
          </form>
        </div>

        <div style={{ textAlign: 'center', marginTop: 16, fontSize: 13, color: '#888' }}>
          Already have an account? <Link href="/login" style={{ color: '#185FA5' }}>Sign in →</Link>
        </div>
      </div>
    </div>
  )
}
