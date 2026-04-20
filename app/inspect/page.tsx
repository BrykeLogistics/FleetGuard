'use client'
import { useEffect, useState, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'
import Link from 'next/link'

function InspectContent() {
  const searchParams = useSearchParams()
  const preselectedTruck = searchParams.get('truck')

  const [step, setStep] = useState(1)
  const [trucks, setTrucks] = useState<any[]>([])
  const [selectedTruck, setSelectedTruck] = useState(preselectedTruck || '')
  const [inspType, setInspType] = useState('Routine weekly check')
  const [inspector, setInspector] = useState('')
  const [notes, setNotes] = useState('')
  const [isBaseline, setIsBaseline] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [analyzing, setAnalyzing] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadTrucks() }, [])

  async function loadTrucks() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const { data } = await supabase.from('trucks').select('*').eq('user_id', user.id).order('truck_number')
    setTrucks(data || [])
  }

  function handleFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...newFiles])
    newFiles.forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  function removeFile(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  async function runAnalysis() {
    if (!selectedTruck) { setError('Please select a truck first.'); return }
    setAnalyzing(true); setError('')

    const truck = trucks.find(t => t.id === selectedTruck)

    // Load baseline damages if this isn't a baseline inspection
    let baselineDamages: any[] = []
    if (!isBaseline) {
      const { data } = await supabase.from('damages').select('*').eq('truck_id', selectedTruck).eq('is_new', false)
      baselineDamages = data || []
    }

    // Convert images to base64
    const images = await Promise.all(previews.map(async (p, i) => ({
      media_type: files[i]?.type || 'image/jpeg',
      data: p.split(',')[1]
    })))

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          truckInfo: `Truck #${truck?.truck_number} - ${truck?.driver_name} (${truck?.year} ${truck?.make} ${truck?.model})`,
          inspectionType: inspType,
          inspector,
          notes,
          baselineDamages,
        })
      })
      const data = await res.json()
      if (data.error) throw new Error(data.error)
      setResult(data)
      setStep(3)
    } catch (err: any) {
      setError(err.message)
    }
    setAnalyzing(false)
  }

  async function saveInspection() {
    if (!result || !selectedTruck) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    // Save inspection
    const { data: insp } = await supabase.from('inspections').insert({
      truck_id: selectedTruck,
      inspector_name: inspector || 'Unknown',
      inspection_type: inspType,
      notes,
      overall_condition: result.overallCondition,
      summary: result.summary,
      follow_up_required: result.followUpRequired,
      repair_urgency: result.estimatedRepairUrgency,
      is_baseline: isBaseline,
      user_id: user.id,
    }).select().single()

    if (insp) {
      // Save damages
      if (result.damages?.length > 0) {
        await supabase.from('damages').insert(
          result.damages.map((d: any) => ({
            inspection_id: insp.id,
            truck_id: selectedTruck,
            severity: d.severity,
            location: d.location,
            description: d.description,
            recommendation: d.recommendation || '',
            is_new: d.is_new,
            user_id: user.id,
          }))
        )
      }

      // Upload photos
      for (let i = 0; i < files.length; i++) {
        const file = files[i]
        const path = `${user.id}/${selectedTruck}/${insp.id}/${Date.now()}_${i}.jpg`
        await supabase.storage.from('inspection-photos').upload(path, file)
        await supabase.from('inspection_photos').insert({ inspection_id: insp.id, truck_id: selectedTruck, storage_path: path, user_id: user.id })
      }
    }

    setSaving(false)
    setSaved(true)
  }

  const condColor = (c: string) => c === 'Good' ? '#27500A' : (c === 'Critical' || c === 'Poor') ? '#A32D2D' : '#633806'
  const sevDot = (s: string) => s === 'critical' ? '#E24B4A' : s === 'moderate' ? '#EF9F27' : '#639922'

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth:720, margin:'0 auto', padding:'24px 16px' }}>

        {/* Step indicators */}
        <div style={{ display:'flex', gap:0, marginBottom:24, borderBottom:'0.5px solid rgba(0,0,0,0.1)' }}>
          {['1. Setup', '2. Photos', '3. Results'].map((label, i) => (
            <div key={label} onClick={() => { if (i+1 <= step) setStep(i+1) }} style={{ padding:'10px 20px', fontSize:13, fontWeight:500, cursor: i+1 <= step ? 'pointer' : 'default', borderBottom: step === i+1 ? '2px solid #185FA5' : '2px solid transparent', color: step === i+1 ? '#185FA5' : i+1 < step ? '#555' : '#aaa' }}>
              {label}
            </div>
          ))}
        </div>

        {/* Step 1: Setup */}
        {step === 1 && (
          <div className="card" style={{ padding:'24px' }}>
            <div style={{ fontSize:15, fontWeight:500, marginBottom:20 }}>Inspection setup</div>
            <div style={{ display:'grid', gap:14 }}>
              <div>
                <label>Truck *</label>
                <select value={selectedTruck} onChange={e => setSelectedTruck(e.target.value)} required>
                  <option value="">— select a truck —</option>
                  {trucks.map(t => <option key={t.id} value={t.id}>#{t.truck_number} — {t.driver_name}</option>)}
                </select>
                {trucks.length === 0 && <div style={{ fontSize:12, color:'#A32D2D', marginTop:4 }}>No trucks found. <Link href="/fleet" style={{ color:'#185FA5' }}>Add a truck first →</Link></div>}
              </div>
              <div>
                <label>Inspection type</label>
                <select value={inspType} onChange={e => setInspType(e.target.value)}>
                  <option>Routine weekly check</option>
                  <option>Before trip</option>
                  <option>After trip</option>
                  <option>After incident report</option>
                  <option>Monthly full inspection</option>
                </select>
              </div>
              <div>
                <label>Inspector name</label>
                <input value={inspector} onChange={e => setInspector(e.target.value)} placeholder="Your name" />
              </div>
              <div>
                <label>Notes (optional)</label>
                <textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Any context or notes about this inspection..." rows={3} />
              </div>
              <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                <input type="checkbox" id="baseline" checked={isBaseline} onChange={e => setIsBaseline(e.target.checked)} style={{ width:'auto', margin:0 }} />
                <label htmlFor="baseline" style={{ margin:0, cursor:'pointer' }}>This is a baseline inspection (first time documenting this truck)</label>
              </div>
            </div>
            <button className="btn btn-primary" style={{ marginTop:20 }} onClick={() => { if (!selectedTruck) { setError('Please select a truck.'); return } setError(''); setStep(2) }}>
              Next: upload photos →
            </button>
            {error && <div style={{ marginTop:10, color:'#A32D2D', fontSize:13 }}>{error}</div>}
          </div>
        )}

        {/* Step 2: Photos */}
        {step === 2 && (
          <div className="card" style={{ padding:'24px' }}>
            <div style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>Upload photos</div>
            <div style={{ fontSize:13, color:'#888', marginBottom:16 }}>Cover all sides of the truck: front, rear, driver side, passenger side, and any areas of concern.</div>

            <label htmlFor="photo-input" style={{ display:'block', border:'1.5px dashed rgba(0,0,0,0.2)', borderRadius:12, padding:'32px', textAlign:'center', cursor:'pointer', background:'#f9f9f8', marginBottom:14 }}>
              <div style={{ fontSize:32, marginBottom:8, color:'#aaa' }}>⬆</div>
              <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Tap to upload photos</div>
              <div style={{ fontSize:12, color:'#aaa' }}>JPG, PNG, HEIC supported · Multiple files OK</div>
              <input id="photo-input" type="file" accept="image/*" multiple onChange={handleFiles} style={{ display:'none' }} />
            </label>

            {previews.length > 0 && (
              <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px,1fr))', gap:8, marginBottom:16 }}>
                {previews.map((src, i) => (
                  <div key={i} style={{ position:'relative' }}>
                    <img src={src} style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.1)' }} />
                    <button onClick={() => removeFile(i)} style={{ position:'absolute', top:4, right:4, width:20, height:20, borderRadius:'50%', background:'rgba(0,0,0,0.6)', color:'white', border:'none', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                  </div>
                ))}
              </div>
            )}

            {error && <div style={{ color:'#A32D2D', fontSize:13, marginBottom:12 }}>{error}</div>}

            <div style={{ display:'flex', gap:8 }}>
              <button className="btn" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={runAnalysis} disabled={analyzing}>
                {analyzing ? 'Analyzing with AI...' : `Analyze ${files.length > 0 ? files.length + ' photo' + (files.length>1?'s':'') : ''} →`}
              </button>
            </div>

            {analyzing && (
              <div style={{ textAlign:'center', padding:'32px', marginTop:16 }}>
                <div style={{ width:32, height:32, border:'2px solid #ddd', borderTopColor:'#185FA5', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
                <div style={{ fontSize:13, color:'#888' }}>Analyzing photos with AI vision...</div>
                <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
              </div>
            )}
          </div>
        )}

        {/* Step 3: Results */}
        {step === 3 && result && (
          <div>
            <div className="card" style={{ padding:'24px', marginBottom:12 }}>
              <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                <div style={{ fontSize:15, fontWeight:500 }}>Analysis complete</div>
                <div style={{ fontSize:20, fontWeight:700, color: condColor(result.overallCondition) }}>{result.overallCondition}</div>
              </div>
              <div style={{ fontSize:13, color:'#555', lineHeight:1.6, marginBottom:14 }}>{result.summary}</div>

              <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:12, color:'#888', marginBottom:16 }}>
                <span>Urgency: <strong style={{ color:'#1a1a1a' }}>{result.estimatedRepairUrgency}</strong></span>
                {result.followUpRequired && <span style={{ color:'#A32D2D', fontWeight:500 }}>⚠ Follow-up required</span>}
              </div>

              {result.damages?.length > 0 ? (
                <div>
                  <div style={{ fontSize:12, fontWeight:500, color:'#888', marginBottom:8 }}>DAMAGE FINDINGS ({result.damages.length})</div>
                  {result.damages.map((d: any, i: number) => (
                    <div key={i} style={{ display:'flex', gap:10, padding:'10px', border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:8, marginBottom:8, background: d.is_new ? '#FCEBEB' : 'transparent' }}>
                      <div style={{ width:8, height:8, borderRadius:'50%', background: sevDot(d.severity), marginTop:5, flexShrink:0 }} />
                      <div>
                        <div style={{ fontSize:13, fontWeight:500 }}>{d.location} {d.is_new && <span style={{ fontSize:11, background:'#FCEBEB', color:'#A32D2D', padding:'1px 6px', borderRadius:10, marginLeft:4 }}>NEW</span>}</div>
                        <div style={{ fontSize:12, color:'#555', marginTop:2 }}>{d.description}</div>
                        {d.recommendation && <div style={{ fontSize:12, color:'#185FA5', marginTop:3 }}>→ {d.recommendation}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div style={{ padding:'16px', background:'#EAF3DE', borderRadius:8, fontSize:13, color:'#27500A' }}>No damage detected in submitted photos.</div>
              )}
            </div>

            <div style={{ display:'flex', gap:8 }}>
              {!saved ? (
                <button className="btn btn-primary" onClick={saveInspection} disabled={saving}>
                  {saving ? 'Saving...' : 'Save to fleet record'}
                </button>
              ) : (
                <div style={{ padding:'8px 16px', background:'#EAF3DE', color:'#27500A', borderRadius:8, fontSize:13, fontWeight:500 }}>✓ Saved to fleet record</div>
              )}
              <Link href="/" className="btn">Back to dashboard</Link>
              <button className="btn" onClick={() => { setStep(1); setResult(null); setFiles([]); setPreviews([]); setSaved(false) }}>New inspection</button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default function InspectPage() {
  return <Suspense fallback={<div />}><InspectContent /></Suspense>
}
