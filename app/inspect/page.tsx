'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
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

  // Media state
  const [uploadMode, setUploadMode] = useState<'photo'|'video'>('video')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [videoFile, setVideoFile] = useState<File|null>(null)
  const [videoUrl, setVideoUrl] = useState<string>('')
  const [extractedFrames, setExtractedFrames] = useState<string[]>([])
  const [extracting, setExtracting] = useState(false)
  const [extractProgress, setExtractProgress] = useState(0)
  const videoRef = useRef<HTMLVideoElement>(null)

  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeStatus, setAnalyzeStatus] = useState('')
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

  // ── Photo handling ──────────────────────────────────────────────
  function handlePhotoFiles(e: React.ChangeEvent<HTMLInputElement>) {
    const newFiles = Array.from(e.target.files || [])
    setFiles(prev => [...prev, ...newFiles])
    newFiles.forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => setPreviews(prev => [...prev, ev.target?.result as string])
      reader.readAsDataURL(f)
    })
  }

  function removePhoto(idx: number) {
    setFiles(prev => prev.filter((_, i) => i !== idx))
    setPreviews(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Video handling & frame extraction ──────────────────────────
  function handleVideoFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setVideoFile(file)
    setExtractedFrames([])
    setExtractProgress(0)
    const url = URL.createObjectURL(file)
    setVideoUrl(url)
  }

  async function extractFrames() {
    if (!videoRef.current || !videoUrl) return
    setExtracting(true)
    setExtractProgress(0)
    setExtractedFrames([])

    const video = videoRef.current
    video.src = videoUrl
    video.muted = true

    await new Promise<void>(resolve => {
      video.onloadedmetadata = () => resolve()
      video.load()
    })

    const duration = video.duration
    // Extract 1 frame every 3 seconds, max 8 frames
    const interval = Math.max(duration / 8, 3)
    const timestamps: number[] = []
    for (let t = 1; t < duration; t += interval) {
      timestamps.push(Math.min(t, duration - 0.1))
    }
    if (timestamps.length === 0) timestamps.push(duration / 2)

    const frames: string[] = []
    const canvas = document.createElement('canvas')
    const ctx = canvas.getContext('2d')!

    for (let i = 0; i < timestamps.length; i++) {
      const t = timestamps[i]
      await new Promise<void>(resolve => {
        video.currentTime = t
        video.onseeked = () => {
          canvas.width = Math.min(video.videoWidth, 1280)
          canvas.height = Math.round(video.videoHeight * (canvas.width / video.videoWidth))
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          frames.push(canvas.toDataURL('image/jpeg', 0.75))
          setExtractProgress(Math.round(((i + 1) / timestamps.length) * 100))
          resolve()
        }
      })
    }

    setExtractedFrames(frames)
    setExtracting(false)
  }

  function removeFrame(idx: number) {
    setExtractedFrames(prev => prev.filter((_, i) => i !== idx))
  }

  // ── Resize helper ───────────────────────────────────────────────
  const resizeImage = (dataUrl: string): Promise<string> => {
    return new Promise(resolve => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const maxSize = 1000
        let w = img.width, h = img.height
        if (w > maxSize || h > maxSize) {
          if (w > h) { h = Math.round(h * maxSize / w); w = maxSize }
          else { w = Math.round(w * maxSize / h); h = maxSize }
        }
        canvas.width = w; canvas.height = h
        canvas.getContext('2d')!.drawImage(img, 0, 0, w, h)
        resolve(canvas.toDataURL('image/jpeg', 0.75).split(',')[1])
      }
      img.src = dataUrl
    })
  }

  // ── AI Analysis ─────────────────────────────────────────────────
  async function runAnalysis() {
    const sourceFrames = uploadMode === 'video' ? extractedFrames : previews
    if (!selectedTruck) { setError('Please select a truck first.'); return }
    if (sourceFrames.length === 0) { setError(uploadMode === 'video' ? 'Please extract frames from your video first.' : 'Please upload at least one photo.'); return }

    setAnalyzing(true); setError('')
    setAnalyzeStatus('Loading truck data...')

    const truck = trucks.find(t => t.id === selectedTruck)

    let baselineDamages: any[] = []
    if (!isBaseline) {
      const { data } = await supabase.from('damages').select('*').eq('truck_id', selectedTruck).eq('is_new', false)
      baselineDamages = data || []
    }

    setAnalyzeStatus(`Preparing ${Math.min(sourceFrames.length, 6)} frame${sourceFrames.length > 1 ? 's' : ''} for AI analysis...`)

    // Use up to 6 frames for video, 3 for photos
    const maxFrames = uploadMode === 'video' ? 6 : 3
    const images = await Promise.all(sourceFrames.slice(0, maxFrames).map(async (p) => ({
      media_type: 'image/jpeg',
      data: await resizeImage(p)
    })))

    setAnalyzeStatus('Analyzing with AI vision — this may take 15–30 seconds...')

    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          images,
          truckInfo: `Truck #${truck?.truck_number} - ${truck?.driver_name} (${truck?.year} ${truck?.make} ${truck?.model})`,
          inspectionType: inspType,
          inspector,
          notes: notes + (uploadMode === 'video' ? ` [Video walkaround — ${images.length} frames extracted]` : ''),
          baselineDamages,
        })
      })
      const rawText = await res.text()
      let data
      try { data = JSON.parse(rawText) } catch { throw new Error('Server error: ' + rawText.slice(0, 200)) }
      if (data.error) throw new Error(data.error)
      setResult(data)
      setStep(3)
    } catch (err: any) {
      setError(err.message)
    }
    setAnalyzing(false)
    setAnalyzeStatus('')
  }

  // ── Save inspection ─────────────────────────────────────────────
  async function saveInspection() {
    if (!result || !selectedTruck) return
    setSaving(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

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
      if (result.damages?.length > 0) {
        await supabase.from('damages').insert(
          result.damages.map((d: any) => ({
            inspection_id: insp.id, truck_id: selectedTruck,
            severity: d.severity, location: d.location,
            description: d.description, recommendation: d.recommendation || '',
            is_new: d.is_new, user_id: user.id,
          }))
        )
      }

      // Save extracted frames as photos
      const framesToSave = uploadMode === 'video' ? extractedFrames : previews
      for (let i = 0; i < Math.min(framesToSave.length, 8); i++) {
        const base64 = framesToSave[i].split(',')[1]
        const blob = await (await fetch(framesToSave[i])).blob()
        const path = `${user.id}/${selectedTruck}/${insp.id}/frame_${i}.jpg`
        await supabase.storage.from('inspection-photos').upload(path, blob)
        await supabase.from('inspection_photos').insert({ inspection_id: insp.id, truck_id: selectedTruck, storage_path: path, photo_type: uploadMode === 'video' ? 'video_frame' : 'photo', user_id: user.id })
      }
    }

    setSaving(false)
    setSaved(true)
  }

  const condColor = (c: string) => c === 'Good' ? '#27500A' : (c === 'Critical' || c === 'Poor') ? '#A32D2D' : '#633806'
  const sevDot = (s: string) => s === 'critical' ? '#E24B4A' : s === 'moderate' ? '#EF9F27' : '#639922'
  const sourceFrames = uploadMode === 'video' ? extractedFrames : previews
  const readyToAnalyze = sourceFrames.length > 0

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth:720, margin:'0 auto', padding:'24px 16px' }}>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>

        {/* Steps */}
        <div style={{ display:'flex', marginBottom:24, borderBottom:'0.5px solid rgba(0,0,0,0.1)' }}>
          {['1. Setup', '2. Media', '3. Results'].map((label, i) => (
            <div key={label} onClick={() => { if (i+1 <= step) setStep(i+1) }} style={{ padding:'10px 20px', fontSize:13, fontWeight:500, cursor: i+1 <= step ? 'pointer' : 'default', borderBottom: step === i+1 ? '2px solid #185FA5' : '2px solid transparent', color: step === i+1 ? '#185FA5' : i+1 < step ? '#555' : '#aaa' }}>
              {label}
            </div>
          ))}
        </div>

        {/* ── Step 1: Setup ── */}
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
              Next: upload media →
            </button>
            {error && <div style={{ marginTop:10, color:'#A32D2D', fontSize:13 }}>{error}</div>}
          </div>
        )}

        {/* ── Step 2: Media ── */}
        {step === 2 && (
          <div className="card" style={{ padding:'24px' }}>
            <div style={{ fontSize:15, fontWeight:500, marginBottom:6 }}>Upload media</div>

            {/* Mode toggle */}
            <div style={{ display:'flex', gap:8, marginBottom:20, marginTop:12 }}>
              <button onClick={() => { setUploadMode('video'); setFiles([]); setPreviews([]) }} style={{ flex:1, padding:'12px', borderRadius:10, border: uploadMode === 'video' ? '2px solid #185FA5' : '0.5px solid rgba(0,0,0,0.15)', background: uploadMode === 'video' ? '#E6F1FB' : 'white', cursor:'pointer', textAlign:'center' }}>
                <div style={{ fontSize:22, marginBottom:4 }}>🎥</div>
                <div style={{ fontSize:13, fontWeight:500, color: uploadMode === 'video' ? '#0C447C' : '#1a1a1a' }}>Video walkaround</div>
                <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Recommended · More comprehensive</div>
              </button>
              <button onClick={() => { setUploadMode('photo'); setVideoFile(null); setVideoUrl(''); setExtractedFrames([]) }} style={{ flex:1, padding:'12px', borderRadius:10, border: uploadMode === 'photo' ? '2px solid #185FA5' : '0.5px solid rgba(0,0,0,0.15)', background: uploadMode === 'photo' ? '#E6F1FB' : 'white', cursor:'pointer', textAlign:'center' }}>
                <div style={{ fontSize:22, marginBottom:4 }}>📷</div>
                <div style={{ fontSize:13, fontWeight:500, color: uploadMode === 'photo' ? '#0C447C' : '#1a1a1a' }}>Photos</div>
                <div style={{ fontSize:11, color:'#888', marginTop:2 }}>Upload individual photos</div>
              </button>
            </div>

            {/* VIDEO MODE */}
            {uploadMode === 'video' && (
              <div>
                <div style={{ fontSize:13, color:'#555', marginBottom:12, lineHeight:1.6 }}>
                  Record a 30–60 second walkaround video of the truck covering all sides — front, rear, driver side, passenger side, and any areas of concern. The app will automatically extract frames for AI analysis.
                </div>

                {!videoFile ? (
                  <label htmlFor="video-input" style={{ display:'block', border:'1.5px dashed rgba(0,0,0,0.2)', borderRadius:12, padding:'32px', textAlign:'center', cursor:'pointer', background:'#f9f9f8', marginBottom:14 }}>
                    <div style={{ fontSize:36, marginBottom:8 }}>🎥</div>
                    <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Tap to upload walkaround video</div>
                    <div style={{ fontSize:12, color:'#aaa' }}>MP4, MOV, HEVC supported</div>
                    <input id="video-input" type="file" accept="video/*" onChange={handleVideoFile} style={{ display:'none' }} />
                  </label>
                ) : (
                  <div>
                    <video ref={videoRef} src={videoUrl} controls style={{ width:'100%', borderRadius:10, marginBottom:12, background:'#000', maxHeight:280 }} />
                    <div style={{ display:'flex', gap:8, marginBottom:14, flexWrap:'wrap' }}>
                      <button className="btn btn-primary" onClick={extractFrames} disabled={extracting}>
                        {extracting ? `Extracting frames... ${extractProgress}%` : extractedFrames.length > 0 ? `Re-extract frames (${extractedFrames.length} found)` : 'Extract frames for AI analysis'}
                      </button>
                      <button className="btn" onClick={() => { setVideoFile(null); setVideoUrl(''); setExtractedFrames([]) }}>Change video</button>
                    </div>

                    {extracting && (
                      <div style={{ marginBottom:14 }}>
                        <div style={{ height:4, background:'#eee', borderRadius:2, overflow:'hidden' }}>
                          <div style={{ height:'100%', background:'#185FA5', borderRadius:2, width:`${extractProgress}%`, transition:'width 0.3s' }} />
                        </div>
                        <div style={{ fontSize:12, color:'#888', marginTop:6 }}>Extracting frames from video...</div>
                      </div>
                    )}

                    {extractedFrames.length > 0 && (
                      <div>
                        <div style={{ fontSize:12, fontWeight:500, color:'#555', marginBottom:8 }}>{extractedFrames.length} frames extracted — tap × to remove any you don't want included</div>
                        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(110px,1fr))', gap:8, marginBottom:16 }}>
                          {extractedFrames.map((src, i) => (
                            <div key={i} style={{ position:'relative' }}>
                              <img src={src} style={{ width:'100%', aspectRatio:'16/9', objectFit:'cover', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.1)' }} />
                              <div style={{ position:'absolute', bottom:4, left:4, background:'rgba(0,0,0,0.55)', color:'white', fontSize:10, padding:'2px 5px', borderRadius:4 }}>Frame {i+1}</div>
                              <button onClick={() => removeFrame(i)} style={{ position:'absolute', top:4, right:4, width:20, height:20, borderRadius:'50%', background:'rgba(0,0,0,0.6)', color:'white', border:'none', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* PHOTO MODE */}
            {uploadMode === 'photo' && (
              <div>
                <div style={{ fontSize:13, color:'#555', marginBottom:12 }}>Cover all sides of the truck: front, rear, driver side, passenger side, and any areas of concern.</div>
                <label htmlFor="photo-input" style={{ display:'block', border:'1.5px dashed rgba(0,0,0,0.2)', borderRadius:12, padding:'32px', textAlign:'center', cursor:'pointer', background:'#f9f9f8', marginBottom:14 }}>
                  <div style={{ fontSize:32, marginBottom:8, color:'#aaa' }}>⬆</div>
                  <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Tap to upload photos</div>
                  <div style={{ fontSize:12, color:'#aaa' }}>JPG, PNG, HEIC · Multiple files OK</div>
                  <input id="photo-input" type="file" accept="image/*" multiple onChange={handlePhotoFiles} style={{ display:'none' }} />
                </label>
                {previews.length > 0 && (
                  <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px,1fr))', gap:8, marginBottom:16 }}>
                    {previews.map((src, i) => (
                      <div key={i} style={{ position:'relative' }}>
                        <img src={src} style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.1)' }} />
                        <button onClick={() => removePhoto(i)} style={{ position:'absolute', top:4, right:4, width:20, height:20, borderRadius:'50%', background:'rgba(0,0,0,0.6)', color:'white', border:'none', cursor:'pointer', fontSize:11, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {error && <div style={{ color:'#A32D2D', fontSize:13, marginBottom:12 }}>{error}</div>}

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className="btn" onClick={() => setStep(1)}>← Back</button>
              <button className="btn btn-primary" onClick={runAnalysis} disabled={analyzing || !readyToAnalyze}>
                {analyzing ? 'Analyzing...' : readyToAnalyze ? `Analyze ${sourceFrames.length} frame${sourceFrames.length > 1 ? 's' : ''} with AI →` : uploadMode === 'video' ? 'Extract frames first' : 'Upload photos first'}
              </button>
            </div>

            {analyzing && (
              <div style={{ textAlign:'center', padding:'32px', marginTop:16 }}>
                <div style={{ width:32, height:32, border:'2px solid #ddd', borderTopColor:'#185FA5', borderRadius:'50%', animation:'spin 0.8s linear infinite', margin:'0 auto 12px' }} />
                <div style={{ fontSize:13, color:'#888' }}>{analyzeStatus || 'Analyzing with AI vision...'}</div>
              </div>
            )}
          </div>
        )}

        {/* ── Step 3: Results ── */}
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
                <span style={{ color:'#888' }}>· {sourceFrames.length} frame{sourceFrames.length > 1 ? 's' : ''} analyzed</span>
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
                <div style={{ padding:'16px', background:'#EAF3DE', borderRadius:8, fontSize:13, color:'#27500A' }}>No damage detected in submitted frames.</div>
              )}

              {/* Frame thumbnails */}
              {sourceFrames.length > 0 && (
                <div style={{ marginTop:16 }}>
                  <div style={{ fontSize:12, color:'#888', marginBottom:8 }}>Frames analyzed</div>
                  <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                    {sourceFrames.slice(0, 6).map((src, i) => (
                      <img key={i} src={src} style={{ width:80, height:50, objectFit:'cover', borderRadius:6, border:'0.5px solid rgba(0,0,0,0.1)' }} />
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              {!saved ? (
                <button className="btn btn-primary" onClick={saveInspection} disabled={saving}>
                  {saving ? 'Saving...' : 'Save to fleet record'}
                </button>
              ) : (
                <div style={{ padding:'8px 16px', background:'#EAF3DE', color:'#27500A', borderRadius:8, fontSize:13, fontWeight:500 }}>✓ Saved to fleet record</div>
              )}
              <Link href="/" className="btn">Back to dashboard</Link>
              <button className="btn" onClick={() => { setStep(1); setResult(null); setFiles([]); setPreviews([]); setVideoFile(null); setVideoUrl(''); setExtractedFrames([]); setSaved(false) }}>New inspection</button>
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
