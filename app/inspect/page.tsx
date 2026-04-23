'use client'
import { useEffect, useState, useRef, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { supabase } from '@/lib/supabase'
import Navbar from '../components/Navbar'
import GuidedCapture from '../components/GuidedCapture'
import DamageFeedback from '../components/DamageFeedback'
import PhotoStrip from '../components/PhotoStrip'
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

  // Live recording state
  const [isRecording, setIsRecording] = useState(false)
  const [recordingStream, setRecordingStream] = useState<MediaStream|null>(null)
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder|null>(null)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const [liveVideoUrl, setLiveVideoUrl] = useState<string>('')
  const [videoSubMode, setVideoSubMode] = useState<'choose'|'record'|'upload'>('choose')
  const recordingRef = useRef<HTMLVideoElement>(null)
  const chunksRef = useRef<Blob[]>([])
  const timerRef = useRef<NodeJS.Timeout|null>(null)

  const [analyzing, setAnalyzing] = useState(false)
  const [analyzeStatus, setAnalyzeStatus] = useState('')
  const [result, setResult] = useState<any>(null)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [savedInspectionId, setSavedInspectionId] = useState('')
  const [missedDamage, setMissedDamage] = useState('')
  const [error, setError] = useState('')
  const [showGuided, setShowGuided] = useState(false)

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

  // ── Live video recording ───────────────────────────────────────
  async function startRecording() {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      })
      setRecordingStream(stream)
      if (recordingRef.current) {
        recordingRef.current.srcObject = stream
        recordingRef.current.play().catch(() => {})
      }
      chunksRef.current = []
      const mimeType = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' :
                       MediaRecorder.isTypeSupported('video/webm;codecs=vp9') ? 'video/webm;codecs=vp9' : 'video/webm'
      const recorder = new MediaRecorder(stream, { mimeType })
      recorder.ondataavailable = e => { if (e.data.size > 0) chunksRef.current.push(e.data) }
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType })
        const url = URL.createObjectURL(blob)
        const file = new File([blob], 'recording.mp4', { type: mimeType })
        setLiveVideoUrl(url)
        setVideoFile(file)
        setVideoUrl(url)
        setVideoSubMode('upload')
        stream.getTracks().forEach(t => t.stop())
        setRecordingStream(null)
      }
      recorder.start(100)
      setMediaRecorder(recorder)
      setIsRecording(true)
      setRecordingSeconds(0)
      timerRef.current = setInterval(() => setRecordingSeconds(s => s + 1), 1000)
    } catch {
      alert('Camera access denied. Please allow camera access and try again.')
    }
  }

  function stopRecording() {
    mediaRecorder?.stop()
    setIsRecording(false)
    if (timerRef.current) clearInterval(timerRef.current)
    timerRef.current = null
  }

  function formatTime(s: number) {
    return `${Math.floor(s/60).toString().padStart(2,'0')}:${(s%60).toString().padStart(2,'0')}`
  }

  // ── Guided capture handler ─────────────────────────────────────
  function handleGuidedComplete(frames: { shotId: string, label: string, dataUrl: string }[]) {
    setShowGuided(false)
    const newPreviews = frames.map(f => f.dataUrl)
    setPreviews(prev => [...prev, ...newPreviews])
    setUploadMode('photo')
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
    const maxFrames = uploadMode === 'video' ? 8 : 8
    const images = await Promise.all(sourceFrames.slice(0, maxFrames).map(async (p) => ({
      media_type: 'image/jpeg',
      data: await resizeImage(p)
    })))

    setAnalyzeStatus('Running parallel AI analysis — this may take 10–20 seconds...')

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
          vehicleType: trucks.find(t => t.id === selectedTruck)?.vehicle_type || '',
          fleetType: trucks.find(t => t.id === selectedTruck)?.fleet_type || 'owned',
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
            repair_estimate_low: d.repairEstimate?.low || 0,
            repair_estimate_high: d.repairEstimate?.high || 0,
            repair_estimate_notes: d.repairEstimate?.notes || '',
            diy_replaceable: d.diyReplaceable || false,
            part_name: d.partName || '',
            part_search_query: d.partSearchQuery || '',
          }))
        )
      }

      // Save photos — convert base64 directly to blob (avoids Android blob URL expiry issues)
      const framesToSave = uploadMode === 'video' ? extractedFrames : previews
      for (let i = 0; i < Math.min(framesToSave.length, 8); i++) {
        try {
          const dataUrl = framesToSave[i]
          const base64 = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl
          const byteChars = atob(base64)
          const byteArr = new Uint8Array(byteChars.length)
          for (let j = 0; j < byteChars.length; j++) byteArr[j] = byteChars.charCodeAt(j)
          const blob = new Blob([byteArr], { type: 'image/jpeg' })
          const path = `${user.id}/${selectedTruck}/${insp.id}/photo_${i}.jpg`
          const { error: uploadError } = await supabase.storage.from('inspection-photos').upload(path, blob, { contentType: 'image/jpeg', upsert: true })
          if (!uploadError) {
            await supabase.from('inspection_photos').insert({ inspection_id: insp.id, truck_id: selectedTruck, storage_path: path, photo_type: uploadMode === 'video' ? 'video_frame' : 'photo', user_id: user.id })
          }
        } catch (photoErr) {
          console.error('Photo upload error:', photoErr)
        }
      }
    }

    setSaving(false)
    setSaved(true)
    if (insp) setSavedInspectionId(insp.id)
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

            {/* Show guided capture fullscreen when active */}
            {showGuided ? (
              <div>
                <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
                  <div style={{ fontSize:15, fontWeight:500 }}>Guided capture</div>
                  <button onClick={() => setShowGuided(false)} style={{ background:'none', border:'none', color:'#888', cursor:'pointer', fontSize:13 }}>✕ Cancel</button>
                </div>
                <GuidedCapture onComplete={handleGuidedComplete} onCancel={() => setShowGuided(false)} vehicleType={trucks.find(t => t.id === selectedTruck)?.vehicle_type} isRental={trucks.find(t => t.id === selectedTruck)?.fleet_type === 'rental'} />
              </div>
            ) : (
              <div>
                <div style={{ fontSize:15, fontWeight:500, marginBottom:16 }}>How do you want to capture?</div>

                {/* Option 1: Guided capture */}
                <div style={{ border:'2px solid #185FA5', borderRadius:12, padding:'16px', marginBottom:10, background:'#E6F1FB', cursor:'pointer' }} onClick={() => setShowGuided(true)}>
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                      <div style={{ fontSize:28 }}>📐</div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600, color:'#0C447C' }}>Guided capture <span style={{ fontSize:11, background:'#185FA5', color:'white', padding:'2px 8px', borderRadius:10, marginLeft:4 }}>Recommended</span></div>
                        <div style={{ fontSize:12, color:'#185FA5', marginTop:2 }}>Camera with truck stencil overlays · 8 guided shots</div>
                      </div>
                    </div>
                    <div style={{ fontSize:18, color:'#185FA5' }}>→</div>
                  </div>
                </div>

                {/* Option 2: Record now */}
                <div style={{ border: uploadMode === 'video' && videoSubMode === 'record' ? '2px solid #185FA5' : '0.5px solid rgba(0,0,0,0.15)', borderRadius:12, padding:'16px', marginBottom:10, background: uploadMode === 'video' && videoSubMode === 'record' ? '#f0f7ff' : 'white', cursor:'pointer' }}
                  onClick={() => { setUploadMode('video'); setVideoSubMode('record'); setShowGuided(false); startRecording() }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ fontSize:28 }}>🔴</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a' }}>Record now</div>
                      <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Record a walkaround video using your camera</div>
                    </div>
                  </div>
                </div>

                {/* Option 3: Upload photos */}
                <div style={{ border: uploadMode === 'photo' ? '2px solid #185FA5' : '0.5px solid rgba(0,0,0,0.15)', borderRadius:12, padding:'16px', marginBottom:10, background: uploadMode === 'photo' ? '#f0f7ff' : 'white', cursor:'pointer' }}
                  onClick={() => { setUploadMode('photo'); setShowGuided(false) }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ fontSize:28 }}>📷</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a' }}>Upload photos</div>
                      <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Choose existing photos from your camera roll</div>
                    </div>
                  </div>
                </div>

                {/* Option 4: Upload video */}
                <div style={{ border: uploadMode === 'video' && videoSubMode === 'upload' ? '2px solid #185FA5' : '0.5px solid rgba(0,0,0,0.15)', borderRadius:12, padding:'16px', marginBottom:16, background: uploadMode === 'video' && videoSubMode === 'upload' ? '#f0f7ff' : 'white', cursor:'pointer' }}
                  onClick={() => { setUploadMode('video'); setVideoSubMode('upload'); setShowGuided(false) }}>
                  <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                    <div style={{ fontSize:28 }}>📁</div>
                    <div>
                      <div style={{ fontSize:14, fontWeight:600, color:'#1a1a1a' }}>Upload video</div>
                      <div style={{ fontSize:12, color:'#888', marginTop:2 }}>Choose a pre-recorded video from your device</div>
                    </div>
                  </div>
                </div>

                {/* VIDEO upload UI */}
                {uploadMode === 'video' && (
                  <div style={{ marginBottom:14 }}>

                    {/* Sub-mode: live recording */}
                    {videoSubMode === 'record' && (
                      <div>
                        <div style={{ position:'relative', background:'#000', borderRadius:12, overflow:'hidden', marginBottom:12, minHeight:220 }}>
                          <video ref={recordingRef} autoPlay playsInline muted style={{ width:'100%', maxHeight:280, objectFit:'cover', display:'block' }} />
                          {isRecording && (
                            <div style={{ position:'absolute', top:12, left:12, display:'flex', alignItems:'center', gap:6, background:'rgba(0,0,0,0.6)', padding:'5px 12px', borderRadius:20 }}>
                              <div style={{ width:8, height:8, borderRadius:'50%', background:'#E24B4A', animation:'pulse 1s infinite' }} />
                              <span style={{ color:'white', fontSize:13, fontWeight:600 }}>{formatTime(recordingSeconds)}</span>
                            </div>
                          )}
                          {isRecording && (
                            <div style={{ position:'absolute', bottom:12, left:0, right:0, textAlign:'center' }}>
                              <div style={{ display:'inline-block', background:'rgba(0,0,0,0.5)', color:'rgba(255,255,255,0.75)', fontSize:12, padding:'4px 12px', borderRadius:16 }}>
                                Walk around the truck covering all sides
                              </div>
                            </div>
                          )}
                        </div>
                        <style>{`@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.3} }`}</style>
                        <div style={{ display:'flex', gap:8, marginTop:8 }}>
                          {isRecording ? (
                            <button onClick={stopRecording} style={{ flex:1, padding:'14px', background:'#E24B4A', color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer' }}>
                              ⏹ Stop recording — {formatTime(recordingSeconds)}
                            </button>
                          ) : (
                            <button onClick={startRecording} style={{ flex:1, padding:'14px', background:'#185FA5', color:'white', border:'none', borderRadius:10, fontSize:15, fontWeight:700, cursor:'pointer' }}>
                              🔴 Start recording
                            </button>
                          )}
                          <button className="btn" onClick={() => { stopRecording(); setUploadMode('photo'); setVideoSubMode('choose'); setVideoFile(null); setVideoUrl(''); setExtractedFrames([]) }}>Cancel</button>
                        </div>
                      </div>
                    )}

                    {/* Sub-mode: upload or review recorded video */}
                    {videoSubMode === 'upload' && (
                      <div>
                        {!videoFile ? (
                          <label htmlFor="video-input" style={{ display:'block', border:'1.5px dashed rgba(0,0,0,0.2)', borderRadius:12, padding:'28px', textAlign:'center', cursor:'pointer', background:'#f9f9f8' }}>
                            <div style={{ fontSize:32, marginBottom:8 }}>🎥</div>
                            <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Tap to upload walkaround video</div>
                            <div style={{ fontSize:12, color:'#aaa' }}>MP4, MOV, HEVC supported</div>
                            <input id="video-input" type="file" accept="video/*" onChange={handleVideoFile} style={{ display:'none' }} />
                          </label>
                        ) : (
                          <div>
                            <video ref={videoRef} src={videoUrl} controls style={{ width:'100%', borderRadius:10, marginBottom:12, background:'#000', maxHeight:260 }} />
                            <div style={{ display:'flex', gap:8, marginBottom:12, flexWrap:'wrap' }}>
                              <button className="btn btn-primary" onClick={extractFrames} disabled={extracting}>
                                {extracting ? `Extracting... ${extractProgress}%` : extractedFrames.length > 0 ? `Re-extract frames (${extractedFrames.length})` : 'Extract frames for AI →'}
                              </button>
                              <button className="btn" onClick={() => { setVideoFile(null); setVideoUrl(''); setExtractedFrames([]); setVideoSubMode('upload'); setVideoFile(null); setVideoUrl(''); setExtractedFrames([]) }}>Change</button>
                            </div>
                            {extracting && (
                              <div style={{ marginBottom:12 }}>
                                <div style={{ height:4, background:'#eee', borderRadius:2, overflow:'hidden' }}>
                                  <div style={{ height:'100%', background:'#185FA5', width:`${extractProgress}%`, transition:'width 0.3s' }} />
                                </div>
                              </div>
                            )}
                            {extractedFrames.length > 0 && (
                              <div>
                                <div style={{ fontSize:12, color:'#555', marginBottom:8 }}>{extractedFrames.length} frames extracted — tap × to remove any</div>
                                <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px,1fr))', gap:8 }}>
                                  {extractedFrames.map((src, i) => (
                                    <div key={i} style={{ position:'relative' }}>
                                      <img src={src} style={{ width:'100%', aspectRatio:'16/9', objectFit:'cover', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.1)' }} />
                                      <div style={{ position:'absolute', bottom:3, left:3, background:'rgba(0,0,0,0.55)', color:'white', fontSize:9, padding:'1px 4px', borderRadius:3 }}>Frame {i+1}</div>
                                      <button onClick={() => removeFrame(i)} style={{ position:'absolute', top:3, right:3, width:18, height:18, borderRadius:'50%', background:'rgba(0,0,0,0.6)', color:'white', border:'none', cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        )}
                
                      </div>
                    )}

                  </div>
                )}

                {/* PHOTO upload UI */}
                {uploadMode === 'photo' && (
                  <div style={{ marginBottom:14 }}>
                    <label htmlFor="photo-input" style={{ display:'block', border:'1.5px dashed rgba(0,0,0,0.2)', borderRadius:12, padding:'28px', textAlign:'center', cursor:'pointer', background:'#f9f9f8', marginBottom:10 }}>
                      <div style={{ fontSize:32, marginBottom:8, color:'#aaa' }}>⬆</div>
                      <div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Tap to choose photos</div>
                      <div style={{ fontSize:12, color:'#aaa' }}>JPG, PNG, HEIC · Multiple OK</div>
                      <input id="photo-input" type="file" accept="image/*" multiple onChange={handlePhotoFiles} style={{ display:'none' }} />
                    </label>
                    {previews.length > 0 && (
                      <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(100px,1fr))', gap:8 }}>
                        {previews.map((src, i) => (
                          <div key={i} style={{ position:'relative' }}>
                            <img src={src} style={{ width:'100%', aspectRatio:'4/3', objectFit:'cover', borderRadius:8, border:'0.5px solid rgba(0,0,0,0.1)' }} />
                            <button onClick={() => removePhoto(i)} style={{ position:'absolute', top:3, right:3, width:18, height:18, borderRadius:'50%', background:'rgba(0,0,0,0.6)', color:'white', border:'none', cursor:'pointer', fontSize:10, display:'flex', alignItems:'center', justifyContent:'center' }}>×</button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {error && <div style={{ color:'#A32D2D', fontSize:13, marginBottom:12 }}>{error}</div>}

                <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginTop:4 }}>
                  <button className="btn" onClick={() => setStep(1)}>← Back</button>
                  <button className="btn btn-primary" onClick={runAnalysis} disabled={analyzing || !readyToAnalyze}>
                    {analyzing ? 'Analyzing...' : readyToAnalyze ? `Analyze ${sourceFrames.length} frame${sourceFrames.length > 1 ? 's' : ''} with AI →` : 'Select capture method above'}
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
          </div>
        )}

        {/* ── Step 3: Results ── */}
        {step === 3 && result && (
          <div style={{ paddingBottom: 80 }}>



            <div style={{ display:'flex', gap:0, alignItems:'flex-start' }}>

              {/* ── Main report content ── */}
              <div style={{ flex:1, minWidth:0, marginRight: sourceFrames.length > 0 ? 56 : 0 }}>
                <div className="card" style={{ padding:'16px', marginBottom:12 }}>

                  {/* Header */}
                  <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:8 }}>
                    <div style={{ fontSize:15, fontWeight:500 }}>Analysis complete</div>
                    <div style={{ fontSize:20, fontWeight:700, color: condColor(result.overallCondition) }}>{result.overallCondition}</div>
                  </div>
                  <div style={{ fontSize:13, color:'#555', lineHeight:1.6, marginBottom:10 }}>{result.summary}</div>
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', fontSize:12, color:'#888', marginBottom:12 }}>
                    <span>Urgency: <strong style={{ color:'#1a1a1a' }}>{result.estimatedRepairUrgency}</strong></span>
                    {result.followUpRequired && <span style={{ color:'#A32D2D', fontWeight:500 }}>⚠ Follow-up required</span>}
                    {result.lowConfidenceFindings > 0 && <span style={{ color:'#633806', fontWeight:500 }}>⚠ {result.lowConfidenceFindings} finding{result.lowConfidenceFindings > 1 ? 's' : ''} need verification</span>}
                  </div>

                  {/* Total cost */}
                  {result.totalEstimatedRepairCost && (result.totalEstimatedRepairCost.low > 0 || result.totalEstimatedRepairCost.high > 0) && (
                    <div style={{ background:'#FAEEDA', borderRadius:8, padding:'10px 14px', marginBottom:12, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
                      <div style={{ fontSize:12, fontWeight:500, color:'#633806' }}>Total estimated repairs</div>
                      <div style={{ fontSize:16, fontWeight:700, color:'#854F0B' }}>${result.totalEstimatedRepairCost.low.toLocaleString()} – ${result.totalEstimatedRepairCost.high.toLocaleString()}</div>
                    </div>
                  )}

                  {/* Damage list */}
                  {result.damages?.length > 0 ? (
                    <div>
                      <div style={{ fontSize:11, fontWeight:500, color:'#888', marginBottom:8, textTransform:'uppercase', letterSpacing:'0.05em' }}>Damage findings ({result.damages.length})</div>
                      {result.damages.map((d: any, i: number) => (
                        <div key={i} style={{ border:'0.5px solid rgba(0,0,0,0.08)', borderRadius:10, marginBottom:8, background: d.is_new ? '#FCEBEB' : 'white', overflow:'hidden' }}>
                          <div style={{ display:'flex', gap:10, padding:'11px 12px' }}>
                            <div style={{ width:8, height:8, borderRadius:'50%', background: sevDot(d.severity), marginTop:4, flexShrink:0 }} />
                            <div style={{ flex:1, minWidth:0 }}>
                              <div style={{ fontSize:13, fontWeight:500, display:'flex', flexWrap:'wrap', alignItems:'center', gap:4, marginBottom:3 }}>
                                <span>{d.location}</span>
                                {d.is_new && <span style={{ fontSize:10, background:'#FCEBEB', color:'#A32D2D', padding:'1px 6px', borderRadius:10 }}>NEW</span>}
                                {d.diyReplaceable && <span style={{ fontSize:10, background:'#EAF3DE', color:'#27500A', padding:'1px 6px', borderRadius:10 }}>DIY</span>}
                                {d.confidence !== undefined && d.confidence < 70 && <span style={{ fontSize:10, background:'#FAEEDA', color:'#633806', padding:'1px 6px', borderRadius:10 }}>⚠ Verify</span>}
                              </div>
                              <div style={{ fontSize:12, color:'#555', lineHeight:1.5 }}>{d.description}</div>
                              {d.recommendation && <div style={{ fontSize:12, color:'#185FA5', marginTop:3 }}>→ {d.recommendation}</div>}
                              {d.repairEstimate && (d.repairEstimate.low > 0 || d.repairEstimate.high > 0) && (
                                <div style={{ fontSize:12, color:'#633806', marginTop:4, fontWeight:500 }}>
                                  Est: ${d.repairEstimate.low.toLocaleString()} – ${d.repairEstimate.high.toLocaleString()}
                                  {d.repairEstimate.method && <span style={{ fontWeight:400, color:'#888' }}> · {d.repairEstimate.method}</span>}
                                </div>
                              )}
                            </div>
                          </div>
                          {d.diyReplaceable && d.partSearchQuery && (
                            <div style={{ borderTop:'0.5px solid rgba(0,0,0,0.07)', padding:'8px 12px', background:'rgba(0,0,0,0.02)', display:'flex', alignItems:'center', gap:6, flexWrap:'wrap' }}>
                              <span style={{ fontSize:11, color:'#888' }}>Find parts:</span>
                              {[
                                { name:'Amazon', url:`https://www.amazon.com/s?k=${encodeURIComponent(d.partSearchQuery)}&i=automotive` },
                                { name:'RockAuto', url:`https://www.rockauto.com/en/partsgroup/${encodeURIComponent(d.partSearchQuery.split(' ').slice(0,4).join('+')).toLowerCase()}` },
                                { name:'eBay Motors', url:`https://www.ebay.com/sch/i.html?_nkw=${encodeURIComponent(d.partSearchQuery)}&_sacat=6000` },
                              ].map(link => (
                                <a key={link.name} href={link.url} target="_blank" rel="noopener noreferrer"
                                  style={{ fontSize:11, fontWeight:500, color:'#185FA5', background:'#E6F1FB', padding:'3px 9px', borderRadius:20, textDecoration:'none' }}>
                                  {link.name} →
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div style={{ padding:'16px', background:'#EAF3DE', borderRadius:8, fontSize:13, color:'#27500A' }}>No damage detected.</div>
                  )}

                  {/* Did I miss anything */}
                  <div style={{ marginTop:14, background:'#f7f7f6', borderRadius:10, padding:'12px 14px' }}>
                    <div style={{ fontSize:13, fontWeight:500, marginBottom:8, color:'#1a1a1a' }}>Did I miss anything?</div>
                    <textarea
                      value={missedDamage}
                      onChange={e => setMissedDamage(e.target.value)}
                      placeholder="Describe any damage not listed above — location, what you see, how severe..."
                      rows={4}
                      style={{ width:'100%', fontSize:13, border:'0.5px solid rgba(0,0,0,0.15)', borderRadius:8, padding:'10px 12px', resize:'vertical', lineHeight:1.5, background:'white', color:'#1a1a1a', boxSizing:'border-box' }}
                    />
                  </div>

                  {/* Post-save feedback */}
                  {saved && savedInspectionId && (
                    <div style={{ marginTop:12 }}>
                      <DamageFeedback inspectionId={savedInspectionId} truckId={selectedTruck} onSubmitted={() => {}} />
                    </div>
                  )}
                </div>

                {/* Secondary actions */}
                {saved && (
                  <div style={{ display:'flex', gap:8, flexWrap:'wrap', marginBottom:8 }}>
                    <Link href="/" className="btn">Back to dashboard</Link>
                    <button className="btn" onClick={() => { setStep(1); setResult(null); setFiles([]); setPreviews([]); setVideoFile(null); setVideoUrl(''); setExtractedFrames([]); setSaved(false); setSavedInspectionId(''); setMissedDamage('') }}>New inspection</button>
                  </div>
                )}
              </div>

              <PhotoStrip photos={sourceFrames.map((src, i) => ({ url: src, label: `Photo ${i + 1}` }))} />
            </div>

            {/* ── Sticky submit bar ── */}
            <div style={{ position:'fixed', bottom:0, left:0, right:0, background:'white', borderTop:'0.5px solid rgba(0,0,0,0.1)', padding:'10px 16px', zIndex:200 }}>
              {!saved ? (
                <button
                  onClick={saveInspection}
                  disabled={saving}
                  style={{ width:'100%', padding:'14px', background: saving ? '#aaa' : '#185FA5', color:'white', border:'none', borderRadius:10, fontSize:16, fontWeight:600, cursor: saving ? 'default' : 'pointer', letterSpacing:'0.02em' }}>
                  {saving ? 'Saving...' : 'Submit inspection'}
                </button>
              ) : (
                <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:8, padding:'10px' }}>
                  <div style={{ fontSize:14, fontWeight:500, color:'#27500A' }}>✓ Submitted successfully</div>
                </div>
              )}
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
