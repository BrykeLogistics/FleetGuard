'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/useProfile'
import Navbar from './components/Navbar'
import Link from 'next/link'

export default function Dashboard() {
  const { profile, isDriver, isOwner } = useProfile()
  const [stats, setStats] = useState({ total:0, inspectedThisWeek:0, newDamage:0, pending:0, overdue:0, pendingReviews:0 })
  const [recentInspections, setRecentInspections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { loadDashboard() }, [])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const thirteenDaysAgo = new Date(); thirteenDaysAgo.setDate(thirteenDaysAgo.getDate() - 13)

    const [trucksRes, inspRes, damageRes, reviewRes] = await Promise.all([
      supabase.from('trucks').select('id').eq('user_id', user.id),
      supabase.from('inspections').select('*, trucks(id, truck_number, driver_name)').eq('user_id', user.id).order('created_at', { ascending: false }).limit(20),
      supabase.from('damages').select('id').eq('user_id', user.id).eq('is_new', true),
      supabase.from('prompt_reviews').select('id').eq('status', 'pending'),
    ])

    const allInspections = inspRes.data || []
    const truckIds = trucksRes.data?.map((t: any) => t.id) || []

    const thisWeekTruckIds = new Set(
      allInspections.filter((i: any) => new Date(i.created_at) > weekAgo).map((i: any) => i.truck_id)
    )
    const recentTruckIds = new Set(
      allInspections.filter((i: any) => new Date(i.created_at) > thirteenDaysAgo).map((i: any) => i.truck_id)
    )
    const overdueCount = truckIds.filter((id: string) => !recentTruckIds.has(id)).length

    setStats({
      total: truckIds.length,
      inspectedThisWeek: thisWeekTruckIds.size,
      newDamage: damageRes.data?.length || 0,
      pending: truckIds.filter((id: string) => !allInspections.some((i: any) => i.truck_id === id)).length,
      overdue: overdueCount,
      pendingReviews: reviewRes.data?.length || 0,
    })
    setRecentInspections(allInspections.slice(0, 10))
    setLoading(false)
  }

  const condBadge = (c: string) => c==='Good'?'badge-green':(c==='Critical'||c==='Poor')?'badge-red':c==='Fair'?'badge-amber':'badge-gray'

  // Driver simplified dashboard
  if (isDriver) return (
    <div>
      <Navbar />
      <div style={{ maxWidth:500, margin:'0 auto', padding:'48px 16px', textAlign:'center' }}>
        <div style={{ fontSize:22, fontWeight:600, marginBottom:8 }}>
          {profile?.full_name ? `Hi, ${profile.full_name.split(' ')[0]}!` : 'Welcome!'}
        </div>
        <div style={{ fontSize:14, color:'#888', marginBottom:40 }}>
          {profile?.csa ? `${profile.csa} · ` : ''}Ready for today's inspection?
        </div>
        <Link href="/inspect" className="btn btn-primary" style={{ fontSize:16, padding:'16px 48px', borderRadius:12, display:'inline-block', textDecoration:'none' }}>
          Start inspection
        </Link>
      </div>
    </div>
  )

  // Owner/Manager dashboard
  return (
    <div>
      <Navbar />
      <div style={{ maxWidth:900, margin:'0 auto', padding:'24px 16px' }}>

        {/* Alerts */}
        {isOwner && stats.pendingReviews > 0 && (
          <div style={{ background:'#E6F1FB', border:'0.5px solid rgba(24,95,165,0.2)', borderRadius:10, padding:'12px 16px', marginBottom:10, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#0C447C' }}>📋 {stats.pendingReviews} prompt review{stats.pendingReviews > 1 ? 's' : ''} ready</div>
              <div style={{ fontSize:12, color:'#185FA5', marginTop:1 }}>AI has analyzed recent feedback and has suggestions</div>
            </div>
            <Link href="/admin" style={{ fontSize:12, fontWeight:500, color:'#185FA5', textDecoration:'none', border:'0.5px solid rgba(24,95,165,0.3)', padding:'6px 12px', borderRadius:8 }}>Review →</Link>
          </div>
        )}

        {stats.overdue > 0 && (
          <div style={{ background:'#FCEBEB', border:'0.5px solid rgba(162,45,45,0.2)', borderRadius:10, padding:'12px 16px', marginBottom:16, display:'flex', alignItems:'center', justifyContent:'space-between' }}>
            <div>
              <div style={{ fontSize:13, fontWeight:600, color:'#A32D2D' }}>⚠ {stats.overdue} truck{stats.overdue > 1 ? 's' : ''} overdue for inspection</div>
              <div style={{ fontSize:12, color:'#A32D2D', marginTop:1, opacity:0.8 }}>No inspection in the last 13 days</div>
            </div>
            <Link href="/fleet?filter=uninspected" style={{ fontSize:12, fontWeight:500, color:'#A32D2D', textDecoration:'none', border:'0.5px solid rgba(162,45,45,0.3)', padding:'6px 12px', borderRadius:8 }}>View →</Link>
          </div>
        )}

        {/* Stats */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit, minmax(150px,1fr))', gap:12, marginBottom:20 }}>
          {[
            { label:'Total trucks', value:stats.total, color:'#1a1a1a', href:'/fleet' },
            { label:'Inspected this week', value:stats.inspectedThisWeek, color:'#27500A', href:'/fleet?filter=this-week' },
            { label:'New damage found', value:stats.newDamage, color:'#A32D2D', href:'/fleet?filter=new-damage' },
            { label:'Not yet inspected', value:stats.pending, color:'#633806', href:'/fleet?filter=uninspected' },
          ].map(s => (
            <Link key={s.label} href={s.href} style={{ background:'white', borderRadius:10, padding:'16px', border:'0.5px solid rgba(0,0,0,0.08)', textDecoration:'none', color:'inherit', display:'block', transition:'box-shadow 0.15s, transform 0.15s' }}
              onMouseEnter={e => { e.currentTarget.style.boxShadow='0 2px 12px rgba(0,0,0,0.1)'; e.currentTarget.style.transform='translateY(-1px)' }}
              onMouseLeave={e => { e.currentTarget.style.boxShadow='none'; e.currentTarget.style.transform='none' }}>
              <div style={{ fontSize:12, color:'#888', marginBottom:6 }}>{s.label}</div>
              <div style={{ fontSize:28, fontWeight:600, color: loading ? '#ddd' : s.color }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize:11, color:'#aaa', marginTop:4 }}>View →</div>
            </Link>
          ))}
        </div>

        {/* Recent inspections */}
        <div className="card" style={{ padding:'16px' }}>
          <div style={{ display:'flex', alignItems:'center', justifyContent:'space-between', marginBottom:12 }}>
            <div style={{ fontSize:14, fontWeight:500 }}>Recent inspections</div>
            <Link href="/reports" style={{ fontSize:12, color:'#185FA5', textDecoration:'none' }}>View all →</Link>
          </div>
          {loading ? <div style={{ textAlign:'center', padding:'24px', color:'#888', fontSize:13 }}>Loading...</div> :
           recentInspections.length === 0 ? <div style={{ textAlign:'center', padding:'24px', color:'#aaa', fontSize:13 }}>No inspections yet</div> :
           recentInspections.map(insp => (
            <Link key={insp.id} href={`/fleet?truck=${(insp.trucks as any)?.id}`}
              style={{ display:'flex', alignItems:'center', gap:12, borderBottom:'0.5px solid rgba(0,0,0,0.07)', textDecoration:'none', color:'inherit', borderRadius:4, margin:'0 -8px', padding:'10px 8px', transition:'background 0.1s' }}
              onMouseEnter={e => (e.currentTarget.style.background='#f7f7f6')}
              onMouseLeave={e => (e.currentTarget.style.background='transparent')}>
              <div style={{ flex:1 }}>
                <div style={{ fontSize:13, fontWeight:500 }}>Truck #{(insp.trucks as any)?.truck_number} — {(insp.trucks as any)?.driver_name}</div>
                <div style={{ fontSize:12, color:'#888', marginTop:2 }}>{insp.inspection_type} · {insp.inspector_name} · {new Date(insp.created_at).toLocaleDateString()}</div>
              </div>
              <span className={`badge ${condBadge(insp.overall_condition)}`}>{insp.overall_condition || 'Pending'}</span>
              {insp.follow_up_required && <span className="badge badge-red">Follow-up</span>}
              <span style={{ fontSize:12, color:'#aaa' }}>→</span>
            </Link>
          ))}
        </div>

        <div style={{ display:'flex', gap:10, marginTop:16 }}>
          <Link href="/inspect" className="btn btn-primary">+ New inspection</Link>
          <Link href="/fleet" className="btn">Manage fleet</Link>
        </div>
      </div>
    </div>
  )
}
