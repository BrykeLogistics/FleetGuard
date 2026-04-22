'use client'
import { useEffect, useState, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'
import Link from 'next/link'
import DamageFeedback from '../components/DamageFeedback'
import PhotoLightbox from '../components/PhotoLightbox'

const emptyForm = { truck_number:'', driver_name:'', make:'', model:'', year:'', license_plate:'', vin:'', vehicle_type:'', csa:'', fleet_type:'owned', rental_company:'', rental_contract:'', rental_start:'', rental_end:'' }

// ── Helpers ────────────────────────────────────────────────────────
function lastInspection(truck: any) {
  return (truck.inspections||[]).sort((a:any,b:any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] || null
}
function truckStatus(truck: any) {
  const last = lastInspection(truck)
  if (!last) return { label:'Never inspected', cls:'badge-gray' }
  if (last.follow_up_required) return { label:'Follow-up needed', cls:'badge-red' }
  if (last.overall_condition === 'Critical' || last.overall_condition === 'Poor') return { label:'Damage found', cls:'badge-red' }
  if (last.overall_condition === 'Fair') return { label:'Minor issues', cls:'badge-amber' }
  return { label:'All clear', cls:'badge-green' }
}
const condBadge = (c:string) => c==='Good'?'badge-green':(c==='Critical'||c==='Poor')?'badge-red':c==='Fair'?'badge-amber':'badge-gray'
const sevDot = (s:string) => s==='critical'?'#E24B4A':s==='moderate'?'#EF9F27':'#639922'
const vtLabel = (v:string) => v==='sprinter'?'Sprinter Van':v==='stepvan'?'Step Van':v==='boxtruck'?'Box Truck':''
const vtColor = (v:string) => v==='sprinter'?{bg:'#EAF3DE',color:'#27500A'}:v==='stepvan'?{bg:'#E6F1FB',color:'#0C447C'}:{bg:'#FAEEDA',color:'#633806'}

// ── TruckCard ──────────────────────────────────────────────────────
function TruckCard({ truck, editingId, showForm, onOpen, onEdit, onDelete, onInspect }: any) {
  const status = truckStatus(truck)
  const last = lastInspection(truck)
  const isEditing = editingId === truck.id
  const vt = vtColor(truck.vehicle_type)
  return (
    <div className="card" style={{ padding:'16px', cursor:'pointer', border: isEditing ? '1.5px solid #185FA5' : undefined }} onClick={() => !showForm && onOpen(truck)}>
      <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', marginBottom:8 }}>
        <div>
          <div style={{ display:'flex', alignItems:'center', gap:6 }}>
            <div style={{ fontSize:15, fontWeight:600 }}>#{truck.truck_number}</div>
            {truck.fleet_type === 'rental' && <span style={{ background:'#FAEEDA', color:'#633806', fontSize:10, fontWeight:600, padding:'1px 6px', borderRadius:10 }}>Rental</span>}
          </div>
          <div style={{ fontSize:13, color:'#555', marginTop:2 }}>{truck.driver_name}</div>
        </div>
        <span className={`badge ${status.cls}`}>{status.label}</span>
      </div>
      {(truck.make||truck.model) && <div style={{ fontSize:12, color:'#888', marginBottom:3 }}>{[truck.year,truck.make,truck.model].filter(Boolean).join(' ')}</div>}
      {truck.vehicle_type && <div style={{ marginBottom:4 }}><span style={{ background:vt.bg, color:vt.color, fontSize:10, fontWeight:500, padding:'2px 7px', borderRadius:10 }}>{vtLabel(truck.vehicle_type)}</span></div>}
      {truck.csa && <div style={{ fontSize:11, color:'#888', marginBottom:3 }}>📍 {truck.csa}</div>}
      {truck.license_plate && <div style={{ fontSize:11, color:'#888', marginBottom:2 }}>Plate: {truck.license_plate}</div>}
      {truck.vin && <div style={{ fontSize:10, color:'#aaa', marginBottom:6, fontFamily:'monospace' }}>{truck.vin}</div>}
      <div style={{ fontSize:11, color:'#aaa', marginBottom:10 }}>{last ? `Last inspected: ${new Date(last.created_at).toLocaleDateString()}` : 'No inspections yet'}</div>
      <div style={{ display:'flex', gap:5 }} onClick={e => e.stopPropagation()}>
        <button onClick={() => onInspect(truck.id)} className="btn" style={{ flex:1, justifyContent:'center', fontSize:11, padding:'5px 8px' }}>Inspect</button>
        <button onClick={() => onEdit(truck)} style={{ padding:'5px 10px', borderRadius:7, border:'0.5px solid rgba(0,0,0,0.15)', background:'transparent', color:'#185FA5', cursor:'pointer', fontSize:11 }}>Edit</button>
        <button onClick={() => onDelete(truck.id)} style={{ padding:'5px 10px', borderRadius:7, border:'0.5px solid rgba(200,0,0,0.2)', background:'transparent', color:'#A32D2D', cursor:'pointer', fontSize:11 }}>Delete</button>
      </div>
    </div>
  )
}

// ── ListTable ──────────────────────────────────────────────────────
function ListTable({ trucks, onOpen, onEdit }: any) {
  return (
    <div className="card" style={{ overflow:'hidden' }}>
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto auto', padding:'10px 16px', background:'#f7f7f6', borderBottom:'0.5px solid rgba(0,0,0,0.08)', fontSize:11, fontWeight:500, color:'#888', textTransform:'uppercase', letterSpacing:'0.05em' }}>
        <span>Truck</span><span>Driver</span><span>CSA / Last inspected</span><span>Status</span><span></span>
      </div>
      {trucks.map((truck: any, i: number) => {
        const status = truckStatus(truck)
        const last = lastInspection(truck)
        return (
          <div key={truck.id} style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr auto auto', padding:'12px 16px', borderBottom: i < trucks.length-1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none', alignItems:'center', cursor:'pointer', background:'white', transition:'background 0.1s' }}
            onMouseEnter={e => (e.currentTarget.style.background='#f9f9f8')}
            onMouseLeave={e => (e.currentTarget.style.background='white')}
            onClick={() => onOpen(truck)}>
            <div>
              <div style={{ fontSize:13, fontWeight:600 }}>#{truck.truck_number} {truck.fleet_type==='rental' && <span style={{ fontSize:10, background:'#FAEEDA', color:'#633806', padding:'1px 5px', borderRadius:8, marginLeft:4 }}>Rental</span>}</div>
              {truck.vin && <div style={{ fontSize:11, color:'#aaa', fontFamily:'monospace' }}>{truck.vin}</div>}
            </div>
            <div style={{ fontSize:13, color:'#555' }}>{truck.driver_name}</div>
            <div style={{ fontSize:12, color:'#888' }}>{truck.csa && <span style={{ color:'#185FA5' }}>{truck.csa} · </span>}{last ? new Date(last.created_at).toLocaleDateString() : 'Never'}</div>
            <span className={`badge ${status.cls}`}>{status.label}</span>
            <div style={{ display:'flex', gap:4, marginLeft:8 }} onClick={e => e.stopPropagation()}>
              <Link href={`/inspect?truck=${truck.id}`} className="btn" style={{ fontSize:11, padding:'4px 10px' }}>Inspect</Link>
              <button onClick={() => onEdit(truck)} style={{ padding:'4px 10px', borderRadius:6, border:'0.5px solid rgba(0,0,0,0.15)', background:'transparent', color:'#185FA5', cursor:'pointer', fontSize:11 }}>Edit</button>
            </div>
          </div>
        )
      })}
    </div>
  )
}

