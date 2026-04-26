'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/useProfile'
import Navbar from '../components/Navbar'

export default function AdminPage() {
  const { isOwner, loading: profileLoading } = useProfile()
  const [reviews, setReviews] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [approving, setApproving] = useState<string|null>(null)

  useEffect(() => { if (!profileLoading) loadReviews() }, [profileLoading])

  async function loadReviews() {
    const { data } = await supabase.from('prompt_reviews').select('*').order('created_at', { ascending: false })
    setReviews(data || [])
    setLoading(false)
  }

  async function updateStatus(id: string, status: 'approved'|'rejected') {
    setApproving(id)
    await supabase.from('prompt_reviews').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)
    loadReviews()
    setApproving(null)
  }

  if (profileLoading) return <div />
  if (!isOwner) return (
    <div><Navbar />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'48px 16px', textAlign:'center', color:'#888' }}>Access restricted to owners only.</div>
    </div>
  )

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px' }}>
        <div style={{ fontSize:18, fontWeight:600, marginBottom:4 }}>Prompt review</div>
        <div style={{ fontSize:13, color:'#888', marginBottom:20 }}>AI-generated suggestions based on manager feedback every 14 days. Review and approve before changes go live.</div>

        {loading ? <div style={{ textAlign:'center', padding:'40px', color:'#888' }}>Loading...</div> : reviews.length === 0 ? (
          <div className="card" style={{ padding:'48px', textAlign:'center', color:'#888', fontSize:13 }}>
            No reviews yet. The first review will run automatically in 14 days, or when managers submit "Did I miss anything?" feedback.
          </div>
        ) : reviews.map(r => (
          <div key={r.id} className="card" style={{ padding:'20px', marginBottom:12 }}>
            <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12, flexWrap:'wrap', gap:8 }}>
              <div>
                <div style={{ fontSize:14, fontWeight:500 }}>Review — {new Date(r.created_at).toLocaleDateString()}</div>
                <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{r.feedback_items?.length || 0} feedback items analyzed</div>
              </div>
              <span style={{ fontSize:12, fontWeight:500, padding:'3px 10px', borderRadius:20, background: r.status==='approved'?'#EAF3DE':r.status==='rejected'?'#FCEBEB':'#FAEEDA', color: r.status==='approved'?'#27500A':r.status==='rejected'?'#A32D2D':'#633806' }}>
                {r.status}
              </span>
            </div>

            <div style={{ background:'#f7f7f6', borderRadius:8, padding:'14px', marginBottom:12, fontSize:13, lineHeight:1.7, color:'#333', whiteSpace:'pre-wrap' }}>
              {r.suggestions}
            </div>

            {r.status === 'pending' && (
              <div style={{ display:'flex', gap:8 }}>
                <button onClick={() => updateStatus(r.id, 'approved')} disabled={approving === r.id} style={{ padding:'8px 18px', background:'#27500A', color:'white', border:'none', borderRadius:8, fontSize:13, fontWeight:500, cursor:'pointer' }}>
                  ✓ Approve — apply to prompt
                </button>
                <button onClick={() => updateStatus(r.id, 'rejected')} disabled={approving === r.id} style={{ padding:'8px 18px', background:'transparent', color:'#A32D2D', border:'0.5px solid rgba(162,45,45,0.3)', borderRadius:8, fontSize:13, cursor:'pointer' }}>
                  Dismiss
                </button>
              </div>
            )}
            {r.status === 'approved' && r.reviewed_at && (
              <div style={{ fontSize:11, color:'#888' }}>Approved {new Date(r.reviewed_at).toLocaleDateString()}</div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}
