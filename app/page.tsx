'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import Navbar from './components/Navbar'
import Link from 'next/link'

export default function Dashboard() {
  const [stats, setStats] = useState({ total: 0, inspectedThisWeek: 0, newDamage: 0, pending: 0 })
  const [recentInspections, setRecentInspections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return
    const [trucksRes, inspRes, damageRes] = await Promise.all([
      supabase.from('trucks').select('*').eq('user_id', user.id),
      supabase.from('inspections').select('*, trucks(id, truck_number, driver_name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(10),
      supabase.from('damages').select('*').eq('user_id', user.id).eq('is_new', true),
    ])
    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const thisWeek = (inspRes.data || []).filter((i: any) => new Date(i.created_at) > weekAgo)
    const uniqueTrucksThisWeek = new Set(thisWeek.map((i: any) => i.truck_id)).size
    setStats({ total: trucksRes.data?.length || 0, inspectedThisWeek: uniqueTrucksThisWeek, newDamage: damageRes.data?.length || 0, pending: Math.max(0,(trucksRes.data?.length || 0) - uniqueTrucksThisWeek) })
    setRecentInspections(inspRes.data || [])
    setLoading(false)
  }

  const condBadge = (c: string) => c === 'Good' ? 'badge-green' : (c === 'Critical' || c === 'Poor') ? 'badge-red' : c === 'Fair' ? 'badge-amber' : 'badge-gray'

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px' }}>
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:12, marginBottom:20 }}>
          {[
            { label:'Total trucks', value:stats.total, color:'#1a1a1a', href:'/fleet' },
            { label:'Inspected this week', value:stats.inspectedThisWeek, color:'#27500A', href:'/fleet?filter=this-week' },
            { label:'New damage found', value:stats.newDamage, color:'#A32D2D', href:'/fleet?filter=new-damage' },
            { label:'Not yet inspected', value:stats.pending, color:'#633806', href:'/fleet?filter=uninspected' },
          ].map(s => (
            <Link key={s.label} href={s.href} style={{ background:'white', borderRadius:10, padding:'16px', border:'0.5px solid rgba(0,0,0,0.08)', textDecoration:'none', color:'inherit', display:'block', transition:'box-shadow 0.15s, transform 0.15s', cursor:'pointer' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform='translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none' }}>
              <div style={{ fontSize:12, color:'#888', marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:28, fontWeight:600, color: loading ? '#ddd' : s.color }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize:11, color:'#aaa', marginTop:4 }}>View →</div>
            </Link>
          ))}
        </div>
        <div className="card" style={{ padding:'20px', marginBottom:16 }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:16 }}>
            <span style={{ fontWeight:500, fontSize:15 }}>Recent inspections</span>
            <Link href="/inspect" className="btn btn-primary" style={{ fontSize:12, padding:'6px 14px' }}>+ New inspection</Link>
          </div>
          {loading && <div style={{ color:'#888', fontSize:13, padding:'20px 0', textAlign:'center' }}>Loading...</div>}
          {!loading && recentInspections.length === 0 && (
            <div style={{ textAlign:'center', padding:'40px 0', color:'#888', fontSize:13 }}>No inspections yet. <Link href="/inspect" style={{ color:'#185FA5' }}>Run your first inspection →</Link></div>
          )}
          {recentInspections.map(insp => (
            <Link key={insp.id} href={`/fleet?truck=${(insp.trucks as any)?.id}`}
              style={{ display:'flex', alignItems:'center', gap:12, borderBottom:'0.5px solid rgba(0,0,0,0.07)', textDecoration:'none', color:'inherit', cursor:'pointer', borderRadius:4, transition:'background 0.1s', margin:'0 -8px', padding:'10px 8px' }}
              onMouseEnter={e => (e.currentTarget.style.background='#f7f7f6')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>Truck #{(insp.trucks as any)?.truck_number} — {(insp.trucks as any)?.driver_name}</div>
                <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{insp.inspection_type} · {insp.inspector_name} · {new Date(insp.created_at).toLocaleDateString()}</div>
              </div>
              <span className={`badge ${condBadge(insp.overall_condition)}`}>{insp.overall_condition || 'Pending'}</span>
              {insp.follow_up_required && <span className="badge badge-red" style={{ marginLeft:4 }}>Follow-up</span>}
              <span style={{ fontSize:12, color:'#aaa' }}>→</span>
            </Link>
          ))}
        </div>
        <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12 }}>
          <Link href="/fleet" className="card" style={{ padding:'18px', textDecoration:'none', color:'inherit', display:'block' }}><div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>Manage fleet →</div><div style={{ fontSize:12, color:'#888' }}>Add trucks, view profiles, see damage history</div></Link>
          <Link href="/reports" className="card" style={{ padding:'18px', textDecoration:'none', color:'inherit', display:'block' }}><div style={{ fontSize:14, fontWeight:500, marginBottom:4 }}>View reports →</div><div style={{ fontSize:12, color:'#888' }}>Export damage logs, compare inspections</div></Link>
        </div>
      </div>
    </div>
  )
}
