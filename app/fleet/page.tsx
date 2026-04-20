'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'
import Link from 'next/link'

export default function FleetPage() {
  const [trucks, setTrucks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({ truck_number:'', driver_name:'', make:'', model:'', year:'', license_plate:'' })
  const [saving, setSaving] = useState(false)

  useEffect(() => { loadTrucks() }, [])

  async function loadTrucks() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('trucks').select('*, inspections(id, created_at, overall_condition, follow_up_required)').eq('user_id', user.id).order('created_at')
    setTrucks(data || [])
    setLoading(false)
  }

  async function addTruck(e: React.FormEvent) {
    e.preventDefault()
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    await supabase.from('trucks').insert({ ...form, year: parseInt(form.year) || 0, user_id: user.id })
    setForm({ truck_number:'', driver_name:'', make:'', model:'', year:'', license_plate:'' })
    setShowAdd(false)
    setSaving(false)
    loadTrucks()
  }

  async function deleteTruck(id: string) {
    if (!confirm('Delete this truck and all its inspection records?')) return
    await supabase.from('trucks').delete().eq('id', id)
    loadTrucks()
  }

  function lastInspection(truck: any) {
    const insps = truck.inspections || []
    if (insps.length === 0) return null
    return insps.sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0]
  }

  function truckStatus(truck: any) {
    const last = lastInspection(truck)
    if (!last) return { label: 'Never inspected', cls: 'badge-gray' }
    if (last.follow_up_required) return { label: 'Follow-up needed', cls: 'badge-red' }
    if (last.overall_condition === 'Critical' || last.overall_condition === 'Poor') return { label: 'Damage found', cls: 'badge-red' }
    if (last.overall_condition === 'Fair') return { label: 'Minor issues', cls: 'badge-amber' }
    return { label: 'All clear', cls: 'badge-green' }
  }

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:600 }}>Fleet</div>
            <div style={{ fontSize:13, color:'#888', marginTop:2 }}>{trucks.length} truck{trucks.length !== 1 ? 's' : ''}</div>
          </div>
          <button className="btn btn-primary" onClick={() => setShowAdd(!showAdd)}>+ Add truck</button>
        </div>

        {/* Add truck form */}
        {showAdd && (
          <div className="card" style={{ padding:'20px', marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:500, marginBottom:16 }}>Add new truck</div>
            <form onSubmit={addTruck}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div><label>Truck number *</label><input value={form.truck_number} onChange={e => setForm({...form, truck_number:e.target.value})} placeholder="e.g. TK-001" required /></div>
                <div><label>Driver name *</label><input value={form.driver_name} onChange={e => setForm({...form, driver_name:e.target.value})} placeholder="e.g. Carlos Martinez" required /></div>
                <div><label>Make</label><input value={form.make} onChange={e => setForm({...form, make:e.target.value})} placeholder="e.g. Freightliner" /></div>
                <div><label>Model</label><input value={form.model} onChange={e => setForm({...form, model:e.target.value})} placeholder="e.g. Cascadia" /></div>
                <div><label>Year</label><input value={form.year} onChange={e => setForm({...form, year:e.target.value})} placeholder="e.g. 2021" type="number" /></div>
                <div><label>License plate</label><input value={form.license_plate} onChange={e => setForm({...form, license_plate:e.target.value})} placeholder="e.g. ABC-1234" /></div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : 'Save truck'}</button>
                <button type="button" className="btn" onClick={() => setShowAdd(false)}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {/* Trucks grid */}
        {loading && <div style={{ textAlign:'center', padding:'40px', color:'#888', fontSize:13 }}>Loading...</div>}
        {!loading && trucks.length === 0 && !showAdd && (
          <div className="card" style={{ padding:'48px', textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:14, marginBottom:8 }}>No trucks yet</div>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Add your first truck</button>
          </div>
        )}

        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:12 }}>
          {trucks.map(truck => {
            const status = truckStatus(truck)
            const last = lastInspection(truck)
            return (
              <div key={truck.id} className="card" style={{ padding:'16px' }}>
                <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                  <div>
                    <div style={{ fontSize:15, fontWeight:600 }}>#{truck.truck_number}</div>
                    <div style={{ fontSize:13, color:'#555', marginTop:2 }}>{truck.driver_name}</div>
                  </div>
                  <span className={`badge ${status.cls}`}>{status.label}</span>
                </div>
                {(truck.make || truck.model) && (
                  <div style={{ fontSize:12, color:'#888', marginBottom:6 }}>{[truck.year, truck.make, truck.model].filter(Boolean).join(' ')}</div>
                )}
                {truck.license_plate && <div style={{ fontSize:12, color:'#888', marginBottom:8 }}>Plate: {truck.license_plate}</div>}
                <div style={{ fontSize:12, color:'#aaa', marginBottom:12 }}>
                  {last ? `Last inspected: ${new Date(last.created_at).toLocaleDateString()}` : 'No inspections yet'}
                </div>
                <div style={{ display:'flex', gap:6 }}>
                  <Link href={`/inspect?truck=${truck.id}`} className="btn" style={{ flex:1, justifyContent:'center', fontSize:12, padding:'6px 10px' }}>Inspect</Link>
                  <Link href={`/reports?truck=${truck.id}`} className="btn" style={{ flex:1, justifyContent:'center', fontSize:12, padding:'6px 10px' }}>History</Link>
                  <button onClick={() => deleteTruck(truck.id)} style={{ padding:'6px 10px', borderRadius:7, border:'0.5px solid rgba(200,0,0,0.2)', background:'transparent', color:'#A32D2D', cursor:'pointer', fontSize:12 }}>Delete</button>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
