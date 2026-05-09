'use client'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/useProfile'
import Navbar from '../components/Navbar'

interface MissRate {
  pattern_name: string
  display_name: string
  vehicle_type: string
  severity: string
  miss_risk: string
  total_examples: number
  ai_correct: number
  ai_missed: number
  wrong_severity: number
  pending: number
  miss_rate_pct: number | null
}

interface TrainingExample {
  id: string
  truck_number: string | null
  vehicle_type: string
  photo_angle: string | null
  location: string
  description: string
  severity: string
  outcome: string
  pattern_id: string
  damage_patterns?: { display_name: string }
}

interface PromptReview {
  id: string
  created_at: string
  status: string
  suggestions: string
  feedback_items?: any[]
  reviewed_at?: string
}

const missRiskStyle = (r: string) => ({
  critical: { bg: '#FCEBEB', color: '#A32D2D' },
  high:     { bg: '#FAEEDA', color: '#633806' },
  medium:   { bg: '#E6F1FB', color: '#0C447C' },
  low:      { bg: '#EAF3DE', color: '#27500A' },
}[r] || { bg: '#f4f4f4', color: '#555' })

const outcomeStyle = (o: string) => ({
  correct:        { bg: '#EAF3DE', color: '#27500A' },
  missed:         { bg: '#FCEBEB', color: '#A32D2D' },
  wrong_severity: { bg: '#FAEEDA', color: '#633806' },
  false_positive: { bg: '#f4f4f4', color: '#555' },
  pending:        { bg: '#f0f0f0', color: '#999' },
}[o] || { bg: '#f0f0f0', color: '#999' })

const vehicleLabel = (v: string) =>
  ({ stepvan: 'Step Van', sprinter: 'Transit/Sprinter', boxtruck: 'Box Truck', all: 'All' }[v] || v)

