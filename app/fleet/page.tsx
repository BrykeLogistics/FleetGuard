'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'
import Link from 'next/link'

const emptyForm = { truck_number:'', driver_name:'', make:'', model:'', year:'', license_plate:'', vin:'', vehicle_type:'' }

export default function FleetPage() {
  const [trucks, setTrucks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'grid'|'list'>('grid')
  const [showAdd, setShowAdd] = useState(false)
  const [editingId, setEditingId] = useState<string|null>(null)
  const [form, setForm] = useState(emptyForm)
  const [saving, setSaving] = useState(false)
  const [vinLoading, setVinLoading] = useState(false)
  const [vinMessage, setVinMessage] = useState('')
  const [selectedTruck, setSelectedTruck] = useState<any>(null)
  const [truckDetail, setTruckDetail] = useState<{inspections:any[], damages:any[], photos:any[]}>({ inspections:[], damages:[], photos:[] })
  const [loadingDetail, setLoadingDetail] = useState(false)
  const [photoUrls, setPhotoUrls] = useState<{[key:string]:string}>({})

  useEffect(() => { loadTrucks() }, [])

  async function loadTrucks() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('trucks').select('*, inspections(id, created_at, overall_condition, follow_up_required, is_baseline)').eq('user_id', user.id).order('truck_number')
    setTrucks(data || [])
    setLoading(false)
  }

  async function openTruck(truck: any) {
    setSelectedTruck(truck)
    setLoadingDetail(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [inspRes, dmgRes, photoRes] = await Promise.all([
      supabase.from('inspections').select('*').eq('truck_id', truck.id).order('created_at', { ascending: false }),
      supabase.from('damages').select('*, inspections(created_at, inspection_type)').eq('truck_id', truck.id).order('created_at', { ascending: false }),
      supabase.from('inspection_photos').select('*').eq('truck_id', truck.id).order('created_at', { ascending: false }).limit(20),
    ])
    setTruckDetail({ inspections: inspRes.data || [], damages: dmgRes.data || [], photos: photoRes.data || [] })

    // Load photo URLs
    const urls: {[key:string]:string} = {}
    for (const p of (photoRes.data || [])) {
      const { data } = await supabase.storage.from('inspection-photos').createSignedUrl(p.storage_path, 3600)
      if (data?.signedUrl) urls[p.id] = data.signedUrl
    }
    setPhotoUrls(urls)
    setLoadingDetail(false)
  }

  function closeTruck() { setSelectedTruck(null); setTruckDetail({ inspections:[], damages:[], photos:[] }); setPhotoUrls({}) }

  async function lookupVin(vin: string) {
    if (!vin || vin.length < 11) { setVinMessage('Enter at least 11 characters of the VIN'); return }
    setVinLoading(true); setVinMessage('')
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`)
      const data = await res.json()
      const results = data.Results || []
      const get = (var_: string) => results.find((r: any) => r.Variable === var_)?.Value || ''
      const make = get('Make')
      const model = get('Model')
      const year = get('Model Year')
      const bodyClass = get('Body Class') || ''
      const gvwr = get('Gross Vehicle Weight Rating From') || ''

      // Detect vehicle type from NHTSA body class
      let vehicle_type = ''
      const body = bodyClass.toLowerCase()
      const gvwrNum = parseInt(gvwr.replace(/[^0-9]/g, '')) || 0
      if (body.includes('van') && (body.includes('cargo') || body.includes('delivery') || model.toLowerCase().includes('sprinter') || model.toLowerCase().includes('transit') || model.toLowerCase().includes('promaster'))) {
        vehicle_type = 'sprinter'
      } else if (body.includes('step van') || body.includes('walk-in') || body.includes('walk in')) {
        vehicle_type = 'stepvan'
      } else if (body.includes('truck') && (body.includes('box') || body.includes('straight') || gvwrNum >= 10000)) {
        vehicle_type = 'boxtruck'
      } else if (body.includes('van')) {
        vehicle_type = 'sprinter'
      } else if (gvwrNum >= 26000) {
        vehicle_type = 'boxtruck'
      } else if (gvwrNum >= 10000) {
        vehicle_type = 'stepvan'
      }

      if (make && make !== 'Not Applicable') {
        setForm(prev => ({
          ...prev,
          make: make !== 'Not Applicable' ? make : prev.make,
          model: model !== 'Not Applicable' ? model : prev.model,
          year: year !== 'Not Applicable' ? year : prev.year,
          vehicle_type: vehicle_type || prev.vehicle_type,
        }))
        const typeLabel = vehicle_type === 'sprinter' ? 'Sprinter/Cargo Van' : vehicle_type === 'stepvan' ? 'Step Van' : vehicle_type === 'boxtruck' ? 'Box Truck' : ''
        setVinMessage(`✓ Found: ${year} ${make} ${model}${typeLabel ? ` · ${typeLabel}` : ''} — review and confirm below`)
      } else {
        setVinMessage('VIN not found — please fill in details manually')
      }
    } catch {
      setVinMessage('Lookup failed — please fill in details manually')
    }
    setVinLoading(false)
  }

  function startEdit(truck: any) {
    setEditingId(truck.id)
    setForm({ truck_number: truck.truck_number, driver_name: truck.driver_name, make: truck.make||'', model: truck.model||'', year: truck.year?.toString()||'', license_plate: truck.license_plate||'', vin: truck.vin||'', vehicle_type: truck.vehicle_type||'' })
    setShowAdd(false)
    setSelectedTruck(null)
  }

  function cancelEdit() { setEditingId(null); setForm(emptyForm); setShowAdd(false) }

  async function saveTruck(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    if (editingId) {
      await supabase.from('trucks').update({ ...form, year: parseInt(form.year)||0 }).eq('id', editingId)
      setEditingId(null)
    } else {
      await supabase.from('trucks').insert({ ...form, year: parseInt(form.year)||0, user_id: user.id })
      setShowAdd(false)
    }
    setForm(emptyForm); setSaving(false); loadTrucks()
  }

  async function deleteTruck(id: string) {
    if (!confirm('Delete this truck and all its inspection records?')) return
    await supabase.from('trucks').delete().eq('id', id)
    setSelectedTruck(null); loadTrucks()
  }

  function lastInspection(truck: any) {
    const insps = (truck.inspections || []).sort((a:any,b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    return insps[0] || null
  }

  function truckStatus(truck: any) {
    const last = lastInspection(truck)
    if (!last) return { label:'Never inspected', cls:'badge-gray' }
    if (last.follow_up_required) return { label:'Follow-up needed', cls:'badge-red' }
    if (last.overall_condition === 'Critical' || last.overall_condition === 'Poor') return { label:'Damage found', cls:'badge-red' }
    if (last.overall_condition === 'Fair') return { label:'Minor issues', cls:'badge-amber' }
    return { label:'All clear', cls:'badge-green' }
  }

  const condColor = (c:string) => c==='Good'?'#27500A':(c==='Critical'||c==='Poor')?'#A32D2D':c==='Fair'?'#633806':'#555'
  const condBadge = (c:string) => c==='Good'?'badge-green':(c==='Critical'||c==='Poor')?'badge-red':c==='Fair'?'badge-amber':'badge-gray'
  const sevDot = (s:string) => s==='critical'?'#E24B4A':s==='moderate'?'#EF9F27':'#639922'
  const showForm = showAdd || editingId !== null

  // ── Truck detail panel ──────────────────────────────────────────
  if (selectedTruck) {
    const { inspections, damages, photos } = truckDetail
    const newDamages = damages.filter(d => d.is_new)
    const baselineInsp = inspections.find(i => i.is_baseline)
    const lastInsp = inspections[0]
    return (
      <div>
        <Navbar />
        <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px' }}>
          {/* Back */}
          <button onClick={closeTruck} style={{ background:'none', border:'none', color:'#185FA5', cursor:'pointer', fontSize:13, marginBottom:16, padding:0, display:'flex', alignItems:'center', gap:4 }}>← Back to fleet</button>

          {/* Truck header */}
          <div className="card" style={{ padding:'20px', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ fontSize:22, fontWeight:700 }}>#{selectedTruck.truck_number}</div>
                <div style={{ fontSize:15, color:'#555', marginTop:2 }}>{selectedTruck.driver_name}</div>
                <div style={{ fontSize:13, color:'#888', marginTop:4 }}>{[selectedTruck.year, selectedTruck.make, selectedTruck.model].filter(Boolean).join(' ')}</div>
                {selectedTruck.license_plate && <div style={{ fontSize:13, color:'#888', marginTop:2 }}>Plate: {selectedTruck.license_plate}</div>}
                {selectedTruck.vin && <div style={{ fontSize:12, color:'#888', marginTop:2, fontFamily:'monospace', letterSpacing:'0.04em' }}>VIN: {selectedTruck.vin}</div>}
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <Link href={`/inspect?truck=${selectedTruck.id}`} className="btn btn-primary" style={{ fontSize:13 }}>+ New inspection</Link>
                <button className="btn" onClick={() => startEdit(selectedTruck)} style={{ fontSize:13 }}>Edit truck</button>
                <button onClick={() => deleteTruck(selectedTruck.id)} style={{ padding:'8px 14px', borderRadius:7, border:'0.5px solid rgba(200,0,0,0.2)', background:'transparent', color:'#A32D2D', cursor:'pointer', fontSize:13 }}>Delete</button>
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px,1fr))', gap:10, marginTop:16 }}>
              {[
                { label:'Total inspections', value: inspections.length },
                { label:'New damages', value: newDamages.length, color: newDamages.length > 0 ? '#A32D2D' : '#27500A' },
                { label:'Total damages', value: damages.length },
                { label:'Last inspection', value: lastInsp ? new Date(lastInsp.created_at).toLocaleDateString() : 'Never' },
              ].map(s => (
                <div key={s.label} style={{ background:'#f7f7f6', borderRadius:8, padding:'12px' }}>
                  <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:16, fontWeight:600, color: s.color || '#1a1a1a' }}>{loadingDetail ? '—' : s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {loadingDetail && <div style={{ textAlign:'center', padding:'40px', color:'#888', fontSize:13 }}>Loading truck history...</div>}

          {!loadingDetail && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>

              {/* Photos */}
              <div className="card" style={{ padding:'16px', gridColumn:'1/-1' }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Inspection photos ({photos.length})</div>
                {photos.length === 0 ? (
                  <div style={{ color:'#aaa', fontSize:13, padding:'20px 0', textAlign:'center' }}>No photos yet — run an inspection to capture photos</div>
                ) : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px,1fr))', gap:8 }}>
                    {photos.map(p => (
                      <div key={p.id} style={{ position:'relative' }}>
                        {photoUrls[p.id] ? (
                          <img src={photoUrls[p.id]} style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.1)', cursor:'pointer' }} onClick={() => window.open(photoUrls[p.id], '_blank')} />
                        ) : (
                          <div style={{ width:'100%', aspectRatio:'4/3', background:'#f0efed', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#aaa' }}>Loading...</div>
                        )}
                        <div style={{ fontSize:10, color:'#aaa', marginTop:3, textAlign:'center' }}>{new Date(p.created_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Inspection history */}
              <div className="card" style={{ padding:'16px' }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Inspection history ({inspections.length})</div>
                {inspections.length === 0 ? (
                  <div style={{ color:'#aaa', fontSize:13, padding:'16px 0', textAlign:'center' }}>No inspections yet</div>
                ) : inspections.map(insp => (
                  <div key={insp.id} style={{ padding:'10px 0', borderBottom:'0.5px solid rgba(0,0,0,0.07)', display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                    <div>
                      <div style={{ fontSize:13, fontWeight:500 }}>{insp.inspection_type} {insp.is_baseline && <span style={{ fontSize:10, background:'#E6F1FB', color:'#0C447C', padding:'1px 5px', borderRadius:8, marginLeft:4 }}>baseline</span>}</div>
                      <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{new Date(insp.created_at).toLocaleDateString()} · {insp.inspector_name}</div>
                      {insp.summary && <div style={{ fontSize:11, color:'#555', marginTop:3, lineHeight:1.5 }}>{insp.summary}</div>}
                    </div>
                    <span className={`badge ${condBadge(insp.overall_condition)}`} style={{ flexShrink:0 }}>{insp.overall_condition}</span>
                  </div>
                ))}
              </div>

              {/* Damage log */}
              <div className="card" style={{ padding:'16px' }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Damage log ({damages.length})</div>
                {damages.length === 0 ? (
                  <div style={{ color:'#aaa', fontSize:13, padding:'16px 0', textAlign:'center' }}>No damage recorded</div>
                ) : damages.map(d => (
                  <div key={d.id} style={{ display:'flex', gap:8, padding:'10px 0', borderBottom:'0.5px solid rgba(0,0,0,0.07)' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background: sevDot(d.severity), marginTop:4, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{d.location} {d.is_new && <span style={{ fontSize:10, background:'#FCEBEB', color:'#A32D2D', padding:'1px 5px', borderRadius:8, marginLeft:4 }}>NEW</span>}</div>
                      <div style={{ fontSize:11, color:'#555', marginTop:2 }}>{d.description}</div>
                      {d.recommendation && <div style={{ fontSize:11, color:'#185FA5', marginTop:2 }}>→ {d.recommendation}</div>}
                      <div style={{ fontSize:10, color:'#aaa', marginTop:2 }}>{new Date((d.inspections as any)?.created_at).toLocaleDateString()} · {(d.inspections as any)?.inspection_type}</div>
                    </div>
                  </div>
                ))}
              </div>

            </div>
          )}
        </div>
      </div>
    )
  }

  // ── Fleet list/grid view ────────────────────────────────────────
  return (
    <div>
      <Navbar />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px' }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:600 }}>Fleet</div>
            <div style={{ fontSize:13, color:'#888', marginTop:2 }}>{trucks.length} truck{trucks.length !== 1 ? 's' : ''}</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            {/* View toggle */}
            <div style={{ display:'flex', border:'0.5px solid rgba(0,0,0,0.15)', borderRadius:8, overflow:'hidden' }}>
              <button onClick={() => setViewMode('grid')} style={{ padding:'7px 12px', background: viewMode==='grid' ? '#185FA5' : 'white', color: viewMode==='grid' ? 'white' : '#555', border:'none', cursor:'pointer', fontSize:13 }}>⊞ Grid</button>
              <button onClick={() => setViewMode('list')} style={{ padding:'7px 12px', background: viewMode==='list' ? '#185FA5' : 'white', color: viewMode==='list' ? 'white' : '#555', border:'none', cursor:'pointer', fontSize:13, borderLeft:'0.5px solid rgba(0,0,0,0.15)' }}>☰ List</button>
            </div>
            <button className="btn btn-primary" onClick={() => { setShowAdd(!showAdd); setEditingId(null); setForm(emptyForm) }}>+ Add truck</button>
          </div>
        </div>

        {/* Add/Edit form */}
        {showForm && (
          <div className="card" style={{ padding:'20px', marginBottom:16, border: editingId ? '1.5px solid #185FA5' : undefined }}>
            <div style={{ fontSize:14, fontWeight:500, marginBottom:16 }}>{editingId ? 'Edit truck' : 'Add new truck'}</div>
            <form onSubmit={saveTruck}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
                <div><label>Truck number *</label><input value={form.truck_number} onChange={e => setForm({...form, truck_number:e.target.value})} placeholder="e.g. TK-001" required /></div>
                <div><label>Driver name *</label><input value={form.driver_name} onChange={e => setForm({...form, driver_name:e.target.value})} placeholder="e.g. Carlos Martinez" required /></div>
                <div><label>Make</label><input value={form.make} onChange={e => setForm({...form, make:e.target.value})} placeholder="e.g. Freightliner" /></div>
                <div><label>Model</label><input value={form.model} onChange={e => setForm({...form, model:e.target.value})} placeholder="e.g. Cascadia" /></div>
                <div><label>Year</label><input value={form.year} onChange={e => setForm({...form, year:e.target.value})} placeholder="e.g. 2021" type="number" /></div>
                <div><label>License plate</label><input value={form.license_plate} onChange={e => setForm({...form, license_plate:e.target.value})} placeholder="e.g. ABC-1234" /></div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label>VIN</label>
                  <div style={{ display:'flex', gap:8 }}>
                    <input value={form.vin} onChange={e => { setForm({...form, vin:e.target.value.toUpperCase()}); setVinMessage('') }} placeholder="17-character VIN" maxLength={17} style={{ textTransform:'uppercase', fontFamily:'monospace', letterSpacing:'0.05em', flex:1 }} />
                    <button type="button" onClick={() => lookupVin(form.vin)} disabled={vinLoading} style={{ padding:'8px 14px', background:'#185FA5', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', flexShrink:0, opacity: vinLoading ? 0.7 : 1 }}>
                      {vinLoading ? 'Looking up...' : 'Look up VIN'}
                    </button>
                  </div>
                  {vinMessage && <div style={{ fontSize:12, marginTop:5, color: vinMessage.startsWith('✓') ? '#27500A' : '#A32D2D' }}>{vinMessage}</div>}
                </div>
                <div style={{ gridColumn:'1/-1' }}>
                  <label>Vehicle type</label>
                  <select value={form.vehicle_type} onChange={e => setForm({...form, vehicle_type:e.target.value})}>
                    <option value="">— select vehicle type —</option>
                    <option value="sprinter">Sprinter / Cargo Van (e.g. Mercedes Sprinter, Ford Transit, Ram ProMaster)</option>
                    <option value="stepvan">Step Van / Walk-in Van (e.g. Grumman, Utilimaster, P-series)</option>
                    <option value="boxtruck">Box Truck / Straight Truck (e.g. Freightliner M2, Isuzu NPR)</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'flex', gap:8 }}>
                <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Save truck'}</button>
                <button type="button" className="btn" onClick={cancelEdit}>Cancel</button>
              </div>
            </form>
          </div>
        )}

        {loading && <div style={{ textAlign:'center', padding:'40px', color:'#888', fontSize:13 }}>Loading...</div>}
        {!loading && trucks.length === 0 && !showForm && (
          <div className="card" style={{ padding:'48px', textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:14, marginBottom:8 }}>No trucks yet</div>
            <button className="btn btn-primary" onClick={() => setShowAdd(true)}>Add your first truck</button>
          </div>
        )}

        {/* GRID VIEW */}
        {viewMode === 'grid' && (
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:12 }}>
            {trucks.map(truck => {
              const status = truckStatus(truck)
              const last = lastInspection(truck)
              const isEditing = editingId === truck.id
              return (
                <div key={truck.id} className="card" style={{ padding:'16px', cursor:'pointer', border: isEditing ? '1.5px solid #185FA5' : undefined, transition:'border-color 0.15s' }} onClick={() => !showForm && openTruck(truck)}>
                  <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:10 }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:600 }}>#{truck.truck_number}</div>
                      <div style={{ fontSize:13, color:'#555', marginTop:2 }}>{truck.driver_name}</div>
                    </div>
                    <span className={`badge ${status.cls}`}>{status.label}</span>
                  </div>
                  {(truck.make || truck.model) && <div style={{ fontSize:12, color:'#888', marginBottom:4 }}>{[truck.year, truck.make, truck.model].filter(Boolean).join(' ')}</div>}
                  {truck.license_plate && <div style={{ fontSize:12, color:'#888', marginBottom:2 }}>Plate: {truck.license_plate}</div>}
                  {truck.vin && <div style={{ fontSize:11, color:'#aaa', marginBottom:8, fontFamily:'monospace' }}>VIN: {truck.vin}</div>}
                  <div style={{ fontSize:12, color:'#aaa', marginBottom:12 }}>{last ? `Last inspected: ${new Date(last.created_at).toLocaleDateString()}` : 'No inspections yet'}</div>
                  <div style={{ display:'flex', gap:6 }} onClick={e => e.stopPropagation()}>
                    <Link href={`/inspect?truck=${truck.id}`} className="btn" style={{ flex:1, justifyContent:'center', fontSize:12, padding:'6px 10px' }}>Inspect</Link>
                    <button onClick={() => startEdit(truck)} style={{ padding:'6px 10px', borderRadius:7, border:'0.5px solid rgba(0,0,0,0.15)', background:'transparent', color:'#185FA5', cursor:'pointer', fontSize:12 }}>Edit</button>
                    <button onClick={() => deleteTruck(truck.id)} style={{ padding:'6px 10px', borderRadius:7, border:'0.5px solid rgba(200,0,0,0.2)', background:'transparent', color:'#A32D2D', cursor:'pointer', fontSize:12 }}>Delete</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {/* LIST VIEW */}
        {viewMode === 'list' && (
          <div className="card" style={{ overflow:'hidden' }}>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto auto', gap:0, padding:'10px 16px', background:'#f7f7f6', borderBottom:'0.5px solid rgba(0,0,0,0.08)', fontSize:11, fontWeight:500, color:'#888', textTransform:'uppercase', letterSpacing:'0.05em' }}>
              <span>Truck</span><span>Driver</span><span>Last inspection</span><span>Status</span><span></span>
            </div>
            {trucks.map((truck, i) => {
              const status = truckStatus(truck)
              const last = lastInspection(truck)
              return (
                <div key={truck.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto auto', gap:0, padding:'12px 16px', borderBottom: i < trucks.length-1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none', alignItems:'center', cursor:'pointer', background:'white', transition:'background 0.1s' }}
                  onMouseEnter={e => (e.currentTarget.style.background='#f9f9f8')}
                  onMouseLeave={e => (e.currentTarget.style.background='white')}
                  onClick={() => openTruck(truck)}>
                  <div>
                    <div style={{ fontSize:13, fontWeight:600 }}>#{truck.truck_number}</div>
                    {truck.vin && <div style={{ fontSize:11, color:'#aaa', fontFamily:'monospace' }}>{truck.vin}</div>}
                  {truck.vehicle_type && <div style={{ fontSize:10, color:'#888', marginTop:2 }}>{truck.vehicle_type==='sprinter'?'Sprinter Van':truck.vehicle_type==='stepvan'?'Step Van':truck.vehicle_type==='boxtruck'?'Box Truck':'Other'}</div>}
                  </div>
                  <div style={{ fontSize:13, color:'#555' }}>{truck.driver_name}</div>
                  <div style={{ fontSize:12, color:'#888' }}>{last ? new Date(last.created_at).toLocaleDateString() : 'Never'}</div>
                  <span className={`badge ${status.cls}`}>{status.label}</span>
                  <div style={{ display:'flex', gap:4, marginLeft:8 }} onClick={e => e.stopPropagation()}>
                    <Link href={`/inspect?truck=${truck.id}`} className="btn" style={{ fontSize:11, padding:'4px 10px' }}>Inspect</Link>
                    <button onClick={() => startEdit(truck)} style={{ padding:'4px 10px', borderRadius:6, border:'0.5px solid rgba(0,0,0,0.15)', background:'transparent', color:'#185FA5', cursor:'pointer', fontSize:11 }}>Edit</button>
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}
