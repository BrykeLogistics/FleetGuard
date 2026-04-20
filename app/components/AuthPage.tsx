'use client'
import { useState } from 'react'
import { supabase } from '@/lib/supabase'

export default function AuthPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    if (isSignUp) {
      const { error } = await supabase.auth.signUp({ email, password })
      if (error) setError(error.message)
      else setMessage('Check your email to confirm your account!')
    } else {
      const { error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) setError(error.message)
    }
    setLoading(false)
  }

  return (
    <div style={{ minHeight:'100vh', background:'#f0efed', display:'flex', alignItems:'center', justifyContent:'center', padding:'20px' }}>
      <div style={{ width:'100%', maxWidth:'380px' }}>
        {/* Logo */}
        <div style={{ textAlign:'center', marginBottom:'32px' }}>
          <div style={{ width:48, height:48, background:'#185FA5', borderRadius:12, display:'inline-flex', alignItems:'center', justifyContent:'center', marginBottom:12 }}>
            <svg width="26" height="26" viewBox="0 0 24 24" fill="white"><path d="M1 16v-4l3-7h16l3 7v4H1zm3.5-2h15v-1.5l-2.5-5.5H7L4.5 13.5V14zM6 17.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zm9 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z"/></svg>
          </div>
          <div style={{ fontSize:22, fontWeight:600, color:'#1a1a1a' }}>FleetGuard</div>
          <div style={{ fontSize:13, color:'#888', marginTop:4 }}>AI-powered fleet damage inspector</div>
        </div>

        {/* Form */}
        <div style={{ background:'white', borderRadius:16, border:'0.5px solid rgba(0,0,0,0.1)', padding:'28px' }}>
          <div style={{ fontSize:15, fontWeight:500, marginBottom:20 }}>
            {isSignUp ? 'Create your account' : 'Sign in to FleetGuard'}
          </div>

          <form onSubmit={handleAuth}>
            <div style={{ marginBottom:14 }}>
              <label>Email address</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="you@company.com" required />
            </div>
            <div style={{ marginBottom:20 }}>
              <label>Password</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required minLength={6} />
            </div>

            {error && <div style={{ background:'#FCEBEB', color:'#A32D2D', borderRadius:8, padding:'10px 12px', fontSize:13, marginBottom:14 }}>{error}</div>}
            {message && <div style={{ background:'#EAF3DE', color:'#27500A', borderRadius:8, padding:'10px 12px', fontSize:13, marginBottom:14 }}>{message}</div>}

            <button type="submit" className="btn btn-primary" style={{ width:'100%', justifyContent:'center' }} disabled={loading}>
              {loading ? 'Please wait...' : isSignUp ? 'Create account' : 'Sign in'}
            </button>
          </form>

          <div style={{ textAlign:'center', marginTop:16, fontSize:13, color:'#888' }}>
            {isSignUp ? 'Already have an account?' : "Don't have an account?"}{' '}
            <button onClick={() => { setIsSignUp(!isSignUp); setError(''); setMessage('') }} style={{ background:'none', border:'none', color:'#185FA5', cursor:'pointer', fontSize:13, fontWeight:500 }}>
              {isSignUp ? 'Sign in' : 'Sign up'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