// ── TruckForm — defined OUTSIDE FleetPage so it never remounts on state change ──
interface FormProps {
  form: typeof emptyForm
  setForm: (f: typeof emptyForm) => void
  onSubmit: (e: React.FormEvent) => void
  onCancel: () => void
  saving: boolean
  editingId: string|null
  vinLoading: boolean
  vinMessage: string
  csaList: string[]
  onLookupVin: () => void
}

function TruckForm({ form, setForm, onSubmit, onCancel, saving, editingId, vinLoading, vinMessage, csaList, onLookupVin }: FormProps) {
  const isRental = form.fleet_type === 'rental'
  return (
    <div className="card" style={{ padding:'20px', marginBottom:16, border: editingId ? '1.5px solid #185FA5' : undefined }}>
      <div style={{ fontSize:14, fontWeight:500, marginBottom:16 }}>{editingId ? 'Edit truck' : 'Add new truck'}</div>
      <form onSubmit={onSubmit}>
        {/* Fleet type toggle */}
        <div style={{ display:'flex', gap:8, marginBottom:16 }}>
          <button type="button" onClick={() => setForm({...form, fleet_type:'owned'})} style={{ flex:1, padding:'10px', borderRadius:10, border: form.fleet_type==='owned' ? '2px solid #185FA5' : '0.5px solid rgba(0,0,0,0.15)', background: form.fleet_type==='owned' ? '#E6F1FB' : 'white', cursor:'pointer', fontSize:13, fontWeight:500, color: form.fleet_type==='owned' ? '#0C447C' : '#555' }}>🚛 Owned vehicle</button>
          <button type="button" onClick={() => setForm({...form, fleet_type:'rental'})} style={{ flex:1, padding:'10px', borderRadius:10, border: form.fleet_type==='rental' ? '2px solid #185FA5' : '0.5px solid rgba(0,0,0,0.15)', background: form.fleet_type==='rental' ? '#FAEEDA' : 'white', cursor:'pointer', fontSize:13, fontWeight:500, color: form.fleet_type==='rental' ? '#633806' : '#555' }}>📋 Rental vehicle</button>
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:12 }}>
          <div><label>Truck / unit number *</label><input value={form.truck_number} onChange={e => setForm({...form, truck_number:e.target.value})} placeholder="e.g. TK-001" required /></div>
          <div><label>Driver name *</label><input value={form.driver_name} onChange={e => setForm({...form, driver_name:e.target.value})} placeholder="e.g. Carlos Martinez" required /></div>
          <div><label>CSA / Location</label><input value={form.csa} onChange={e => setForm({...form, csa:e.target.value})} placeholder="e.g. Fort Lauderdale" list="csa-list" /><datalist id="csa-list">{csaList.map(c => <option key={c} value={c} />)}</datalist></div>
          <div><label>Make</label><input value={form.make} onChange={e => setForm({...form, make:e.target.value})} placeholder="e.g. Ford" /></div>
          <div><label>Model</label><input value={form.model} onChange={e => setForm({...form, model:e.target.value})} placeholder="e.g. Transit" /></div>
          <div><label>Year</label><input value={form.year} onChange={e => setForm({...form, year:e.target.value})} placeholder="e.g. 2022" type="number" /></div>
          <div><label>License plate</label><input value={form.license_plate} onChange={e => setForm({...form, license_plate:e.target.value})} placeholder="e.g. ABC-1234" /></div>
          <div>
            <label>Vehicle type</label>
            <select value={form.vehicle_type} onChange={e => setForm({...form, vehicle_type:e.target.value})}>
              <option value="">— select type —</option>
              <option value="sprinter">Sprinter / Cargo Van</option>
              <option value="stepvan">Step Van / Walk-in Van</option>
              <option value="boxtruck">Box Truck / Straight Truck</option>
              <option value="other">Other</option>
            </select>
          </div>
          <div style={{ gridColumn:'1/-1' }}>
            <label>VIN</label>
            <div style={{ display:'flex', gap:8 }}>
              <input value={form.vin} onChange={e => setForm({...form, vin:e.target.value.toUpperCase()})} placeholder="17-character VIN" maxLength={17} style={{ textTransform:'uppercase', fontFamily:'monospace', letterSpacing:'0.05em', flex:1 }} />
              <button type="button" onClick={onLookupVin} disabled={vinLoading} style={{ padding:'8px 14px', background:'#185FA5', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer', flexShrink:0, opacity:vinLoading?0.7:1 }}>{vinLoading ? 'Looking up...' : 'Look up VIN'}</button>
            </div>
            {vinMessage && <div style={{ fontSize:12, marginTop:5, color:vinMessage.startsWith('✓')?'#27500A':'#A32D2D' }}>{vinMessage}</div>}
          </div>
        </div>
        {isRental && (
          <div style={{ background:'#FAEEDA', borderRadius:10, padding:'14px', marginBottom:12 }}>
            <div style={{ fontSize:13, fontWeight:500, color:'#633806', marginBottom:10 }}>Rental details</div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:10 }}>
              <div><label>Rental company</label><input value={form.rental_company} onChange={e => setForm({...form, rental_company:e.target.value})} placeholder="e.g. Penske, Ryder" /></div>
              <div><label>Contract / reservation #</label><input value={form.rental_contract} onChange={e => setForm({...form, rental_contract:e.target.value})} placeholder="Contract number" /></div>
              <div><label>Rental start date</label><input type="date" value={form.rental_start} onChange={e => setForm({...form, rental_start:e.target.value})} /></div>
              <div><label>Expected return date</label><input type="date" value={form.rental_end} onChange={e => setForm({...form, rental_end:e.target.value})} /></div>
            </div>
            <div style={{ fontSize:12, color:'#854F0B', marginTop:10 }}>⚠ Run a baseline inspection immediately to document pre-existing damage.</div>
          </div>
        )}
        <div style={{ display:'flex', gap:8 }}>
          <button type="submit" className="btn btn-primary" disabled={saving}>{saving ? 'Saving...' : editingId ? 'Save changes' : 'Save truck'}</button>
          <button type="button" className="btn" onClick={onCancel}>Cancel</button>
        </div>
      </form>
    </div>
  )
}

