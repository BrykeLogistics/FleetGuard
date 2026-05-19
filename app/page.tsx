'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/useProfile'
import Navbar from './components/Navbar'
import Link from 'next/link'

function AlertBanner({ color, text, sub, href, linkLabel }: {
  color: 'blue' | 'red'; text: string; sub: string; href: string; linkLabel: string
}) {
  const c = color === 'blue'
    ? { bg: '#E6F1FB', border: 'rgba(24,95,165,0.2)', title: '#0C447C', body: '#185FA5', btn: 'rgba(24,95,165,0.3)' }
    : { bg: '#FCEBEB', border: 'rgba(162,45,45,0.2)', title: '#A32D2D', body: '#A32D2D', btn: 'rgba(162,45,45,0.3)' }
  return (
    <div style={{ background: c.bg, border: `0.5px solid ${c.border}`, borderRadius: 10, padding: '12px 16px', marginBottom: 10 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12 }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontSize: 13, fontWeight: 600, color: c.title }}>{text}</div>
          <div style={{ fontSize: 12, color: c.body, marginTop: 2, opacity: color === 'red' ? 0.8 : 1 }}>{sub}</div>
        </div>
        <Link href={href} style={{ fontSize: 12, fontWeight: 500, color: c.title, textDecoration: 'none', border: `0.5px solid ${c.btn}`, padding: '6px 12px', borderRadius: 8, whiteSpace: 'nowrap', flexShrink: 0 }}>
          {linkLabel}
        </Link>
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { profile, isDriver, isOwner, isManager, loading: profileLoading } = useProfile()
  const [stats, setStats] = useState({ total: 0, inspectedThisWeek: 0, newDamage: 0, pending: 0, overdue: 0, pendingReviews: 0 })
  const [recentInspections, setRecentInspections] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => { if (!profileLoading) loadDashboard() }, [profileLoading])

  async function loadDashboard() {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user || !profile?.company_id) return

    const weekAgo = new Date(); weekAgo.setDate(weekAgo.getDate() - 7)
    const thirteenDaysAgo = new Date(); thirteenDaysAgo.setDate(thirteenDaysAgo.getDate() - 13)

    // Build trucks query based on role
    let trucksQuery = supabase.from('trucks').select('id').eq('company_id', profile.company_id)
    if (isManager) trucksQuery = trucksQuery.eq('csa', profile.csa)

    // Build inspections query based on role
    let inspQuery = supabase.from('inspections').select('*, trucks(id, truck_number, driver_name)').eq('company_id', profile.company_id).order('created_at', { ascending: false }).limit(20)
    if (isManager) inspQuery = inspQuery.eq('trucks.csa', profile.csa)

    const [trucksRes, inspRes, damageRes, reviewRes] = await Promise.all([
      trucksQuery,
      inspQuery,
      supabase.from('damages').select('id').eq('company_id', profile.company_id).eq('is_new', true),
      supabase.from('prompt_reviews').select('id').eq('status', 'pending'),
    ])

    const allInspections = inspRes.data || []
    const truckIds = trucksRes.data?.map((t: any) => t.id) || []
    const thisWeekIds = new Set(allInspections.filter((i: any) => new Date(i.created_at) > weekAgo).map((i: any) => i.truck_id))
    const recentIds = new Set(allInspections.filter((i: any) => new Date(i.created_at) > thirteenDaysAgo).map((i: any) => i.truck_id))

    setStats({
      total: truckIds.length,
      inspectedThisWeek: thisWeekIds.size,
      newDamage: damageRes.data?.length || 0,
      pending: truckIds.filter((id: string) => !allInspections.some((i: any) => i.truck_id === id)).length,
      overdue: truckIds.filter((id: string) => !recentIds.has(id)).length,
      pendingReviews: reviewRes.data?.length || 0,
    })
    setRecentInspections(allInspections.slice(0, 10))
    setLoading(false)
  }

  const condBadge = (c: string) => c === 'Good' ? 'badge-green' : (c === 'Critical' || c === 'Poor') ? 'badge-red' : c === 'Fair' ? 'badge-amber' : 'badge-gray'

  // ── Driver dashboard ──────────────────────────────────────────
  if (isDriver) return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 500, margin: '0 auto', padding: '32px 20px 24px', textAlign: 'center' }}>
        <div style={{ fontSize: 22, fontWeight: 600, marginBottom: 6 }}>
          {profile?.full_name ? `Hi, ${profile.full_name.split(' ')[0]}!` : 'Welcome!'}
        </div>
        <div style={{ fontSize: 14, color: '#888', marginBottom: 32 }}>
          {profile?.csa ? `CSA ${profile.csa} · ` : ''}Ready for today's inspection?
        </div>
        <Link href="/inspect" className="btn btn-primary" style={{ fontSize: 16, padding: '16px 0', borderRadius: 12, display: 'block', textDecoration: 'none', width: '100%', maxWidth: 320, margin: '0 auto' }}>
          Start inspection
        </Link>
      </div>
    </div>
  )

  // ── Owner / Manager dashboard ─────────────────────────────────
  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '20px 16px 40px' }}>

        {isOwner && stats.pendingReviews > 0 && (
          <AlertBanner color="blue"
            text={`📋 ${stats.pendingReviews} prompt review${stats.pendingReviews > 1 ? 's' : ''} ready`}
            sub="AI has analyzed recent feedback and has suggestions"
            href="/admin" linkLabel="Review →" />
        )}
        {stats.overdue > 0 && (
          <div style={{ marginBottom: 6 }}>
            <AlertBanner color="red"
              text={`⚠ ${stats.overdue} truck${stats.overdue > 1 ? 's' : ''} overdue for inspection`}
              sub="No inspection in the last 13 days"
              href="/fleet?filter=uninspected" linkLabel="View →" />
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
          {[
            { label: 'Total trucks', value: stats.total, color: '#1a1a1a', href: '/fleet' },
            { label: 'Inspected this week', value: stats.inspectedThisWeek, color: '#27500A', href: '/fleet?filter=this-week' },
            { label: 'New damage found', value: stats.newDamage, color: '#A32D2D', href: '/fleet?filter=new-damage' },
            { label: 'Not yet inspected', value: stats.pending, color: '#633806', href: '/fleet?filter=uninspected' },
          ].map(s => (
            <Link key={s.label} href={s.href} style={{ background: 'white', borderRadius: 10, padding: '14px 16px', border: '0.5px solid rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit', display: 'block' }}>
              <div style={{ fontSize: 11, color: '#888', marginBottom: 4, lineHeight: 1.3 }}>{s.label}</div>
              <div style={{ fontSize: 30, fontWeight: 700, color: loading ? '#ddd' : s.color, lineHeight: 1 }}>{loading ? '—' : s.value}</div>
              <div style={{ fontSize: 11, color: '#bbb', marginTop: 6 }}>View →</div>
            </Link>
          ))}
        </div>

        <div className="card" style={{ padding: '14px 16px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ fontSize: 14, fontWeight: 500 }}>Recent inspections</div>
            <Link href="/reports" style={{ fontSize: 12, color: '#185FA5', textDecoration: 'none' }}>View all →</Link>
          </div>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#888', fontSize: 13 }}>Loading...</div>
          ) : recentInspections.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px', color: '#aaa', fontSize: 13 }}>No inspections yet</div>
          ) : recentInspections.map(insp => {
            const truck = insp.trucks as any
            return (
              <Link key={insp.id} href={`/fleet?truck=${truck?.id}`} style={{ display: 'block', borderBottom: '0.5px solid rgba(0,0,0,0.07)', textDecoration: 'none', color: 'inherit', padding: '11px 0' }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 4 }}>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a', minWidth: 0 }}>
                    Truck #{truck?.truck_number}
                    {truck?.driver_name && <span style={{ fontWeight: 400, color: '#555' }}> — {truck.driver_name}</span>}
                  </div>
                  <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                    <span className={`badge ${condBadge(insp.overall_condition)}`}>{insp.overall_condition || 'Pending'}</span>
                    {insp.follow_up_required && <span className="badge badge-red">Follow-up</span>}
                  </div>
                </div>
                <div style={{ fontSize: 12, color: '#999' }}>
                  {insp.inspection_type} · {insp.inspector_name} · {new Date(insp.created_at).toLocaleDateString()}
                </div>
              </Link>
            )
          })}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          <Link href="/inspect" className="btn btn-primary" style={{ textAlign: 'center', textDecoration: 'none', padding: '14px', fontSize: 15, borderRadius: 10 }}>+ New inspection</Link>
          <Link href="/fleet" className="btn" style={{ textAlign: 'center', textDecoration: 'none', padding: '14px', fontSize: 15, borderRadius: 10 }}>Manage fleet</Link>
        </div>
      </div>
    </div>
  )
}