export default function AdminPage() {
  const { isOwner, loading: profileLoading } = useProfile()
  const [activeTab, setActiveTab] = useState<'training' | 'reviews'>('training')

  // Prompt reviews
  const [reviews, setReviews] = useState<PromptReview[]>([])
  const [reviewsLoading, setReviewsLoading] = useState(true)
  const [approving, setApproving] = useState<string | null>(null)

  // Training
  const [missRates, setMissRates] = useState<MissRate[]>([])
  const [examples, setExamples] = useState<TrainingExample[]>([])
  const [trainingLoading, setTrainingLoading] = useState(true)
  const [selectedPatternId, setSelectedPatternId] = useState<string | null>(null)
  const [updatingOutcome, setUpdatingOutcome] = useState<string | null>(null)
  const [flagging, setFlagging] = useState<string | null>(null)

  useEffect(() => {
    if (!profileLoading) { loadReviews(); loadTraining() }
  }, [profileLoading])

  async function loadReviews() {
    const { data } = await supabase.from('prompt_reviews').select('*').order('created_at', { ascending: false })
    setReviews(data || [])
    setReviewsLoading(false)
  }

  async function loadTraining() {
    setTrainingLoading(true)
    const [{ data: rates }, { data: exs }] = await Promise.all([
      supabase.from('training_miss_rate').select('*').order('ai_missed', { ascending: false }),
      supabase.from('training_examples').select('*, damage_patterns(display_name)').eq('active', true).order('created_at', { ascending: false }),
    ])
    setMissRates(rates || [])
    setExamples(exs || [])
    setTrainingLoading(false)
  }

  async function setOutcome(id: string, outcome: string) {
    setUpdatingOutcome(id)
    await supabase.from('training_examples').update({ outcome, updated_at: new Date().toISOString() }).eq('id', id)
    await loadTraining()
    setUpdatingOutcome(null)
  }

  async function flagForReview(r: MissRate) {
    setFlagging(r.pattern_name)
    await supabase.from('prompt_reviews').insert({
      status: 'pending',
      created_at: new Date().toISOString(),
      suggestions: `TRAINING FLAG — High Miss Rate\n\nPattern: ${r.display_name}\nVehicle: ${vehicleLabel(r.vehicle_type)}\nMiss risk: ${r.miss_risk.toUpperCase()}\nAI missed: ${r.ai_missed} of ${(r.total_examples || 0) - (r.pending || 0)} tested\nMiss rate: ${r.miss_rate_pct ?? 'N/A'}%\n\nFlagged from training data for prompt improvement. Review the detection tip in damage_patterns and strengthen the relevant section in DAMAGE_KNOWLEDGE or WEAK_POINTS in route.ts.`,
      feedback_items: [{ source: 'training_data', pattern_name: r.pattern_name }],
    })
    setFlagging(null)
    setActiveTab('reviews')
    loadReviews()
  }

  async function updateReview(id: string, status: 'approved' | 'rejected') {
    setApproving(id)
    await supabase.from('prompt_reviews').update({ status, reviewed_at: new Date().toISOString() }).eq('id', id)
    loadReviews()
    setApproving(null)
  }

  const pendingReviews = reviews.filter(r => r.status === 'pending').length
  const totalExamples = examples.length
  const totalMissed = examples.filter(e => e.outcome === 'missed').length
  const totalPending = examples.filter(e => e.outcome === 'pending').length
  const tested = totalExamples - totalPending
  const overallMissRate = tested > 0 ? Math.round(100 * totalMissed / tested) : null

  const shownExamples = selectedPatternId
    ? examples.filter(e => e.pattern_id === selectedPatternId)
    : examples

  if (profileLoading) return <div />
  if (!isOwner) return (
    <div><Navbar />
      <div style={{ maxWidth: 900, margin: '0 auto', padding: '48px 16px', textAlign: 'center', color: '#888' }}>
        Access restricted to owners only.
      </div>
    </div>
  )

  return (
    <div>
      <Navbar />
      <div style={{ maxWidth: 960, margin: '0 auto', padding: '20px 16px 60px' }}>

        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 18, fontWeight: 600, marginBottom: 2 }}>Admin</div>
          <div style={{ fontSize: 13, color: '#888' }}>AI training intelligence and prompt review</div>
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', borderBottom: '0.5px solid rgba(0,0,0,0.1)', marginBottom: 20 }}>
          {[
            { key: 'training', label: 'Training Intelligence' },
            { key: 'reviews', label: `Prompt Reviews${pendingReviews > 0 ? ` (${pendingReviews})` : ''}` },
          ].map(t => (
            <div key={t.key} onClick={() => setActiveTab(t.key as any)} style={{
              padding: '10px 20px', fontSize: 13, fontWeight: 500, cursor: 'pointer',
              borderBottom: activeTab === t.key ? '2px solid #185FA5' : '2px solid transparent',
              color: activeTab === t.key ? '#185FA5' : '#666',
            }}>
              {t.label}
            </div>
          ))}
        </div>

        {/* ── TRAINING TAB ── */}
        {activeTab === 'training' && (
          trainingLoading
            ? <div style={{ textAlign: 'center', padding: '48px', color: '#888', fontSize: 13 }}>Loading...</div>
            : <>
                {/* Summary stats */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 10, marginBottom: 20 }}>
                  {/* Mobile 2-col, desktop 4-col via CSS below */}
                  {[
                    { label: 'Annotated examples', value: totalExamples, color: '#1a1a1a' },
                    { label: 'Pending test', value: totalPending, color: '#633806' },
                    { label: 'AI missed (confirmed)', value: totalMissed, color: '#A32D2D' },
                    { label: 'Overall miss rate', value: overallMissRate !== null ? `${overallMissRate}%` : '—', color: overallMissRate !== null && overallMissRate >= 30 ? '#A32D2D' : '#27500A' },
                  ].map(s => (
                    <div key={s.label} className="card" style={{ padding: '14px 16px' }}>
                      <div style={{ fontSize: 11, color: '#888', marginBottom: 4 }}>{s.label}</div>
                      <div style={{ fontSize: 26, fontWeight: 700, color: s.color }}>{s.value}</div>
                    </div>
                  ))}
                </div>

                {/* Miss rate table */}
                <div className="card" style={{ padding: '16px', marginBottom: 20 }}>
                  <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 3 }}>Pattern miss rates</div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>
                    Tap a row to filter examples below. Flag patterns with high miss rates to create a prompt review.
                  </div>

                  {missRates.length === 0
                    ? <div style={{ textAlign: 'center', padding: '24px', color: '#aaa', fontSize: 13 }}>
                        No data yet — run test inspections on training trucks and mark outcomes below.
                      </div>
                    : <div style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, minWidth: 560 }}>
                          <thead>
                            <tr style={{ borderBottom: '0.5px solid rgba(0,0,0,0.1)' }}>
                              {['Pattern', 'Vehicle', 'Risk', 'Tested', '✓', '✗', '%', ''].map(h => (
                                <th key={h} style={{ padding: '7px 8px', textAlign: 'left', fontSize: 10, fontWeight: 700, color: '#aaa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{h}</th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {missRates.map(r => {
                              const tested = (r.total_examples || 0) - (r.pending || 0)
                              const rStyle = missRiskStyle(r.miss_risk)
                              const mp = r.miss_rate_pct
                              const highMiss = mp !== null && mp >= 30

                              // Find pattern_id by matching display_name
                              const patternId = examples.find(e =>
                                (e.damage_patterns as any)?.display_name === r.display_name
                              )?.pattern_id || null

                              return (
                                <tr key={r.pattern_name}
                                  onClick={() => setSelectedPatternId(prev => prev === patternId ? null : patternId)}
                                  style={{
                                    borderBottom: '0.5px solid rgba(0,0,0,0.06)',
                                    background: selectedPatternId === patternId
                                      ? '#E6F1FB'
                                      : highMiss ? 'rgba(252,235,235,0.25)' : 'transparent',
                                    cursor: 'pointer',
                                  }}
                                >
                                  <td style={{ padding: '9px 8px', fontWeight: 500, color: '#1a1a1a', maxWidth: 180 }}>{r.display_name}</td>
                                  <td style={{ padding: '9px 8px', color: '#777', whiteSpace: 'nowrap' }}>{vehicleLabel(r.vehicle_type)}</td>
                                  <td style={{ padding: '9px 8px' }}>
                                    <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, background: rStyle.bg, color: rStyle.color, fontWeight: 600 }}>
                                      {r.miss_risk}
                                    </span>
                                  </td>
                                  <td style={{ padding: '9px 8px', textAlign: 'center', color: '#555' }}>{tested}</td>
                                  <td style={{ padding: '9px 8px', textAlign: 'center', color: '#27500A', fontWeight: 600 }}>{r.ai_correct || 0}</td>
                                  <td style={{ padding: '9px 8px', textAlign: 'center', fontWeight: r.ai_missed > 0 ? 700 : 400, color: r.ai_missed > 0 ? '#A32D2D' : '#aaa' }}>
                                    {r.ai_missed || 0}
                                  </td>
                                  <td style={{ padding: '9px 8px', textAlign: 'center' }}>
                                    {mp !== null
                                      ? <span style={{ fontWeight: 700, color: mp >= 50 ? '#A32D2D' : mp >= 25 ? '#633806' : '#27500A' }}>{mp}%</span>
                                      : <span style={{ color: '#ccc' }}>—</span>}
                                  </td>
                                  <td style={{ padding: '9px 8px' }}>
                                    {(r.ai_missed > 0 || (mp !== null && mp >= 25)) && (
                                      <button
                                        onClick={e => { e.stopPropagation(); flagForReview(r) }}
                                        disabled={flagging === r.pattern_name}
                                        style={{
                                          fontSize: 11, padding: '3px 9px', borderRadius: 7,
                                          background: '#E6F1FB', color: '#0C447C',
                                          border: '0.5px solid rgba(12,68,124,0.2)',
                                          cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap',
                                        }}
                                      >
                                        {flagging === r.pattern_name ? '...' : 'Flag →'}
                                      </button>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                        </table>
                      </div>
                  }
                </div>

                {/* Training examples */}
                <div className="card" style={{ padding: '16px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 3, flexWrap: 'wrap', gap: 8 }}>
                    <div style={{ fontSize: 14, fontWeight: 500 }}>
                      {selectedPatternId ? 'Examples — filtered' : 'Training examples'}
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      {selectedPatternId && (
                        <button onClick={() => setSelectedPatternId(null)}
                          style={{ fontSize: 12, color: '#185FA5', background: 'none', border: 'none', cursor: 'pointer' }}>
                          ✕ Clear filter
                        </button>
                      )}
                      <span style={{ fontSize: 12, color: '#888' }}>{shownExamples.length} shown</span>
                    </div>
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginBottom: 14 }}>
                    After running a test inspection on a training truck, mark what the AI did with each item. This feeds the miss rate table above.
                  </div>

                  {shownExamples.length === 0
                    ? <div style={{ textAlign: 'center', padding: '24px', color: '#aaa', fontSize: 13 }}>No examples.</div>
                    : shownExamples.map(ex => {
                        const oStyle = outcomeStyle(ex.outcome)
                        return (
                          <div key={ex.id} style={{ borderBottom: '0.5px solid rgba(0,0,0,0.07)', padding: '12px 0' }}>
                            {/* Header */}
                            <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8, marginBottom: 5 }}>
                              <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, alignItems: 'center', marginBottom: 2 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: '#1a1a1a' }}>
                                    {(ex.damage_patterns as any)?.display_name || '—'}
                                  </span>
                                  {ex.truck_number && <span style={{ fontSize: 11, color: '#888' }}>#{ex.truck_number}</span>}
                                  <span style={{ fontSize: 11, color: '#bbb' }}>{vehicleLabel(ex.vehicle_type)}</span>
                                  {ex.photo_angle && <span style={{ fontSize: 11, color: '#ccc' }}>{ex.photo_angle.replace(/_/g, ' ')}</span>}
                                </div>
                                <div style={{ fontSize: 12, color: '#666', marginBottom: 2 }}>
                                  <strong style={{ color: '#444' }}>Location:</strong> {ex.location}
                                </div>
                                <div style={{ fontSize: 12, color: '#777', lineHeight: 1.5 }}>{ex.description}</div>
                              </div>
                              <div style={{ display: 'flex', flexDirection: 'column', gap: 4, flexShrink: 0, alignItems: 'flex-end' }}>
                                <span style={{
                                  fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 600,
                                  background: ex.severity === 'critical' ? '#FCEBEB' : ex.severity === 'moderate' ? '#FAEEDA' : '#f4f4f4',
                                  color: ex.severity === 'critical' ? '#A32D2D' : ex.severity === 'moderate' ? '#633806' : '#555',
                                }}>
                                  {ex.severity}
                                </span>
                                <span style={{ fontSize: 10, padding: '2px 7px', borderRadius: 10, fontWeight: 600, background: oStyle.bg, color: oStyle.color }}>
                                  {ex.outcome}
                                </span>
                              </div>
                            </div>

                            {/* Outcome buttons */}
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5, marginTop: 6, alignItems: 'center' }}>
                              <span style={{ fontSize: 11, color: '#bbb', marginRight: 2 }}>AI result:</span>
                              {[
                                { v: 'correct',        label: '✓ Caught',         bg: '#EAF3DE', col: '#27500A' },
                                { v: 'missed',         label: '✗ Missed',         bg: '#FCEBEB', col: '#A32D2D' },
                                { v: 'wrong_severity', label: '~ Wrong severity', bg: '#FAEEDA', col: '#633806' },
                                { v: 'false_positive', label: '⊘ False positive', bg: '#f4f4f4', col: '#555' },
                                { v: 'pending',        label: '– Reset',          bg: '#f0f0f0', col: '#999' },
                              ].map(opt => (
                                <button key={opt.v}
                                  onClick={() => setOutcome(ex.id, opt.v)}
                                  disabled={updatingOutcome === ex.id}
                                  style={{
                                    fontSize: 11, padding: '4px 10px', borderRadius: 7,
                                    background: ex.outcome === opt.v ? opt.bg : 'transparent',
                                    color: ex.outcome === opt.v ? opt.col : '#bbb',
                                    border: `0.5px solid ${ex.outcome === opt.v ? 'rgba(0,0,0,0.15)' : 'rgba(0,0,0,0.08)'}`,
                                    cursor: updatingOutcome === ex.id ? 'default' : 'pointer',
                                    fontWeight: ex.outcome === opt.v ? 600 : 400,
                                    opacity: updatingOutcome === ex.id ? 0.5 : 1,
                                    minHeight: 28,
                                  }}
                                >
                                  {opt.label}
                                </button>
                              ))}
                            </div>
                          </div>
                        )
                      })
                  }
                </div>
              </>
        )}

        {/* ── REVIEWS TAB ── */}
        {activeTab === 'reviews' && (
          <>
            <div style={{ fontSize: 13, color: '#888', marginBottom: 16 }}>
              AI-generated suggestions from manager feedback (every 14 days) plus patterns flagged from training data. Approve before changes go live.
            </div>

            {reviewsLoading
              ? <div style={{ textAlign: 'center', padding: '40px', color: '#888' }}>Loading...</div>
              : reviews.length === 0
                ? <div className="card" style={{ padding: '48px', textAlign: 'center', color: '#888', fontSize: 13 }}>
                    No reviews yet. Flag a training pattern above or wait for the automated 14-day review.
                  </div>
                : reviews.map(r => (
                  <div key={r.id} className="card" style={{ padding: '20px', marginBottom: 12 }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12, flexWrap: 'wrap', gap: 8 }}>
                      <div>
                        <div style={{ fontSize: 14, fontWeight: 500 }}>
                          {new Date(r.created_at).toLocaleDateString()}
                        </div>
                        <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                          {r.feedback_items?.length || 0} items analyzed
                        </div>
                      </div>
                      <span style={{
                        fontSize: 12, fontWeight: 500, padding: '3px 10px', borderRadius: 20,
                        background: r.status === 'approved' ? '#EAF3DE' : r.status === 'rejected' ? '#FCEBEB' : '#FAEEDA',
                        color: r.status === 'approved' ? '#27500A' : r.status === 'rejected' ? '#A32D2D' : '#633806',
                      }}>
                        {r.status}
                      </span>
                    </div>

                    <div style={{ background: '#f7f7f6', borderRadius: 8, padding: '14px', marginBottom: 12, fontSize: 13, lineHeight: 1.7, color: '#333', whiteSpace: 'pre-wrap' }}>
                      {r.suggestions}
                    </div>

                    {r.status === 'pending' && (
                      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                        <button onClick={() => updateReview(r.id, 'approved')} disabled={approving === r.id}
                          style={{ padding: '8px 18px', background: '#27500A', color: 'white', border: 'none', borderRadius: 8, fontSize: 13, fontWeight: 500, cursor: 'pointer' }}>
                          ✓ Approve — apply to prompt
                        </button>
                        <button onClick={() => updateReview(r.id, 'rejected')} disabled={approving === r.id}
                          style={{ padding: '8px 18px', background: 'transparent', color: '#A32D2D', border: '0.5px solid rgba(162,45,45,0.3)', borderRadius: 8, fontSize: 13, cursor: 'pointer' }}>
                          Dismiss
                        </button>
                      </div>
                    )}
                    {r.status === 'approved' && r.reviewed_at && (
                      <div style={{ fontSize: 11, color: '#888' }}>Approved {new Date(r.reviewed_at).toLocaleDateString()}</div>
                    )}
                  </div>
                ))
            }
          </>
        )}
      </div>
    </div>
  )
}
