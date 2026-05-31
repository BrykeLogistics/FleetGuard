'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/useProfile'
import Navbar from '../components/Navbar'
import Link from 'next/link'

// ── Lightbox ──────────────────────────────────────────────────────
function Lightbox({ photos, index, onClose, onPrev, onNext }: { photos:{url:string,date?:string}[], index:number, onClose:()=>void, onPrev:()=>void, onNext:()=>void }) {
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key==='Escape') onClose()
      if (e.key==='ArrowLeft') onPrev()
      if (e.key==='ArrowRight') onNext()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, onPrev, onNext])
  const photo = photos[index]
  if (!photo) return null
  return (
    <div onClick={onClose} style={{ position:'fixed', inset:0, background:'rgba(0,0,0,0.92)', zIndex:1000, display:'flex', alignItems:'center', justifyContent:'center' }}>
      <div onClick={e=>e.stopPropagation()} style={{ position:'relative', maxWidth:'95vw', maxHeight:'95vh', display:'flex', flexDirection:'column', alignItems:'center' }}>
        <img src={photo.url} style={{ maxWidth:'90vw', maxHeight:'85vh', objectFit:'contain', borderRadius:8 }} />
        {photo.date&&<div style={{ color:'rgba(255,255,255,0.5)', fontSize:12, marginTop:8 }}>{photo.date} · {index+1} of {photos.length}</div>}
        <button onClick={onClose} style={{ position:'absolute', top:-12, right:-12, width:36, height:36, borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', color:'white', fontSize:20, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
        {index>0&&<button onClick={onPrev} style={{ position:'absolute', left:-48, top:'50%', transform:'translateY(-50%)', width:40, height:40, borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', color:'white', fontSize:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>}
        {index<photos.length-1&&<button onClick={onNext} style={{ position:'absolute', right:-48, top:'50%', transform:'translateY(-50%)', width:40, height:40, borderRadius:'50%', background:'rgba(255,255,255,0.15)', border:'none', color:'white', fontSize:22, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>}
      </div>
    </div>
  )
}

function ReportsContent() {
  const searchParams = useSearchParams()
  const { profile, isManager, loading: profileLoading } = useProfile()
  const preselectedTruck = searchParams.get('truck')

  const [trucks, setTrucks] = useState<any[]>([])
  const [selectedTruck, setSelectedTruck] = useState(preselectedTruck||'')
  const [inspections, setInspections] = useState<any[]>([])
  const [damages, setDamages] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [activeFilter, setActiveFilter] = useState<string|null>(null)
  const [photos, setPhotos] = useState<any[]>([])
  const [photoUrls, setPhotoUrls] = useState<{[key:string]:string}>({})
  const [lightboxPhotos, setLightboxPhotos] = useState<{url:string,date:string}[]>([])
  const [lightboxIndex, setLightboxIndex] = useState<number|null>(null)
  const [expandedInspId, setExpandedInspId] = useState<string|null>(null)

  // Recent inspections across all trucks
  const [recentInspections, setRecentInspections] = useState<any[]>([])
  const [recentLoading, setRecentLoading] = useState(true)
  const [showAllRecent, setShowAllRecent] = useState(false)

  useEffect(() => { if (!profileLoading) { loadTrucks(); loadRecentInspections() } }, [profileLoading])
  useEffect(() => { if (selectedTruck) loadReport() }, [selectedTruck])
  useEffect(() => { const f = searchParams.get('filter'); if (f) setActiveFilter(f) }, [])

  async function loadTrucks() {
    if (!profile?.company_id) return
    let query = supabase.from('trucks').select('*').eq('company_id', profile.company_id).order('truck_number')
    if (isManager) query = query.eq('csa', profile.csa)
    const { data } = await query
    setTrucks(data||[])
  }

  async function loadRecentInspections() {
    if (!profile?.company_id) return
    setRecentLoading(true)
    let query = supabase
      .from('inspections')
      .select('*, trucks(id, truck_number, driver_name, csa)')
      .eq('company_id', profile.company_id)
      .order('created_at', { ascending: false })
      .limit(20)
    const { data } = await query
    setRecentInspections(data||[])
    setRecentLoading(false)
  }

  async function loadReport() {
    setLoading(true); setLightboxIndex(null); setExpandedInspId(null)
    const [inspRes, dmgRes, photoRes] = await Promise.all([
      supabase.from('inspections').select('*').eq('truck_id', selectedTruck).order('created_at', { ascending: false }),
      supabase.from('damages').select('*, inspections(created_at,inspection_type,inspector_name)').eq('truck_id', selectedTruck).order('created_at', { ascending: false }),
      supabase.from('inspection_photos').select('*').eq('truck_id', selectedTruck).order('created_at', { ascending: false }),
    ])
    setInspections(inspRes.data||[])
    setDamages(dmgRes.data||[])
    setPhotos(photoRes.data||[])
    if (inspRes.data && inspRes.data.length > 0) setExpandedInspId(inspRes.data[0].id)
    const urlEntries = await Promise.all(
      (photoRes.data||[]).map(async (p:any) => {
        const { data } = await supabase.storage.from('inspection-photos').createSignedUrl(p.storage_path, 3600)
        return [p.id, data?.signedUrl||''] as [string,string]
      })
    )
    setPhotoUrls(Object.fromEntries(urlEntries.filter(([,url])=>url)))
    setLoading(false)
  }

  async function exportCSV() {
    const truck = trucks.find(t=>t.id===selectedTruck)
    const rows = [
      ['Date','Inspection Type','Inspector','Damage Location','Severity','Description','New Damage'],
      ...damages.map(d=>[
        new Date((d.inspections as any)?.created_at).toLocaleDateString(),
        (d.inspections as any)?.inspection_type||'',
        (d.inspections as any)?.inspector_name||'',
        d.location, d.severity, d.description, d.is_new?'Yes':'No',
      ])
    ]
    const csv = rows.map(r=>r.map(v=>`"${v}"`).join(',')).join('\n')
    const blob = new Blob([csv],{type:'text/csv'})
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a'); a.href=url
    a.download=`FleetGuard_${truck?.truck_number}_report.csv`; a.click()
  }

  function openLightbox(lbPhotos: {url:string,date:string}[], index: number) {
    setLightboxPhotos(lbPhotos); setLightboxIndex(index)
  }

  const truck = trucks.find(t=>t.id===selectedTruck)
  const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate()-7)
  const newDamages = damages.filter(d=>d.is_new)
  const allDamages = damages.filter(d=>!d.is_new)
  const displayedInspections = activeFilter==='this-week' ? inspections.filter(i=>new Date(i.created_at)>weekAgo) : inspections
  const sevColor = (s:string) => s==='critical'?'#E24B4A':s==='moderate'?'#EF9F27':'#639922'
  const condBadge = (c:string) => c==='Good'?'badge-green':(c==='Critical'||c==='Poor')?'badge-red':c==='Fair'?'badge-amber':'badge-gray'
  const condColor = (c:string) => c==='Good'?'#27500A':(c==='Critical'||c==='Poor')?'#A32D2D':c==='Fair'?'#633806':'#888'
  const condBar = (c:string) => c==='Good'?'#639922':(c==='Critical'||c==='Poor')?'#E24B4A':c==='Fair'?'#EF9F27':'#aaa'

  // Group photos by inspection
  const photosByInspection: Record<string,any[]> = {}
  for (const p of photos) {
    if (!photosByInspection[p.inspection_id]) photosByInspection[p.inspection_id] = []
    photosByInspection[p.inspection_id].push(p)
  }

  const displayedRecent = showAllRecent ? recentInspections : recentInspections.slice(0, 5)

  return (
    <div>
      <Navbar />

      {lightboxIndex !== null && (
        <Lightbox photos={lightboxPhotos} index={lightboxIndex}
          onClose={()=>setLightboxIndex(null)}
          onPrev={()=>setLightboxIndex(i=>i!==null&&i>0?i-1:i)}
          onNext={()=>setLightboxIndex(i=>i!==null&&i<lightboxPhotos.length-1?i+1:i)}
        />
      )}

      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px' }}>

        {/* ── Header with truck selector ── */}
        <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:20, flexWrap:'wrap', gap:10 }}>
          <div style={{ fontSize:18, fontWeight:600 }}>Reports</div>
          <div style={{ display:'flex', gap:8, alignItems:'center' }}>
            <select value={selectedTruck} onChange={e=>setSelectedTruck(e.target.value)} style={{ width:'auto', minWidth:220 }}>
              <option value="">— select a truck —</option>
              {trucks.map(t=><option key={t.id} value={t.id}>#{t.truck_number} — {t.driver_name}</option>)}
            </select>
            {selectedTruck&&<button className="btn" onClick={exportCSV}>Export CSV</button>}
          </div>
        </div>

        {/* ── Recent inspections (always visible) ── */}
        {!selectedTruck && (
          <div className="card" style={{ padding:'16px', marginBottom:16 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
              <div style={{ fontSize:14, fontWeight:500 }}>Recent inspections</div>
              {recentInspections.length > 5 && (
                <button onClick={()=>setShowAllRecent(!showAllRecent)}
                  style={{ background:'none', border:'none', color:'#185FA5', cursor:'pointer', fontSize:12, padding:0 }}>
                  {showAllRecent ? 'Show less ↑' : `View all ${recentInspections.length} →`}
                </button>
              )}
            </div>

            {recentLoading ? (
              <div style={{ textAlign:'center', padding:'24px', color:'#888', fontSize:13 }}>Loading...</div>
            ) : recentInspections.length === 0 ? (
              <div style={{ textAlign:'center', padding:'24px', color:'#aaa', fontSize:13 }}>No inspections yet</div>
            ) : (
              <>
                {displayedRecent.map((insp, i) => {
                  const truckData = insp.trucks as any
                  return (
                    <div key={insp.id}
                      onClick={() => setSelectedTruck(truckData?.id||'')}
                      style={{ display:'flex', gap:10, padding:'11px 0', borderBottom: i < displayedRecent.length-1 ? '0.5px solid rgba(0,0,0,0.07)' : 'none', cursor:'pointer', alignItems:'center' }}>
                      {/* Color bar */}
                      <div style={{ width:3, borderRadius:2, alignSelf:'stretch', minHeight:36, background:condBar(insp.overall_condition), flexShrink:0 }} />
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ display:'flex', alignItems:'center', gap:6, marginBottom:3, flexWrap:'wrap' }}>
                          <span style={{ fontSize:13, fontWeight:600, color:'#1a1a1a' }}>
                            Truck #{truckData?.truck_number}
                          </span>
                          {truckData?.driver_name && <span style={{ fontSize:12, color:'#555' }}>— {truckData.driver_name}</span>}
                          {insp.follow_up_required && <span style={{ fontSize:10, background:'#FCEBEB', color:'#A32D2D', padding:'1px 6px', borderRadius:10, fontWeight:500 }}>Follow-up</span>}
                          {insp.is_baseline && <span style={{ fontSize:10, background:'#E6F1FB', color:'#0C447C', padding:'1px 6px', borderRadius:10 }}>Baseline</span>}
                        </div>
                        <div style={{ fontSize:11, color:'#999' }}>
                          {insp.inspection_type} · {insp.inspector_name} · {new Date(insp.created_at).toLocaleDateString()}
                          {truckData?.csa && <span style={{ color:'#185FA5' }}> · CSA {truckData.csa}</span>}
                        </div>
                      </div>
                      <div style={{ textAlign:'right', flexShrink:0 }}>
                        <div style={{ fontSize:12, fontWeight:600, color:condColor(insp.overall_condition) }}>{insp.overall_condition||'—'}</div>
                        <div style={{ fontSize:11, color:'#bbb', marginTop:2 }}>View →</div>
                      </div>
                    </div>
                  )
                })}
                {!showAllRecent && recentInspections.length > 5 && (
                  <button onClick={()=>setShowAllRecent(true)}
                    style={{ width:'100%', background:'none', border:'none', color:'#185FA5', cursor:'pointer', fontSize:12, padding:'10px 0 2px', textAlign:'center' }}>
                    View all {recentInspections.length} inspections →
                  </button>
                )}
              </>
            )}
          </div>
        )}

        {/* ── No truck selected prompt ── */}
        {!selectedTruck && (
          <div className="card" style={{ padding:'32px', textAlign:'center', color:'#888' }}>
            <div style={{ fontSize:14, marginBottom:6 }}>Select a truck above for its full damage report</div>
            <div style={{ fontSize:12, color:'#aaa' }}>Or click any inspection above to jump to that truck</div>
          </div>
        )}

        {selectedTruck && loading && (
          <div style={{ textAlign:'center', padding:'40px', color:'#888', fontSize:13 }}>Loading report...</div>
        )}

        {selectedTruck && !loading && (
          <div>
            {/* Back to recent */}
            <button onClick={()=>setSelectedTruck('')}
              style={{ background:'none', border:'none', color:'#185FA5', cursor:'pointer', fontSize:13, marginBottom:14, padding:0 }}>
              ← Back to recent inspections
            </button>

            {/* Truck summary */}
            <div className="card" style={{ padding:'20px', marginBottom:14 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10 }}>
                <div>
                  <div style={{ fontSize:16, fontWeight:600 }}>Truck #{truck?.truck_number} — {truck?.driver_name}</div>
                  <div style={{ fontSize:13, color:'#888', marginTop:2 }}>
                    {[truck?.year,truck?.make,truck?.model].filter(Boolean).join(' ')}{truck?.license_plate&&` · ${truck.license_plate}`}
                  </div>
                </div>
                <div style={{ display:'flex', gap:10 }}>
                  {[
                    {value:inspections.length, label:'Inspections', color:'#1a1a1a'},
                    {value:newDamages.length, label:'New damages', color:newDamages.length>0?'#A32D2D':'#27500A'},
                    {value:allDamages.length, label:'Known damages', color:'#633806'},
                  ].map(s=>(
                    <div key={s.label} style={{ textAlign:'center' }}>
                      <div style={{ fontSize:22, fontWeight:700, color:s.color }}>{s.value}</div>
                      <div style={{ fontSize:11, color:'#888' }}>{s.label}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Grouped photos by inspection */}
            {inspections.length > 0 && photos.length > 0 && (
              <div className="card" style={{ padding:'20px', marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:12 }}>Inspection photos</div>
                {inspections.map((insp, inspIdx) => {
                  const inspPhotos = photosByInspection[insp.id] || []
                  const isExpanded = expandedInspId === insp.id
                  const isFirst = inspIdx === 0
                  const lbPhotos = inspPhotos.map(p => ({ url:photoUrls[p.id]||'', date:new Date(p.created_at).toLocaleDateString() })).filter(p=>p.url)
                  return (
                    <div key={insp.id} style={{ borderBottom:'0.5px solid rgba(0,0,0,0.07)', marginBottom:8, paddingBottom:8 }}>
                      <button onClick={()=>setExpandedInspId(isExpanded?null:insp.id)}
                        style={{ width:'100%', background:'none', border:'none', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'space-between', padding:'6px 0', textAlign:'left' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <span style={{ fontSize:13, fontWeight:isFirst?600:500, color:'#1a1a1a' }}>
                            📅 {new Date(insp.created_at).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})}
                          </span>
                          <span style={{ fontSize:12, color:'#888' }}>{insp.inspection_type}</span>
                          {isFirst&&<span style={{ fontSize:11, background:'#E6F1FB', color:'#0C447C', padding:'1px 6px', borderRadius:10 }}>Latest</span>}
                        </div>
                        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                          <span style={{ fontSize:12, color:'#aaa' }}>{inspPhotos.length} photo{inspPhotos.length!==1?'s':''}</span>
                          <span style={{ fontSize:14, color:'#888', transform:isExpanded?'rotate(90deg)':'none', transition:'transform 0.2s', display:'inline-block' }}>›</span>
                        </div>
                      </button>
                      {isExpanded && inspPhotos.length > 0 && (
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(130px,1fr))', gap:8, marginTop:8 }}>
                          {inspPhotos.map((p) => (
                            <div key={p.id} style={{ cursor:photoUrls[p.id]?'pointer':'default' }}
                              onClick={()=>photoUrls[p.id]&&openLightbox(lbPhotos, lbPhotos.findIndex(lp=>lp.url===photoUrls[p.id]))}>
                              {photoUrls[p.id]
                                ? <img src={photoUrls[p.id]} style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.1)', display:'block', transition:'opacity 0.15s' }}
                                    onMouseEnter={e=>(e.currentTarget.style.opacity='0.85')}
                                    onMouseLeave={e=>(e.currentTarget.style.opacity='1')} />
                                : <div style={{ width:'100%', aspectRatio:'4/3', background:'#f0efed', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:11, color:'#aaa' }}>Loading...</div>}
                              <div style={{ fontSize:10, color:'#aaa', marginTop:3, textAlign:'center' }}>{new Date(p.created_at).toLocaleDateString()}</div>
                            </div>
                          ))}
                        </div>
                      )}
                      {isExpanded && inspPhotos.length === 0 && (
                        <div style={{ fontSize:12, color:'#aaa', padding:'8px 0' }}>No photos for this inspection</div>
                      )}
                    </div>
                  )
                })}
              </div>
            )}

            {/* New damages alert */}
            {newDamages.length>0&&(
              <div style={{ background:'#FCEBEB', border:'0.5px solid rgba(163,45,45,0.2)', borderRadius:12, padding:'16px 20px', marginBottom:14 }}>
                <div style={{ fontSize:14, fontWeight:500, color:'#A32D2D', marginBottom:10 }}>⚠ New damage detected ({newDamages.length} item{newDamages.length>1?'s':''})</div>
                {newDamages.map(d=>(
                  <div key={d.id} style={{ display:'flex', gap:8, marginBottom:8 }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:sevColor(d.severity), marginTop:5, flexShrink:0 }} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:500, color:'#7a1a1a' }}>{d.location} <span style={{ textTransform:'capitalize', fontWeight:400, color:'#A32D2D' }}>({d.severity})</span></div>
                      <div style={{ fontSize:12, color:'#8a2a2a', marginTop:1 }}>{d.description}</div>
                      {d.recommendation&&<div style={{ fontSize:12, color:'#185FA5', marginTop:2 }}>→ {d.recommendation}</div>}
                      <div style={{ fontSize:11, color:'#aaa', marginTop:2 }}>Found: {new Date((d.inspections as any)?.created_at).toLocaleDateString()} · {(d.inspections as any)?.inspector_name}</div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Inspection history */}
            <div className="card" style={{ padding:'20px', marginBottom:14 }}>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:14 }}>Inspection history ({displayedInspections.length})</div>
              {displayedInspections.length===0
                ? <div style={{ color:'#888', fontSize:13, padding:'16px 0', textAlign:'center' }}>No inspections yet. <Link href={`/inspect?truck=${selectedTruck}`} style={{ color:'#185FA5' }}>Run first inspection →</Link></div>
                : displayedInspections.map(insp=>(
                  <div key={insp.id} style={{ display:'flex', alignItems:'center', gap:12, padding:'10px 0', borderBottom:'0.5px solid rgba(0,0,0,0.07)' }}>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>
                        {insp.inspection_type}
                        {insp.is_baseline&&<span style={{ fontSize:11, background:'#E6F1FB', color:'#0C447C', padding:'1px 6px', borderRadius:10, marginLeft:4 }}>baseline</span>}
                      </div>
                      <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{new Date(insp.created_at).toLocaleDateString()} · {insp.inspector_name}</div>
                      {insp.summary&&<div style={{ fontSize:12, color:'#555', marginTop:3, lineHeight:1.5 }}>{insp.summary}</div>}
                    </div>
                    <div style={{ textAlign:'right', flexShrink:0 }}>
                      <span className={`badge ${condBadge(insp.overall_condition)}`}>{insp.overall_condition}</span>
                      {insp.follow_up_required&&<div style={{ fontSize:11, color:'#A32D2D', marginTop:4 }}>Follow-up needed</div>}
                    </div>
                  </div>
                ))
              }
            </div>

            {/* All known damage */}
            {allDamages.length>0&&(
              <div className="card" style={{ padding:'20px' }}>
                <div style={{ fontSize:14, fontWeight:500, marginBottom:14 }}>All documented damage ({allDamages.length})</div>
                {allDamages.map(d=>(
                  <div key={d.id} style={{ display:'flex', gap:10, padding:'10px 0', borderBottom:'0.5px solid rgba(0,0,0,0.07)' }}>
                    <div style={{ width:8, height:8, borderRadius:'50%', background:sevColor(d.severity), marginTop:5, flexShrink:0 }} />
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:13, fontWeight:500 }}>{d.location} <span style={{ fontSize:11, color:'#888', textTransform:'capitalize', fontWeight:400 }}>({d.severity})</span></div>
                      <div style={{ fontSize:12, color:'#555', marginTop:2 }}>{d.description}</div>
                      {d.recommendation&&<div style={{ fontSize:12, color:'#185FA5', marginTop:2 }}>→ {d.recommendation}</div>}
                    </div>
                    <div style={{ fontSize:11, color:'#aaa', flexShrink:0 }}>{new Date((d.inspections as any)?.created_at).toLocaleDateString()}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default function ReportsPage() {
  return <Suspense fallback={<div/>}><ReportsContent/></Suspense>
}
