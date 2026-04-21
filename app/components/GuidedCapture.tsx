'use client'
import { useRef, useState, useEffect, useCallback } from 'react'

const SHOTS = [
  { id: 'front',        label: 'Front',              icon: '⬆', desc: 'Stand 15–20 ft away, centered on the front grille' },
  { id: 'rear',         label: 'Rear',               icon: '⬇', desc: 'Stand 15–20 ft away, centered on the rear doors' },
  { id: 'driver',       label: 'Driver side',        icon: '⬅', desc: 'Stand back far enough to see the full length' },
  { id: 'passenger',    label: 'Passenger side',     icon: '➡', desc: 'Stand back far enough to see the full length' },
  { id: 'front-left',   label: 'Front-left corner',  icon: '↖', desc: '45° angle from the front-left corner' },
  { id: 'front-right',  label: 'Front-right corner', icon: '↗', desc: '45° angle from the front-right corner' },
  { id: 'rear-left',    label: 'Rear-left corner',   icon: '↙', desc: '45° angle from the rear-left corner' },
  { id: 'rear-right',   label: 'Rear-right corner',  icon: '↘', desc: '45° angle from the rear-right corner' },
]

const STENCILS: Record<string, { viewBox: string, paths: { d: string, style?: any }[] }> = {
  front: {
    viewBox: '0 0 400 300',
    paths: [
      { d: 'M80 60 L320 60 L320 240 L80 240 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
      { d: 'M110 75 L290 75 L290 140 L110 140 Z', style: { fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.6)', strokeWidth:1.5, strokeDasharray:'6 4' } },
      { d: 'M88 155 L138 155 L138 185 L88 185 Z', style: { fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
      { d: 'M262 155 L312 155 L312 185 L262 185 Z', style: { fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 4' } },
      { d: 'M80 220 L320 220 L320 240 L80 240 Z', style: { fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.4)', strokeWidth:1, strokeDasharray:'4 4' } },
      { d: 'M98 232 A22 22 0 1 1 98.1 232 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M302 232 A22 22 0 1 1 302.1 232 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
    ]
  },
  rear: {
    viewBox: '0 0 400 300',
    paths: [
      { d: 'M70 50 L330 50 L330 250 L70 250 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
      { d: 'M75 55 L196 55 L196 245 L75 245 Z', style: { fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.55)', strokeWidth:1.5, strokeDasharray:'6 4' } },
      { d: 'M204 55 L325 55 L325 245 L204 245 Z', style: { fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.55)', strokeWidth:1.5, strokeDasharray:'6 4' } },
      { d: 'M200 55 L200 245', style: { fill:'none', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'4 3' } },
      { d: 'M168 148 L185 148 L185 158 L168 158 Z', style: { fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
      { d: 'M215 148 L232 148 L232 158 L215 158 Z', style: { fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
      { d: 'M72 60 L90 60 L90 110 L72 110 Z', style: { fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M310 60 L328 60 L328 110 L310 110 Z', style: { fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M70 242 L330 242 L330 255 L70 255 Z', style: { fill:'rgba(255,255,255,0.05)', stroke:'rgba(255,255,255,0.4)', strokeWidth:1 } },
    ]
  },
  driver: {
    viewBox: '0 0 400 300',
    paths: [
      { d: 'M30 70 L370 70 L370 250 L30 250 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
      { d: 'M30 70 L140 70 L140 250 L30 250 Z', style: { fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.4)', strokeWidth:1, strokeDasharray:'5 4' } },
      { d: 'M38 78 L132 78 L132 148 L38 148 Z', style: { fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.55)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M38 148 L132 148 L132 220 L38 220 Z', style: { fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2, strokeDasharray:'5 4' } },
      { d: 'M78 182 L108 182 L108 192 L78 192 Z', style: { fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
      { d: 'M140 70 L370 70 L370 250 L140 250 Z', style: { fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'6 5' } },
      { d: 'M68 238 A32 32 0 1 1 68.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
      { d: 'M295 238 A32 32 0 1 1 295.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
      { d: 'M315 238 A28 28 0 1 1 315.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M22 98 L40 98 L40 120 L22 120 Z', style: { fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.2 } },
    ]
  },
  passenger: {
    viewBox: '0 0 400 300',
    paths: [
      { d: 'M30 70 L370 70 L370 250 L30 250 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
      { d: 'M260 70 L370 70 L370 250 L260 250 Z', style: { fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.4)', strokeWidth:1, strokeDasharray:'5 4' } },
      { d: 'M268 78 L362 78 L362 148 L268 148 Z', style: { fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.55)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M268 148 L362 148 L362 220 L268 220 Z', style: { fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2, strokeDasharray:'5 4' } },
      { d: 'M292 182 L322 182 L322 192 L292 192 Z', style: { fill:'rgba(255,255,255,0.1)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1 } },
      { d: 'M30 70 L260 70 L260 250 L30 250 Z', style: { fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'6 5' } },
      { d: 'M85 238 A32 32 0 1 1 85.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
      { d: 'M325 238 A32 32 0 1 1 325.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'6 3' } },
      { d: 'M345 238 A28 28 0 1 1 345.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M360 98 L378 98 L378 120 L360 120 Z', style: { fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.2 } },
    ]
  },
  'front-left': {
    viewBox: '0 0 400 300',
    paths: [
      { d: 'M60 60 L300 60 L340 100 L340 250 L60 250 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
      { d: 'M60 60 L180 60 L180 250 L60 250 Z', style: { fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'5 4' } },
      { d: 'M65 68 L172 68 L172 145 L65 145 Z', style: { fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M180 60 L300 60 L340 100 L340 250 L180 250 Z', style: { fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'6 5' } },
      { d: 'M100 238 A28 28 0 1 1 100.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
      { d: 'M295 238 A28 28 0 1 1 295.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M52 100 L68 100 L68 122 L52 122 Z', style: { fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
    ]
  },
  'front-right': {
    viewBox: '0 0 400 300',
    paths: [
      { d: 'M100 60 L340 60 L340 250 L60 250 L60 100 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
      { d: 'M220 60 L340 60 L340 250 L220 250 Z', style: { fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'5 4' } },
      { d: 'M228 68 L335 68 L335 145 L228 145 Z', style: { fill:'rgba(255,255,255,0.07)', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M60 100 L220 60 L220 250 L60 250 Z', style: { fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.3)', strokeWidth:1, strokeDasharray:'6 5' } },
      { d: 'M105 238 A28 28 0 1 1 105.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M302 238 A28 28 0 1 1 302.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
      { d: 'M332 100 L348 100 L348 122 L332 122 Z', style: { fill:'rgba(255,255,255,0.08)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
    ]
  },
  'rear-left': {
    viewBox: '0 0 400 300',
    paths: [
      { d: 'M60 60 L340 60 L340 100 L280 250 L60 250 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
      { d: 'M280 60 L340 60 L340 100 L280 250 L220 250 L220 60 Z', style: { fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.2, strokeDasharray:'5 4' } },
      { d: 'M225 65 L295 65 L295 245 L225 245 Z', style: { fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'5 4' } },
      { d: 'M60 60 L220 60 L220 250 L60 250 Z', style: { fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.25)', strokeWidth:1, strokeDasharray:'6 5' } },
      { d: 'M95 238 A28 28 0 1 1 95.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M295 238 A28 28 0 1 1 295.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
      { d: 'M268 70 L280 70 L280 115 L268 115 Z', style: { fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
    ]
  },
  'rear-right': {
    viewBox: '0 0 400 300',
    paths: [
      { d: 'M60 100 L120 60 L340 60 L340 250 L60 250 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.9)', strokeWidth:2.5, strokeDasharray:'10 6' } },
      { d: 'M60 100 L120 60 L180 60 L180 250 L60 250 Z', style: { fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.4)', strokeWidth:1.2, strokeDasharray:'5 4' } },
      { d: 'M105 65 L175 65 L175 245 L105 245 Z', style: { fill:'rgba(255,255,255,0.04)', stroke:'rgba(255,255,255,0.35)', strokeWidth:1, strokeDasharray:'5 4' } },
      { d: 'M180 60 L340 60 L340 250 L180 250 Z', style: { fill:'rgba(255,255,255,0.03)', stroke:'rgba(255,255,255,0.25)', strokeWidth:1, strokeDasharray:'6 5' } },
      { d: 'M105 238 A28 28 0 1 1 105.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.6)', strokeWidth:2, strokeDasharray:'5 3' } },
      { d: 'M305 238 A28 28 0 1 1 305.1 238 Z', style: { fill:'none', stroke:'rgba(255,255,255,0.5)', strokeWidth:1.5, strokeDasharray:'5 3' } },
      { d: 'M120 70 L132 70 L132 115 L120 115 Z', style: { fill:'rgba(255,255,255,0.06)', stroke:'rgba(255,255,255,0.45)', strokeWidth:1.2 } },
    ]
  },
}

interface Props {
  onComplete: (frames: { shotId: string, label: string, dataUrl: string }[]) => void
  onCancel: () => void
}

export default function GuidedCapture({ onComplete, onCancel }: Props) {
  const [currentShot, setCurrentShot] = useState(0)
  const [captured, setCaptured] = useState<{ shotId: string, label: string, dataUrl: string }[]>([])
  const [mode, setMode] = useState<'intro'|'camera'|'review'>('intro')
  const [countdown, setCountdown] = useState<number|null>(null)
  const [cameraError, setCameraError] = useState('')
  const [lastDataUrl, setLastDataUrl] = useState('')
  const streamRef = useRef<MediaStream|null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const shot = SHOTS[currentShot]
  const stencil = STENCILS[shot.id]
  const progress = Math.round((currentShot / SHOTS.length) * 100)

  // Request camera ONCE on mount — keep stream alive for entire session
  useEffect(() => {
    requestCamera()
    return () => { streamRef.current?.getTracks().forEach(t => t.stop()) }
  }, [])

  // Attach stream to video whenever we enter camera mode
  useEffect(() => {
    if (mode === 'camera' && videoRef.current && streamRef.current) {
      videoRef.current.srcObject = streamRef.current
      videoRef.current.play().catch(() => {})
    }
  }, [mode])

  async function requestCamera() {
    setCameraError('')
    try {
      const s = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      })
      streamRef.current = s
      // Go straight to camera on first shot
      setMode('camera')
    } catch (err: any) {
      setCameraError('Camera access denied. Please allow camera access in your browser settings and try again.')
    }
  }

  function capturePhoto() {
    if (!videoRef.current || !canvasRef.current || countdown !== null) return
    setCountdown(3)
    let c = 3
    const t = setInterval(() => {
      c--
      setCountdown(c > 0 ? c : null)
      if (c <= 0) {
        clearInterval(t)
        const canvas = canvasRef.current!
        const video = videoRef.current!
        canvas.width = video.videoWidth || 1280
        canvas.height = video.videoHeight || 720
        canvas.getContext('2d')!.drawImage(video, 0, 0)
        const dataUrl = canvas.toDataURL('image/jpeg', 0.85)
        setLastDataUrl(dataUrl)
        setMode('review')
      }
    }, 1000)
  }

  function acceptPhoto() {
    const newCapture = { shotId: shot.id, label: shot.label, dataUrl: lastDataUrl }
    const newCaptured = [...captured, newCapture]
    setCaptured(newCaptured)
    if (currentShot < SHOTS.length - 1) {
      setCurrentShot(prev => prev + 1)
      setMode('camera')
    } else {
      onComplete(newCaptured)
    }
  }

  function retakePhoto() {
    setLastDataUrl('')
    setMode('camera')
  }

  function skipShot() {
    if (currentShot < SHOTS.length - 1) {
      setCurrentShot(prev => prev + 1)
      setMode('camera')
    } else {
      onComplete(captured)
    }
  }

  function finishEarly() {
    if (captured.length > 0) onComplete(captured)
    else onCancel()
  }

  return (
    <div style={{ borderRadius:12, overflow:'hidden', background:'#000', position:'relative' }}>
      <canvas ref={canvasRef} style={{ display:'none' }} />

      {/* Camera error */}
      {cameraError && (
        <div style={{ padding:24, textAlign:'center', background:'#1a1a1a' }}>
          <div style={{ color:'#F09595', fontSize:14, marginBottom:16 }}>{cameraError}</div>
          <button onClick={requestCamera} style={{ padding:'10px 20px', background:'#185FA5', color:'white', border:'none', borderRadius:8, fontSize:13, cursor:'pointer' }}>Try again</button>
        </div>
      )}

      {/* CAMERA MODE */}
      {mode === 'camera' && !cameraError && (
        <div style={{ position:'relative', width:'100%', aspectRatio:'4/3' }}>
          <video ref={videoRef} autoPlay playsInline muted style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />

          {/* Stencil overlay */}
          <svg width="100%" height="100%" viewBox={stencil.viewBox} preserveAspectRatio="xMidYMid meet"
            style={{ position:'absolute', inset:0, pointerEvents:'none' }}>
            {stencil.paths.map((p, i) => <path key={i} d={p.d} style={p.style} />)}
          </svg>

          {/* Vignette */}
          <div style={{ position:'absolute', inset:0, background:'radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.45) 100%)', pointerEvents:'none' }} />

          {/* Shot label + progress */}
          <div style={{ position:'absolute', top:12, left:0, right:0, display:'flex', flexDirection:'column', alignItems:'center', gap:6 }}>
            <div style={{ background:'rgba(0,0,0,0.6)', color:'white', padding:'5px 14px', borderRadius:20, fontSize:14, fontWeight:600 }}>
              {shot.icon} {shot.label}
            </div>
            <div style={{ background:'rgba(0,0,0,0.45)', color:'rgba(255,255,255,0.75)', padding:'3px 12px', borderRadius:16, fontSize:11 }}>
              {currentShot + 1} of {SHOTS.length} — align truck to dotted outline
            </div>
          </div>

          {/* Countdown overlay */}
          {countdown !== null && (
            <div style={{ position:'absolute', inset:0, display:'flex', alignItems:'center', justifyContent:'center', background:'rgba(0,0,0,0.35)', pointerEvents:'none' }}>
              <div style={{ fontSize:96, fontWeight:800, color:'white', lineHeight:1 }}>{countdown}</div>
            </div>
          )}

          {/* Progress bar */}
          <div style={{ position:'absolute', top:0, left:0, right:0, height:3, background:'rgba(255,255,255,0.15)' }}>
            <div style={{ height:'100%', background:'#185FA5', width:`${progress}%`, transition:'width 0.3s' }} />
          </div>

          {/* Bottom controls */}
          <div style={{ position:'absolute', bottom:16, left:0, right:0, display:'flex', alignItems:'center', justifyContent:'center', gap:20 }}>
            <button onClick={finishEarly} style={{ padding:'9px 16px', background:'rgba(255,255,255,0.15)', color:'white', border:'none', borderRadius:10, fontSize:12, cursor:'pointer' }}>
              {captured.length > 0 ? `Finish (${captured.length})` : 'Cancel'}
            </button>
            {/* Shutter button */}
            <button onClick={capturePhoto} disabled={countdown !== null}
              style={{ width:70, height:70, borderRadius:'50%', background:'white', border:'4px solid rgba(255,255,255,0.5)', cursor:'pointer', padding:0, display:'flex', alignItems:'center', justifyContent:'center', opacity: countdown !== null ? 0.6 : 1 }}>
              <div style={{ width:52, height:52, borderRadius:'50%', background:'white', border:'3px solid #185FA5' }} />
            </button>
            <button onClick={skipShot} style={{ padding:'9px 16px', background:'rgba(255,255,255,0.15)', color:'white', border:'none', borderRadius:10, fontSize:12, cursor:'pointer' }}>Skip</button>
          </div>
        </div>
      )}

      {/* REVIEW MODE */}
      {mode === 'review' && lastDataUrl && (
        <div style={{ position:'relative', width:'100%', aspectRatio:'4/3' }}>
          <img src={lastDataUrl} style={{ width:'100%', height:'100%', objectFit:'cover', display:'block' }} />
          <div style={{ position:'absolute', inset:0, background:'rgba(0,0,0,0.45)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'flex-end', padding:24, gap:12 }}>
            <div style={{ fontSize:15, fontWeight:600, color:'white' }}>Use this photo?</div>
            <div style={{ display:'flex', gap:12 }}>
              <button onClick={retakePhoto} style={{ padding:'11px 22px', background:'rgba(255,255,255,0.2)', color:'white', border:'none', borderRadius:10, fontSize:14, cursor:'pointer' }}>Retake</button>
              <button onClick={acceptPhoto} style={{ padding:'11px 26px', background:'#185FA5', color:'white', border:'none', borderRadius:10, fontSize:14, fontWeight:600, cursor:'pointer' }}>
                {currentShot < SHOTS.length - 1 ? `Next: ${SHOTS[currentShot + 1].label} →` : 'Finish ✓'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Captured thumbnails strip */}
      {captured.length > 0 && mode === 'camera' && (
        <div style={{ display:'flex', gap:4, padding:'8px 10px', background:'#111', overflowX:'auto' }}>
          {captured.map((c, i) => (
            <div key={i} style={{ position:'relative', flexShrink:0 }}>
              <img src={c.dataUrl} style={{ width:52, height:40, objectFit:'cover', borderRadius:5, border:'1.5px solid rgba(255,255,255,0.3)' }} />
              <div style={{ position:'absolute', bottom:2, left:0, right:0, textAlign:'center', fontSize:8, color:'rgba(255,255,255,0.7)' }}>{c.label.split(' ')[0]}</div>
            </div>
          ))}
          {SHOTS.slice(captured.length).map((s, i) => (
            <div key={i} style={{ width:52, height:40, borderRadius:5, border:'1.5px dashed rgba(255,255,255,0.2)', display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0 }}>
              <span style={{ fontSize:14 }}>{s.icon}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
