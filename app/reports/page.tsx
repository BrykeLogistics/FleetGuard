'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'
import Link from 'next/link'
import PhotoStrip from '../components/PhotoStrip'

function ReportsContent() {
  const searchParams = useSearchParams()
  const preselectedTruck = searchParams.get('truck')

  const [trucks, setTrucks] = useState<any[]>([])
  const [selectedTruck, setSelectedTruck] = useState(preselectedTruck || '')
  const [inspections, setInspections] = useState<any[]>([])
  const [damages, setDamages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string|null>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [photoUrls, setPhotoUrls] = useState<{[key:string]:string}>({})


  useEffect(() => { loadTrucks() }, [])
  useEffect(() => { if (selectedTruck) loadReport() }, [selectedTruck])

  useEffect(() => {
    const filter = searchParams.get('filter')
    if (filter) setActiveFilter(filter)
  }, [])

  async function loadTrucks() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('trucks').select('*').eq('user_id', user.id).order('truck_number')
    setTrucks(data || [])
    if (preselectedTruck) setSelectedTruck(preselectedTruck)
  }

  async function loadReport() {
    setLoading(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [inspRes, dmgRes, photoRes] = await Promise.all([
      supabase.from('inspections').select('*').eq('truck_id', selectedTruck).eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('damages').select('*, inspections(created_at, inspection_type, inspector_name)').eq('truck_id', selectedTruck).eq('user_id', user.id).order('created_at', { ascending: false }),
      supabase.from('inspection_photos').select('*').eq('truck_id', selectedTruck).eq('user_id', user.id).order('created_at', { ascending: false }).limit(40),
    ])
    setInspections(inspRes.data || [])
    setDamages(dmgRes.data || [])
    setPhotos(photoRes.data || [])
    // Load signed URLs for photos
    const urls: {[key:string]:string} = {}
    for (const p of (photoRes.data || [])) {
      const { data } = await supabase.storage.from('inspection-photos').createSignedUrl(p.storage_path, 3600)
      if (data?.signedUrl) urls[p.id] = data.signedUrl
    }
    setPhotoUrls(urls)
    setLoading(false)
  }

  async function exportCSV() {
    const truck = trucks.find(t => t.id === selectedTruck)
    const rows = [
      ['Date', 'Inspection Type', 'Inspector', 'Condition', 'Urgency', 'Follow Up', 'Damage Location', 'Severity', 'Description', 'New Damage'],
      ...damages.map(d => [
        new Date((d.inspections as any)?.created_at).toLocaleDateString(),
        (d.inspections as any)?.inspection_type || '',
        (d.inspections as any)?.inspector_name || '',
        '',
        '',
        '',
        d.location,
        d.severity,
        d.description,
        d.is_new ? 'Yes' : 'No',
      ])
    ]
    const csv = rows.map(r => r.map(v => `"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `FleetGuard_${truck?.truck_number}_report.csv`
    a.click()
  }

  const truck = trucks.find(t => t.id === selectedTruck)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
  const newDamages = damages.filter(d => d.is_new)
  const allDamages = damages.filter(d => !d.is_new)
  // Dashboard filter: new-damage shows only new damages, this-week filters by date
  const displayedNewDamages = activeFilter === 'new-damage' ? newDamages : newDamages
  const displayedInspections = activeFilter === 'this-week'
    ? inspections.filter((i: any) => new Date(i.created_at) > weekAgo)
    : inspections
  const sevColor = (s: string) => s === 'critical' ? '#E24B4A' : s === 'moderate' ? '#EF9F27' : '#639922'
  // Apply filters from URL params
  const condBadge = (c: string) => c === 'Good' ? 'badge-green' : (c === 'Critical' || c === 'Poor') ? 'badge-red' : c === 'Fair' ? 'badge-amber' : 'badge-gray'

  const photoList = photos.map((p, i) => ({ url: photoUrls[p.id] || '', label: `Photo ${i+1}`, date: new Date(p.created_at).toLocaleDateString() })).filter(p => p.url)

  return (
    <div>
      <Navbar />

      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px', paddingRight: photoList.length > 0 ? 64 : 16 }}>

        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div style={{ fontSize:18, fontWeight:600 }}>Reports</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select value={selectedTruck} onChange={e => setSelectedTruck(e.target.value)} style={{ width:'auto', minWidth:220 }}>
              <option value="">— select a truck —</option>
              {trucks.map(t => <option key={t.id} value={t.id}>#{t.truck_number} — {t.driver_name}</option>)}
            </select>
            {selectedTruck && <button className="btn" onClick={exportCSV}>Export CSV</button>}
          </div>
        </div>

        {!selectedTruck && (
          <div className="card" style={{ padding:'48px', textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:14, marginBottom:8 }}>Select a truck above to view its damage report</div>
            <Link href="/fleet" style={{ color:'#185FA5', fontSize:13 }}>Manage fleet →</Link>
          </div>
        )}

        {selectedTruck && loading && (
          <div style={{ textAlign:'center', padding:'40px', color:'#888', fontSize:13 }}>Loading report...</div>
        )}

        {selectedTruck && !loading && (
          <div>
            {/* Truck summary */}
            <div className="card" style={{ padding:'20px', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:600 }}>Truck #{truck?.truck_number} — {truck?.driver_name}</div>
                  <div style={{ fontSize:13, color:'#888', marginTop:2 }}>{[truck?.year, truck?.make, truck?.model].filter(Boolean).join(' ')} {truck?.license_plate && `· ${truck.license_plate}`}</div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:22, fontWeight:700, color:'#1a1a1a' }}>{inspections.length}</div>
                    <div style={{ fontSize:11, color:'#888' }}>Inspections</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:22, fontWeight:700, color: newDamages.length > 0 ? '#A32D2D' : '#27500A' }}>{newDamages.length}</div>
                    <div style={{ fontSize:11, color:'#888' }}>New damages</div>
                  </div>
                  <div style={{ textAlign:'center' }}>
                    <div style={{ fontSize:22, fontWeight:700, color:'#633806' }}>{allDamages.length}</div>
                    <div style={{ fontSize:11, color:'#888' }}>Known damages</div>
                  </div>
                </div>
              </div>
            </div>

            {/* New damages alert */}
            {newDamages.length > 0 && (
              <div style={{ background:'#FCEBEB', border:'0.5px solid rgba(163,45,45,0.2)', borderRadius:12, padding:'16px 20px', marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:500, color:'#A32D2D', marginBottom:10 }}>⚠ New damage detected ({newDamages.length} item{newDamages.length > 1 ? 's' : ''})</div>
                {newDamages.map(d => (
                  <div key={d.id} style={{ display:'flex', gap:8, marginBottom:8 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background: sevColor(d.severity), marginTop:5, flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:'#7a1a1a' }}>{d.location} <span style={{ textTransform:'capitalize', fontWeight:400, color:'#A32D2D' }}>({d.severity})</span></div>
                      <div style={{ fontSize:12, color:'#8a2a2a', marginTop:1 }}>{d.description}</div>
                      {d.recommendation && <div style={{ fontSize:12, color:'#185FA5', marginTop:2 }}>→ {d.recommendation}</div>}
                      <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>Found: {new Date((d.inspections as any)?.created_at).toLocaleDateString()} · {(d.inspections as any)?.inspector_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inspection history */}
            <div className="card" style={{ padding:'20px', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:14 }}>Inspection history ({inspections.length})</div>
              {inspections.length === 0 && (
                <div style={{ color:'#888', fontSize:13, padding:'16px 0', textAlign:'center' }}>No inspections yet. <Link href={`/inspect?truck=${selectedTruck}`} style={{ color:'#185FA5' }}>Run first inspection →</Link></div>
              )}
              {inspections.map(insp => (
                <div key={insp.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'0.5px solid rgba(0,0,0,0.07)' }}>
                  <div style={{ flex:1 }}>
                    <div style={{ fontSize:13, fontWeight:500 }}>{insp.inspection_type} {insp.is_baseline && <span style={{ fontSize:11, background:'#E6F1FB', color:'#0C447C', padding:'1px 6px', borderRadius:10, marginLeft:4 }}>baseline</span>}</div>
                    <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{new Date(insp.created_at).toLocaleDateString()} · {insp.inspector_name}</div>
                    {insp.summary && <div style={{ fontSize:12, color:'#555', marginTop:3, lineHeight:1.5 }}>{insp.summary}</div>}
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <span className={`badge ${condBadge(insp.overall_condition)}`}>{insp.overall_condition}</span>
                    {insp.follow_up_required && <div style={{ fontSize:11, color:'#A32D2D', marginTop:4 }}>Follow-up needed</div>}
                  </div>
                </div>
              ))}
            </div>

            {/* All known damage */}
            {allDamages.length > 0 && (
              <div className="card" style={{ padding:'20px' }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:14 }}>All documented damage ({allDamages.length})</div>
                {allDamages.map(d => (
                  <div key={d.id} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:'0.5px solid rgba(0,0,0,0.07)' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background: sevColor(d.severity), marginTop:5, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{d.location} <span style={{ fontSize:11, color:'#888', textTransform:'capitalize', fontWeight:400 }}>({d.severity})</span></div>
                      <div style={{ fontSize:12, color:'#555', marginTop:2 }}>{d.description}</div>
                      {d.recommendation && <div style={{ fontSize:12, color:'#185FA5', marginTop:2 }}>→ {d.recommendation}</div>}
                    </div>
                    <div style={{ fontSize:11, color:'#aaa', flexShrink:0 }}>{new Date((d.inspections as any)?.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      <PhotoStrip photos={photoList} />
    </div>
  )
}

export default function ReportsPage() {
  return <Suspense fallback={<div />}><ReportsContent /></Suspense>
}
