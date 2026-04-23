'use client'
import PhotoLightbox from './PhotoLightbox'
import { useState } from 'react'

interface Photo { url: string; label?: string; date?: string }
interface Props { photos: Photo[] }

export default function PhotoStrip({ photos }: Props) {
  const [index, setIndex] = useState<number|null>(null)
  const [hovered, setHovered] = useState<number|null>(null)
  const visible = photos.filter(p => p.url)
  if (visible.length === 0) return null

  return (
    <>
      {index !== null && (
        <PhotoLightbox
          photos={visible}
          index={index}
          onClose={() => setIndex(null)}
          onNext={() => setIndex(i => i !== null && i < visible.length - 1 ? i + 1 : i)}
          onPrev={() => setIndex(i => i !== null && i > 0 ? i - 1 : i)}
        />
      )}

      {/* Hover preview — desktop only, no transform glitching */}
      {hovered !== null && visible[hovered] && (
        <div style={{ position:'fixed', right:60, top:'50%', transform:'translateY(-50%)', zIndex:300, pointerEvents:'none' }}>
          <img src={visible[hovered].url}
            style={{ width:200, height:150, objectFit:'cover', borderRadius:10, border:'2px solid #185FA5' }} />
          {visible[hovered].label && (
            <div style={{ textAlign:'center', fontSize:11, color:'#555', marginTop:4 }}>{visible[hovered].label}</div>
          )}
        </div>
      )}

      <div style={{ position:'fixed', right:8, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:4, zIndex:100, maxHeight:'80vh', overflowY:'auto', padding:'4px' }}>
        <div style={{ fontSize:9, color:'#aaa', textAlign:'center', marginBottom:2 }}>Photos</div>
        {visible.map((p, i) => (
          <img key={i} src={p.url}
            onClick={() => setIndex(i)}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
            style={{ width:44, height:34, objectFit:'cover', borderRadius:5, cursor:'pointer', flexShrink:0,
              border: index === i ? '2px solid #185FA5' : hovered === i ? '1.5px solid #185FA5' : '1.5px solid rgba(0,0,0,0.12)' }} />
        ))}
      </div>
    </>
  )
}
