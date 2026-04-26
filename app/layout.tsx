'use client'
import './globals.css'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import AuthPage from './components/AuthPage'

const META = (
  <>
    <link rel="manifest" href="/manifest.json" />
    <meta name="theme-color" content="#185FA5" />
    <meta name="apple-mobile-web-app-capable" content="yes" />
    <meta name="apple-mobile-web-app-status-bar-style" content="default" />
    <meta name="apple-mobile-web-app-title" content="FleetGuard" />
    <link rel="apple-touch-icon" href="/icon-180.png" />
    <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1" />
  </>
)

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)
  const [role, setRole] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session)
      if (session) loadRole(session.user.id)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session)
      if (session) loadRole(session.user.id)
      else setRole(null)
    })
    return () => subscription.unsubscribe()
  }, [])

  async function loadRole(userId: string) {
    const { data } = await supabase.from('profiles').select('role').eq('id', userId).single()
    // If no profile exists yet, treat as owner (backwards compat for existing account)
    setRole(data?.role || 'owner')
  }

  if (session === undefined) return (
    <html lang="en"><head>{META}</head>
      <body style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f0efed' }}>
        <div style={{ width:32, height:32, border:'2px solid #ddd', borderTopColor:'#185FA5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </body>
    </html>
  )

  if (!session) return (
    <html lang="en"><head>{META}</head>
      <body><AuthPage /></body>
    </html>
  )

  return (
    <html lang="en"><head>{META}</head>
      <body>{children}</body>
    </html>
  )
}
