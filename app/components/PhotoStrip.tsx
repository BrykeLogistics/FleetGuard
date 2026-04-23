'use client'
import PhotoLightbox from './PhotoLightbox'
import { useState } from 'react'

interface Photo {
  url: string
  label?: string
  date?: string
}

interface Props {
  photos: Photo[]
}

export default function PhotoStrip({ photos }: Props) {
  const [index, setIndex] = useState<number|null>(null)
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
      <div style={{ position:'fixed', right:8, top:'50%', transform:'translateY(-50%)', display:'flex', flexDirection:'column', gap:4, zIndex:100, maxHeight:'80vh', overflowY:'auto', padding:'4px' }}>
        <div style={{ fontSize:9, color:'#aaa', textAlign:'center', marginBottom:2 }}>Photos</div>
        {visible.map((p, i) => (
          <img key={i} src={p.url} onClick={() => setIndex(i)}
            style={{ width:44, height:34, objectFit:'cover', borderRadius:5, cursor:'pointer', border: index === i ? '2px solid #185FA5' : '1.5px solid rgba(0,0,0,0.12)', flexShrink:0 }} />
        ))}
      </div>
    </>
  )
}
