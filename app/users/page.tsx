'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/useProfile'
import Navbar from '../components/Navbar'

const emptyForm = { full_name:'', role:'driver', csa:'', email:'', phone:'', fedex_id:'', password:'' }

export default function UsersPage() {
  const { profile, isOwner, loading: profileLoading } = useProfile()
  const [users, setUsers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editingId, setEditingId] = useState<string|null>(null)

  useEffect(() => { if (!profileLoading) loadUsers() }, [profileLoading])

  async function loadUsers() {
    const { data } = await supabase.from('profiles').select('*').order('full_name')
    setUsers(data || [])
    setLoading(false)
  }

  async function saveUser(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true); setError(''); setSuccess('')
    try {
      if (editingId) {
        const { error: err } = await supabase.from('profiles').update({
          full_name: form.full_name, role: form.role, csa: form.csa,
          email: form.email, phone: form.phone, fedex_id: form.fedex_id
        }).eq('id', editingId)
        if (err) throw err
        setSuccess('User updated successfully')
      } else {
        const { data, error: signUpErr } = await supabase.auth.signUp({
          email: form.email,
          password: form.password,
          options: { data: { full_name: form.full_name } }
        })
        if (signUpErr) throw signUpErr
        if (data.user) {
          await supabase.from('profiles').upsert({
            id: data.user.id, full_name: form.full_name, role: form.role,
            csa: form.csa, email: form.email, phone: form.phone, fedex_id: form.fedex_id
          })
        }
        setSuccess(`✓ User created. Temporary password: ${form.password} — share this with them directly.`)
      }
      setForm(emptyForm); setShowAdd(false); setEditingId(null)
      loadUsers()
    } catch (err: any) {
      setError(err.message || 'Failed to save user')
    }
    setSaving(false)
  }

  async function toggleActive(user: any) {
    await supabase.from('profiles').update({ is_active: !user.is_active }).eq('id', user.id)
    loadUsers()
  }

  function startEdit(user: any) {
    setEditingId(user.id)
    setForm({ full_name:user.full_name, role:user.role, csa:user.csa||'', email:user.email||'', phone:user.phone||'', fedex_id:user.fedex_id||'', password:'' })
    setShowAdd(true)
  }

  const roleColor = (r: string) => r==='owner'?{bg:'#FCEBEB',color:'#A32D2D'}:r==='manager'?{bg:'#E6F1FB',color:'#0C447C'}:{bg:'#EAF3DE',color:'#27500A'}

  if (profileLoading) return <div />
  if (!isOwner) return (
    <div><Navbar />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'48px 16px', textAlign:'center', color:'#888' }}>
        Access restricted to owners only.
      </div>
    </div>
  )

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:600 }}>Users</div>
            <div style={{ fontSize:13, color:'#888', marginTop:2 }}>{users.length} total · {users.filter(u=>u.role==='driver').length} drivers · {users.filter(u=>u.role==='manager').length} managers</div>
          </div>
          <button className="btn btn-primary" onClick={() => { setShowAdd(!showAdd); setEditingId(null); setForm(emptyForm); setError(''); setSuccess('') }}>+ Add user</button>
        </div>

        {success && <div style={{ background:'#EAF3DE', color:'#27500A', padding:'10px 14px', borderRadius:8, marginBottom:12, fontSize:13, fontWeight:500 }}>{success}</div>}
        {error && <div style={{ background:'#FCEBEB', color:'#A32D2D', padding:'10px 14px', borderRadius:8, marginBottom:12, fontSize:13 }}>{error}</div>}

        {showAdd && (
          <div className="card" style={{ padding:'20px', marginBottom:16, border: editingId ? '1.5px solid #185FA5' : undefined }}>
            <div style={{ fontSize:14, fontWeight:500, marginBottom:16 }}>{editingId ? 'Edit user' : 'Add new user'}</div>
            <form onSubmit={saveUser}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div><label>Full name *</label><input value={form.full_name} onChange={e => setForm({...form, full_name:e.target.value})} placeholder="e.g. Carlos Martinez" required /></div>
                <div>
                  <label>Role *</label>
                  <select value={form.role} onChange={e => setForm({...form, role:e.target.value})}>
                    <option value="driver">Driver</option>
                    <option value="manager">Manager</option>
                    <option value="owner">Owner</option>
                  </select>
                </div>
                {form.role === 'driver' && <div><label>CSA / Location</label><input value={form.csa} onChange={e => setForm({...form, csa:e.target.value})} placeholder="e.g. Fort Lauderdale" /></div>}
                <div><label>Email *</label><input type="email" value={form.email} onChange={e => setForm({...form, email:e.target.value})} placeholder="email@example.com" required /></div>
                <div><label>Phone</label><input value={form.phone} onChange={e => setForm({...form, phone:e.target.value})} placeholder="(555) 000-0000" /></div>
                <div><label>FedEx ID</label><input value={form.fedex_id} onChange={e => setForm({...form, fedex_id:e.target.value})} placeholder="FedEx employee ID" /></div>
                {!editingId && (
                  <div style={{ gridColumn:'1/-1' }}>
                    <label>Temporary password *</label>
                    <input value={form.password} onChange={e => setForm({...form, password:e.target.value})} placeholder="Min 6 characters — share directly with user" required={!editingId} minLength={6} />
                    <div style={{ fontSize:11, color:'#888', marginTop:4 }}>This password will be shown once after creation. Share it directly with the user.</div>
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Create user'}</button>
                <button type="button" className="btn" onClick={() => { setShowAdd(false); setEditingId(null); setForm(emptyForm); setError('') }}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading ? <div style={{ textAlign:'center', padding:'40px', color:'#888' }}>Loading...</div> : (
          <div className="card" style={{ overflow:'hidden' }}>
            {users.length === 0 ? (
              <div style={{ padding:'48px', textAlign:'center', color:'#888', fontSize:13 }}>No users yet. Add your first driver or manager.</div>
            ) : users.map((u, i) => {
              const rc = roleColor(u.role)
              return (
                <div key={u.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'14px 16px', borderBottom: i < users.length-1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none', opacity: u.is_active ? 1 : 0.5 }}>
                  <div style={{ width:36, height:36, borderRadius:'50%', background:'#E6F1FB', display:'flex', alignItems:'center', justifyContent:'center', fontSize:14, fontWeight:600, color:'#185FA5', flexShrink:0 }}>
                    {u.full_name?.charAt(0).toUpperCase()}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap' }}>
                      <div style={{ fontSize:14, fontWeight:500 }}>{u.full_name}</div>
                      <span style={{ fontSize:11, fontWeight:500, padding:'1px 8px', borderRadius:20, background:rc.bg, color:rc.color }}>{u.role}</span>
                      {!u.is_active && <span style={{ fontSize:11, color:'#aaa' }}>Inactive</span>}
                    </div>
                    <div style={{ fontSize:12, color:'#888', marginTop:2 }}>
                      {u.email}{u.csa ? ` · ${u.csa}` : ''}{u.fedex_id ? ` · FedEx ID: ${u.fedex_id}` : ''}{u.phone ? ` · ${u.phone}` : ''}
                    </div>
                  </div>
                  {u.id !== profile?.id && (
                    <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                      <button onClick={() => startEdit(u)} style={{ padding:'5px 12px', borderRadius:7, border:'0.5px solid rgba(0,0,0,0.15)', background:'transparent', color:'#185FA5', cursor:'pointer', fontSize:12 }}>Edit</button>
                      <button onClick={() => toggleActive(u)} style={{ padding:'5px 12px', borderRadius:7, border:'0.5px solid rgba(0,0,0,0.15)', background:'transparent', color: u.is_active ? '#A32D2D' : '#27500A', cursor:'pointer', fontSize:12 }}>{u.is_active ? 'Deactivate' : 'Activate'}</button>
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