// ── Main FleetPage ─────────────────────────────────────────────────
export default function FleetPage() {
  const [trucks, setTrucks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [view, setView] = useState<'owned'|'rental'|'csa'>('owned')
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
  const [csaFilter, setCsaFilter] = useState('all')
  const [lightboxIndex, setLightboxIndex] = useState<number|null>(null)

  const searchParams = useSearchParams()
  useEffect(() => { loadTrucks() }, [])

  async function loadTrucks() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('trucks').select('*, inspections(id, created_at, overall_condition, follow_up_required, is_baseline)').eq('user_id', user.id).order('truck_number')
    setTrucks(data || [])
    setLoading(false)
    // Auto-open truck if ?truck=ID in URL
    const truckId = searchParams.get('truck')
    if (truckId && data) {
      const truck = data.find((t: any) => t.id === truckId)
      if (truck) openTruck(truck)
    }
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
    const urls: {[key:string]:string} = {}
    for (const p of (photoRes.data || [])) {
      const { data } = await supabase.storage.from('inspection-photos').createSignedUrl(p.storage_path, 3600)
      if (data?.signedUrl) urls[p.id] = data.signedUrl
    }
    setPhotoUrls(urls)
    setLoadingDetail(false)
  }

  function closeTruck() { setSelectedTruck(null); setTruckDetail({ inspections:[], damages:[], photos:[] }); setPhotoUrls({}) }

  async function lookupVin() {
    const vin = form.vin
    if (!vin || vin.length < 11) { setVinMessage('Enter at least 11 characters of the VIN'); return }
    setVinLoading(true); setVinMessage('')
    try {
      const res = await fetch(`https://vpic.nhtsa.dot.gov/api/vehicles/decodevin/${vin}?format=json`)
      const data = await res.json()
      const results = data.Results || []
      const get = (var_: string) => results.find((r: any) => r.Variable === var_)?.Value || ''
      const make = get('Make'), model = get('Model'), year = get('Model Year')
      const bodyClass = get('Body Class') || '', gvwr = get('Gross Vehicle Weight Rating From') || ''
      const body = bodyClass.toLowerCase(), modelL = model.toLowerCase()
      const mfr = get('Manufacturer Name').toLowerCase(), trim = get('Trim').toLowerCase(), series = get('Series').toLowerCase()
      const vinUpper = vin.toUpperCase(), wmi = vinUpper.slice(0, 3)
      const gvwrNum = parseInt(gvwr.replace(/[^0-9]/g, '')) || 0
      let vehicle_type = ''
      const stepVanWMI = ['1F6', '5F6', '1GW', '1GX', '5GW']
      const allText = `${body} ${modelL} ${mfr} ${trim} ${series}`
      const stepVanKeywords = ['p700','p800','p900','p1000','p1100','p1200','step van','stepvan','walk-in','walk in','mt45','mt55','mt35','workhorse','p-series','utilimaster','grumman','olson','hackney']
      const sprinterKeywords = ['sprinter','transit connect','transit','promaster','nv cargo','nv200','express cargo','savana cargo','econoline cargo']
      const boxTruckKeywords = ['m2','npr','nqr','ftr','fvr','f650','f750','c7500','c6500','box truck','straight truck','cab-over','cabover','low cab']
      if (stepVanWMI.includes(wmi) || stepVanKeywords.some(k => allText.includes(k))) vehicle_type = 'stepvan'
      else if (sprinterKeywords.some(k => allText.includes(k)) || (body.includes('cargo van') && gvwrNum < 14000)) vehicle_type = 'sprinter'
      else if (boxTruckKeywords.some(k => allText.includes(k)) || body.includes('straight') || gvwrNum >= 26000) vehicle_type = 'boxtruck'
      else if (body.includes('van') && gvwrNum < 14000) vehicle_type = 'sprinter'
      else if (gvwrNum >= 14000 && gvwrNum < 26000) vehicle_type = 'stepvan'
      else if (gvwrNum >= 26000) vehicle_type = 'boxtruck'
      const vds57 = vinUpper.slice(4, 7)
      const fordPSeries: Record<string, string> = { 'F3K':'P600','F4K':'P700','F4A':'P700','F5K':'P1000','F5A':'P1000','F5F':'P1000','F6K':'P1100','F6A':'P1100','F7K':'P1200','F7A':'P1200','F8K':'P1400','F8A':'P1400' }
      const isPSeries = (wmi === '1F6' || wmi === '5F6') && !!fordPSeries[vds57]
      const finalModel = isPSeries ? fordPSeries[vds57] : (model !== 'Not Applicable' ? model : '')
      const finalMake = isPSeries ? 'Utilimaster' : (make !== 'Not Applicable' ? make : '')
      if (make && make !== 'Not Applicable') {
        setForm(prev => ({ ...prev, make: finalMake || prev.make, model: finalModel || prev.model, year: year !== 'Not Applicable' ? year : prev.year, vehicle_type: vehicle_type || prev.vehicle_type }))
        const typeLabel = vehicle_type === 'sprinter' ? 'Sprinter/Cargo Van' : vehicle_type === 'stepvan' ? 'Step Van' : vehicle_type === 'boxtruck' ? 'Box Truck' : ''
        const makeNote = isPSeries ? ' (update make if Grumman, Morgan Olson, etc.)' : ''
        setVinMessage(`✓ Found: ${year} ${finalMake} ${finalModel}${typeLabel ? ` · ${typeLabel}` : ''}${makeNote} — review and confirm below`)
      } else { setVinMessage('VIN not found — please fill in details manually') }
    } catch { setVinMessage('Lookup failed — please fill in details manually') }
    setVinLoading(false)
  }

  function startEdit(truck: any) {
    setEditingId(truck.id)
    setForm({ truck_number:truck.truck_number, driver_name:truck.driver_name, make:truck.make||'', model:truck.model||'', year:truck.year?.toString()||'', license_plate:truck.license_plate||'', vin:truck.vin||'', vehicle_type:truck.vehicle_type||'', csa:truck.csa||'', fleet_type:truck.fleet_type||'owned', rental_company:truck.rental_company||'', rental_contract:truck.rental_contract||'', rental_start:truck.rental_start||'', rental_end:truck.rental_end||'' })
    setShowAdd(false); setSelectedTruck(null)
  }

  function cancelEdit() { setEditingId(null); setForm(emptyForm); setShowAdd(false) }

  async function saveTruck(e: React.FormEvent) {
    e.preventDefault(); setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const payload = { ...form, year: parseInt(form.year)||0 }
    if (editingId) { await supabase.from('trucks').update(payload).eq('id', editingId); setEditingId(null) }
    else { await supabase.from('trucks').insert({ ...payload, user_id: user.id }) }
    setForm(emptyForm); setShowAdd(false); setSaving(false); loadTrucks()
  }

  async function deleteTruck(id: string) {
    if (!confirm('Delete this truck and all its inspection records?')) return
    await supabase.from('trucks').delete().eq('id', id)
    setSelectedTruck(null); loadTrucks()
  }

  const csaList = Array.from(new Set(trucks.filter(t => t.csa).map(t => t.csa))).sort() as string[]
  const ownedTrucks = trucks.filter(t => (t.fleet_type || 'owned') === 'owned')
  const rentalTrucks = trucks.filter(t => t.fleet_type === 'rental')
  const filteredByCsa = csaFilter === 'all' ? trucks : trucks.filter(t => t.csa === csaFilter)
  const csaGroups: Record<string, any[]> = csaList.reduce((acc: Record<string, any[]>, csa: string) => { acc[csa] = trucks.filter((t: any) => t.csa === csa); return acc }, {})
  const noCsaTrucks = trucks.filter(t => !t.csa)
  const showForm = showAdd || editingId !== null

  const cardProps = { editingId, showForm, onOpen: openTruck, onEdit: startEdit, onDelete: deleteTruck, onInspect: (id: string) => window.location.href = `/inspect?truck=${id}` }
  const formProps = { form, setForm, onSubmit: saveTruck, onCancel: cancelEdit, saving, editingId, vinLoading, vinMessage, csaList, onLookupVin: lookupVin }

  // ── Truck detail panel ──────────────────────────────────────────
  if (selectedTruck) {
    const { inspections, damages, photos } = truckDetail
    const newDamages = damages.filter(d => d.is_new)
    return (
      <div>
        <Navbar />
        <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px' }}>
          <button onClick={closeTruck} style={{ background:'none', border:'none', color:'#185FA5', cursor:'pointer', fontSize:13, marginBottom:16, padding:0 }}>← Back to fleet</button>
          <div className="card" style={{ padding:'20px', marginBottom:14 }}>
            <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', flexWrap:'wrap', gap:12 }}>
              <div>
                <div style={{ display:'flex', alignItems:'center', gap:8, flexWrap:'wrap', marginBottom:4 }}>
                  <div style={{ fontSize:22, fontWeight:700 }}>#{selectedTruck.truck_number}</div>
                  {selectedTruck.fleet_type === 'rental' && <span style={{ background:'#FAEEDA', color:'#633806', fontSize:11, fontWeight:600, padding:'2px 8px', borderRadius:20 }}>Rental</span>}
                  {selectedTruck.csa && <span style={{ background:'#E6F1FB', color:'#0C447C', fontSize:11, fontWeight:500, padding:'2px 8px', borderRadius:20 }}>📍 {selectedTruck.csa}</span>}
                </div>
                <div style={{ fontSize:15, color:'#555' }}>{selectedTruck.driver_name}</div>
                <div style={{ fontSize:13, color:'#888', marginTop:4 }}>{[selectedTruck.year, selectedTruck.make, selectedTruck.model].filter(Boolean).join(' ')}</div>
                {selectedTruck.license_plate && <div style={{ fontSize:13, color:'#888', marginTop:2 }}>Plate: {selectedTruck.license_plate}</div>}
                {selectedTruck.vin && <div style={{ fontSize:12, color:'#888', marginTop:2, fontFamily:'monospace' }}>VIN: {selectedTruck.vin}</div>}
                {selectedTruck.fleet_type === 'rental' && selectedTruck.rental_company && (
                  <div style={{ marginTop:8, padding:'8px 12px', background:'#FAEEDA', borderRadius:8, fontSize:12 }}>
                    <div style={{ fontWeight:500, color:'#633806' }}>{selectedTruck.rental_company}</div>
                    {selectedTruck.rental_contract && <div style={{ color:'#854F0B' }}>Contract: {selectedTruck.rental_contract}</div>}
                    {selectedTruck.rental_start && <div style={{ color:'#854F0B' }}>Rental: {selectedTruck.rental_start}{selectedTruck.rental_end ? ` → ${selectedTruck.rental_end}` : ''}</div>}
                  </div>
                )}
              </div>
              <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                <Link href={`/inspect?truck=${selectedTruck.id}`} className="btn btn-primary" style={{ fontSize:13 }}>+ New inspection</Link>
                <button className="btn" onClick={() => startEdit(selectedTruck)} style={{ fontSize:13 }}>Edit</button>
                <button onClick={() => deleteTruck(selectedTruck.id)} style={{ padding:'8px 14px', borderRadius:7, border:'0.5px solid rgba(200,0,0,0.2)', background:'transparent', color:'#A32D2D', cursor:'pointer', fontSize:13 }}>Delete</button>
              </div>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(120px,1fr))', gap:10, marginTop:16 }}>
              {[{label:'Inspections',value:inspections.length},{label:'New damages',value:newDamages.length,color:newDamages.length>0?'#A32D2D':'#27500A'},{label:'Total damages',value:damages.length},{label:'Last inspected',value:inspections[0]?new Date(inspections[0].created_at).toLocaleDateString():'Never'}].map(s => (
                <div key={s.label} style={{ background:'#f7f7f6', borderRadius:8, padding:'12px' }}>
                  <div style={{ fontSize:11, color:'#888', marginBottom:4 }}>{s.label}</div>
                  <div style={{ fontSize:16, fontWeight:600, color:(s as any).color||'#1a1a1a' }}>{loadingDetail?'—':s.value}</div>
                </div>
              ))}
            </div>
          </div>

          {loadingDetail && <div style={{ textAlign:'center', padding:'40px', color:'#888', fontSize:13 }}>Loading...</div>}
          {!loadingDetail && (
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className="card" style={{ padding:'16px', gridColumn:'1/-1' }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Photos ({photos.length})</div>
                {photos.length === 0 ? <div style={{ color:'#aaa', fontSize:13, padding:'20px 0', textAlign:'center' }}>No photos yet</div> : (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(130px,1fr))', gap:8 }}>
                    {photos.map((p, i) => (
                      <div key={p.id}>
                        {photoUrls[p.id]
                          ? <img src={photoUrls[p.id]} style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.1)', cursor:'pointer' }} onClick={() => setLightboxIndex(i)} />
                          : <div style={{ width:'100%', aspectRatio:'4/3', background:'#f0efed', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#aaa' }}>Loading...</div>}
                        <div style={{ fontSize:10, color:'#aaa', marginTop:3, textAlign:'center' }}>{new Date(p.created_at).toLocaleDateString()}</div>
                      </div>
                    ))}
                    {lightboxIndex !== null && (
                      <PhotoLightbox
                        photos={photos.map((p, i) => ({ url: photoUrls[p.id] || '', date: new Date(p.created_at).toLocaleDateString(), label: `Photo ${i+1}` }))}
                        index={lightboxIndex}
                        onClose={() => setLightboxIndex(null)}
                        onNext={() => setLightboxIndex(i => i !== null && i < photos.length - 1 ? i + 1 : i)}
                        onPrev={() => setLightboxIndex(i => i !== null && i > 0 ? i - 1 : i)}
                      />
                    )}
                  </div>
                )}
              </div>

              <div className="card" style={{ padding:'16px' }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Inspection history ({inspections.length})</div>
                {inspections.length === 0 ? <div style={{ color:'#aaa', fontSize:13, padding:'16px 0', textAlign:'center' }}>No inspections yet</div> : inspections.map(insp => (
                  <div key={insp.id} style={{ padding:'10px 0', borderBottom:'0.5px solid rgba(0,0,0,0.07)' }}>
                    <div style={{ display:'flex', alignItems:'flex-start', justifyContent:'space-between', gap:8 }}>
                      <div>
                        <div style={{ fontSize:13, fontWeight:500 }}>{insp.inspection_type} {insp.is_baseline && <span style={{ fontSize:10, background:'#E6F1FB', color:'#0C447C', padding:'1px 5px', borderRadius:8, marginLeft:4 }}>baseline</span>}</div>
                        <div style={{ fontSize:11, color:'#888', marginTop:2 }}>{new Date(insp.created_at).toLocaleDateString()} · {insp.inspector_name}</div>
                        {insp.summary && <div style={{ fontSize:11, color:'#555', marginTop:3, lineHeight:1.5 }}>{insp.summary}</div>}
                      </div>
                      <span className={`badge ${condBadge(insp.overall_condition)}`} style={{ flexShrink:0 }}>{insp.overall_condition}</span>
                    </div>
                    <DamageFeedback inspectionId={insp.id} truckId={selectedTruck.id} onSubmitted={loadTrucks} />
                  </div>
                ))}
              </div>

              <div className="card" style={{ padding:'16px' }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Damage log ({damages.length})</div>
                {damages.length === 0 ? <div style={{ color:'#aaa', fontSize:13, padding:'16px 0', textAlign:'center' }}>No damage recorded</div> : damages.map(d => (
                  <div key={d.id} style={{ border:'0.5px solid rgba(0,0,0,0.07)', borderRadius:8, marginBottom:8, overflow:'hidden' }}>
                    <div style={{ display:'flex', gap:8, padding:'10px 12px' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background:sevDot(d.severity), marginTop:4, flexShrink:0 }} />
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:13, fontWeight:500 }}>
                          {d.location}
                          {d.is_new && <span style={{ fontSize:10, background:'#FCEBEB', color:'#A32D2D', padding:'1px 5px', borderRadius:8, marginLeft:4 }}>NEW</span>}
                          {d.diy_replaceable && <span style={{ fontSize:10, background:'#EAF3DE', color:'#27500A', padding:'1px 5px', borderRadius:8, marginLeft:4 }}>DIY</span>}
                        </div>
                        <div style={{ fontSize:11, color:'#555', marginTop:2 }}>{d.description}</div>
                        {d.recommendation && <div style={{ fontSize:11, color:'#185FA5', marginTop:2 }}>→ {d.recommendation}</div>}
                        {(d.repair_estimate_low > 0 || d.repair_estimate_high > 0) && (
                          <div style={{ fontSize:11, color:'#633806', marginTop:3, fontWeight:500 }}>Est: ${d.repair_estimate_low?.toLocaleString()} – ${d.repair_estimate_high?.toLocaleString()}{d.repair_estimate_notes ? ` · ${d.repair_estimate_notes}` : ''}</div>
                        )}
                        {d.diy_replaceable && d.part_search_query && (
                          <div style={{ display:'flex', gap:5, flexWrap:'wrap', marginTop:5 }}>
                            <span style={{ fontSize:10, color:'#888' }}>Parts:</span>
                            {[{name:'Amazon',url:`https://www.amazon.com/s?k=${encodeURIComponent(d.part_search_query)}&i=automotive`},{name:'RockAuto',url:`https://www.rockauto.com/en/partsgroup/${encodeURIComponent(d.part_search_query.split(' ').slice(0,4).join('+'))}`},{name:'eBay Motors',url:`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(d.part_search_query)}&_sacat=6000`}].map(link => (
                              <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer" style={{ fontSize:10, fontWeight:500, color:'#185FA5', background:'#E6F1FB', padding:'2px 7px', borderRadius:20, textDecoration:'none' }}>{link.name} →</a>
                            ))}
                          </div>
                        )}
                      </div>
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

  // ── Main fleet list ─────────────────────────────────────────────
  return (
    <div>
      <Navbar />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px' }}>
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16, flexWrap:'wrap', gap:10 }}>
          <div>
            <div style={{ fontSize:18, fontWeight:600 }}>Fleet</div>
            <div style={{ fontSize:13, color:'#888', marginTop:2 }}>{trucks.length} total · {ownedTrucks.length} owned · {rentalTrucks.length} rental</div>
          </div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <div style={{ display:'flex', border:'0.5px solid rgba(0,0,0,0.15)', borderRadius:8, overflow:'hidden' }}>
              <button onClick={() => setViewMode('grid')} style={{ padding:'7px 12px', background:viewMode==='grid'?'#185FA5':'white', color:viewMode==='grid'?'white':'#555', border:'none', cursor:'pointer', fontSize:13 }}>⊞</button>
              <button onClick={() => setViewMode('list')} style={{ padding:'7px 12px', background:viewMode==='list'?'#185FA5':'white', color:viewMode==='list'?'white':'#555', border:'none', cursor:'pointer', fontSize:13, borderLeft:'0.5px solid rgba(0,0,0,0.15)' }}>☰</button>
            </div>
            <button className="btn btn-primary" onClick={() => { setShowAdd(!showAdd); setEditingId(null); setForm(emptyForm) }}>+ Add truck</button>
          </div>
        </div>

        <div style={{ display:'flex', borderBottom:'0.5px solid rgba(0,0,0,0.1)', marginBottom:16 }}>
          {([['owned','🚛 My Fleet'],['rental','📋 Rental Fleet'],['csa','📍 By CSA']] as const).map(([v, label]) => (
            <button key={v} onClick={() => setView(v)} style={{ padding:'10px 18px', fontSize:13, fontWeight:500, background:'none', border:'none', borderBottom: view===v ? '2px solid #185FA5' : '2px solid transparent', color: view===v ? '#185FA5' : '#888', cursor:'pointer' }}>{label}</button>
          ))}
        </div>

        {showForm && <TruckForm {...formProps} />}
        {loading && <div style={{ textAlign:'center', padding:'40px', color:'#888', fontSize:13 }}>Loading...</div>}

        {!loading && view === 'owned' && (
          <>
            {ownedTrucks.length === 0 && !showForm && <div className="card" style={{ padding:'48px', textAlign:'center', color:'#888' }}><div style={{ fontSize:14, marginBottom:8 }}>No owned trucks yet</div><button className="btn btn-primary" onClick={() => setShowAdd(true)}>Add your first truck</button></div>}
            {viewMode === 'grid' && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:12 }}>{ownedTrucks.map(t => <TruckCard key={t.id} truck={t} {...cardProps} />)}</div>}
            {viewMode === 'list' && <ListTable trucks={ownedTrucks} onOpen={openTruck} onEdit={startEdit} />}
          </>
        )}

        {!loading && view === 'rental' && (
          <>
            {rentalTrucks.length === 0 && !showForm && (
              <div className="card" style={{ padding:'48px', textAlign:'center', color:'#888' }}>
                <div style={{ fontSize:14, marginBottom:4 }}>No rental vehicles</div>
                <div style={{ fontSize:12, color:'#aaa', marginBottom:16 }}>Add Penske, Ryder, or other rental vehicles here.</div>
                <button className="btn btn-primary" onClick={() => { setShowAdd(true); setForm({...emptyForm, fleet_type:'rental'}) }}>Add rental vehicle</button>
              </div>
            )}
            {viewMode === 'grid' && <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:12 }}>{rentalTrucks.map(t => <TruckCard key={t.id} truck={t} {...cardProps} />)}</div>}
            {viewMode === 'list' && <ListTable trucks={rentalTrucks} onOpen={openTruck} onEdit={startEdit} />}
          </>
        )}

        {!loading && view === 'csa' && (
          <div>
            <div style={{ display:'flex', gap:8, marginBottom:16, flexWrap:'wrap' }}>
              <button onClick={() => setCsaFilter('all')} style={{ padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:500, border: csaFilter==='all'?'1.5px solid #185FA5':'0.5px solid rgba(0,0,0,0.15)', background: csaFilter==='all'?'#E6F1FB':'white', color: csaFilter==='all'?'#0C447C':'#555', cursor:'pointer' }}>All CSAs</button>
              {csaList.map(csa => <button key={csa} onClick={() => setCsaFilter(csa)} style={{ padding:'5px 14px', borderRadius:20, fontSize:12, fontWeight:500, border: csaFilter===csa?'1.5px solid #185FA5':'0.5px solid rgba(0,0,0,0.15)', background: csaFilter===csa?'#E6F1FB':'white', color: csaFilter===csa?'#0C447C':'#555', cursor:'pointer' }}>{csa}</button>)}
            </div>
            {csaFilter === 'all' ? (
              <div>
                {Object.entries(csaGroups).map(([csa, csaTrucks]) => (
                  <div key={csa} style={{ marginBottom:24 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#185FA5', marginBottom:10 }}>📍 {csa} <span style={{ fontSize:11, color:'#888', fontWeight:400 }}>· {csaTrucks.length} vehicle{csaTrucks.length!==1?'s':''}</span></div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:10 }}>{csaTrucks.map((t: any) => <TruckCard key={t.id} truck={t} {...cardProps} />)}</div>
                  </div>
                ))}
                {noCsaTrucks.length > 0 && (
                  <div style={{ marginBottom:24 }}>
                    <div style={{ fontSize:13, fontWeight:600, color:'#888', marginBottom:10 }}>No CSA assigned <span style={{ fontSize:11, fontWeight:400 }}>({noCsaTrucks.length})</span></div>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:10 }}>{noCsaTrucks.map(t => <TruckCard key={t.id} truck={t} {...cardProps} />)}</div>
                  </div>
                )}
                {csaList.length === 0 && <div className="card" style={{ padding:'32px', textAlign:'center', color:'#888', fontSize:13 }}>No CSA locations set yet. Edit your trucks and add a CSA to organize by location.</div>}
              </div>
            ) : (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(260px,1fr))', gap:12 }}>{filteredByCsa.map(t => <TruckCard key={t.id} truck={t} {...cardProps} />)}</div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
