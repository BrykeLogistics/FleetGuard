'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

interface Props {
  inspectionId: string
  truckId: string
  onSubmitted: () => void
}

export default function DamageFeedback({ inspectionId, truckId, onSubmitted }: Props) {
  const [open, setOpen] = useState(false)
  const [location, setLocation] = useState('')
  const [description, setDescription] = useState('')
  const [severity, setSeverity] = useState('minor')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Save as a damage with is_new flag and feedback source marker
    await supabase.from('damages').insert({
      inspection_id: inspectionId,
      truck_id: truckId,
      severity,
      location,
      description,
      recommendation: 'Flagged by manager — missed by AI inspection',
      is_new: true,
      user_id: user.id,
    })

    // Also save to feedback table for prompt improvement tracking
    await supabase.from('damage_feedback').insert({
      inspection_id: inspectionId,
      truck_id: truckId,
      location,
      description,
      severity,
      user_id: user.id,
    }).maybeSingle()

    setSaving(false)
    setSaved(true)
    setLocation(''); setDescription(''); setSeverity('minor')
    setTimeout(() => { setSaved(false); setOpen(false); onSubmitted() }, 1500)
  }

  if (saved) return (
    <div style={{ padding:'10px 14px', background:'#EAF3DE', borderRadius:8, fontSize:13, color:'#27500A', marginTop:10 }}>
      ✓ Damage reported and added to inspection record
    </div>
  )

  return (
    <div style={{ marginTop:12 }}>
      {!open ? (
        <button onClick={() => setOpen(true)} style={{ background:'none', border:'0.5px solid rgba(0,0,0,0.15)', borderRadius:8, padding:'7px 14px', fontSize:12, color:'#888', cursor:'pointer', display:'flex', alignItems:'center', gap:6 }}>
          ⚑ Report missed damage
        </button>
      ) : (
        <div style={{ border:'0.5px solid rgba(200,100,0,0.3)', borderRadius:10, padding:'14px', background:'#FAEEDA', marginTop:8 }}>
          <div style={{ fontSize:13, fontWeight:500, color:'#633806', marginBottom:10 }}>Report damage AI missed</div>
          <form onSubmit={submit}>
            <div style={{ marginBottom:8 }}>
              <label style={{ fontSize:12, color:'#854F0B' }}>Location on vehicle *</label>
              <input value={location} onChange={e => setLocation(e.target.value)} placeholder="e.g. Driver side rear quarter panel" required style={{ marginTop:4 }} />
            </div>
            <div style={{ marginBottom:8 }}>
              <label style={{ fontSize:12, color:'#854F0B' }}>Description *</label>
              <textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Describe the damage in detail — size, type, severity..." rows={3} required style={{ marginTop:4 }} />
            </div>
            <div style={{ marginBottom:12 }}>
              <label style={{ fontSize:12, color:'#854F0B' }}>Severity</label>
              <select value={severity} onChange={e => setSeverity(e.target.value)} style={{ marginTop:4 }}>
                <option value="minor">Minor — small scratch, scuff, chip</option>
                <option value="moderate">Moderate — dent, deep scratch, cracked lens</option>
                <option value="critical">Critical — structural, safety concern, major collision</option>
              </select>
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <button type="submit" disabled={saving} style={{ padding:'8px 16px', background:'#854F0B', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer' }}>
                {saving ? 'Saving...' : 'Submit report'}
              </button>
              <button type="button" onClick={() => setOpen(false)} style={{ padding:'8px 14px', background:'transparent', border:'0.5px solid rgba(0,0,0,0.15)', borderRadius:8, fontSize:13, cursor:'pointer', color:'#555' }}>Cancel</button>
            </div>
          </form>
        </div>
      )}
    </div>
  )
}
