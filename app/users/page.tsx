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
        setSuccess('✓ User updated successfully')
      } else {
        const res = await fetch('/api/create-user', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(form)
        })
        const data = await res.json()
        if (!res.ok) throw new Error(data.error || 'Failed to create user')
        setSuccess(`✓ User created. Temporary password: ${form.password} — share this directly with them.`)
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
          <button className="btn btn-primary" onClick={() => { setShowAdd(!showAdd); setEditingId(null); setForm(emptyForm); setError(''); setSuccess('')
