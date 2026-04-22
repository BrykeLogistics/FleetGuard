'use client'
import { useEffect, useCallback } from 'react'

interface Props {
  photos: { url: string; date?: string; label?: string }[]
  index: number
  onClose: () => void
  onNext: () => void
  onPrev: () => void
}

export default function PhotoLightbox({ photos, index, onClose, onNext, onPrev }: Props) {
  const photo = photos[index]
  const hasNext = index < photos.length - 1
  const hasPrev = index > 0

  // Keyboard navigation
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowRight' && hasNext) onNext()
      if (e.key === 'ArrowLeft' && hasPrev) onPrev()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [index, hasNext, hasPrev])

  // Prevent body scroll while open
  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = '' }
  }, [])

  // Touch swipe support
  let touchStartX = 0
  function onTouchStart(e: React.TouchEvent) { touchStartX = e.touches[0].clientX }
  function onTouchEnd(e: React.TouchEvent) {
    const dx = e.changedTouches[0].clientX - touchStartX
    if (dx < -50 && hasNext) onNext()
    if (dx > 50 && hasPrev) onPrev()
  }

  if (!photo) return null

  return (
    <div
      style={{ position:'fixed', inset:0, zIndex:1000, background:'rgba(0,0,0,0.95)', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center' }}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Top bar */}
      <div style={{ position:'absolute', top:0, left:0, right:0, display:'flex', alignItems:'center', justifyContent:'space-between', padding:'14px 16px', background:'linear-gradient(to bottom, rgba(0,0,0,0.7), transparent)', zIndex:10 }}>
        <div style={{ color:'rgba(255,255,255,0.8)', fontSize:13 }}>
          {index + 1} of {photos.length}{photo.label ? ` · ${photo.label}` : ''}{photo.date ? ` · ${photo.date}` : ''}
        </div>
        <button onClick={onClose} style={{ background:'rgba(255,255,255,0.15)', border:'none', color:'white', width:36, height:36, borderRadius:'50%', fontSize:18, cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center' }}>✕</button>
      </div>

      {/* Prev button */}
      {hasPrev && (
        <button onClick={onPrev} style={{ position:'absolute', left:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.15)', border:'none', color:'white', width:44, height:44, borderRadius:'50%', fontSize:20, cursor:'pointer', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center' }}>‹</button>
      )}

      {/* Photo */}
      <img
        src={photo.url}
        style={{ maxWidth:'100%', maxHeight:'calc(100vh - 100px)', objectFit:'contain', userSelect:'none', WebkitUserSelect:'none' }}
        draggable={false}
      />

      {/* Next button */}
      {hasNext && (
        <button onClick={onNext} style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'rgba(255,255,255,0.15)', border:'none', color:'white', width:44, height:44, borderRadius:'50%', fontSize:20, cursor:'pointer', zIndex:10, display:'flex', alignItems:'center', justifyContent:'center' }}>›</button>
      )}

      {/* Bottom thumbnails */}
      <div style={{ position:'absolute', bottom:0, left:0, right:0, padding:'12px 16px', background:'linear-gradient(to top, rgba(0,0,0,0.7), transparent)', display:'flex', gap:6, overflowX:'auto', justifyContent:'center' }}>
        {photos.map((p, i) => (
          <img
            key={i}
            src={p.url}
            onClick={() => { if (i < index) onPrev(); else if (i > index) onNext(); }}
            style={{ width:48, height:36, objectFit:'cover', borderRadius:4, cursor:'pointer', opacity: i === index ? 1 : 0.5, border: i === index ? '2px solid white' : '2px solid transparent', flexShrink:0, transition:'opacity 0.15s' }}
          />
        ))}
      </div>
    </div>
  )
}
