'use client'
import './globals.css'
import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { Session } from '@supabase/supabase-js'
import AuthPage from './components/AuthPage'

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<Session | null | undefined>(undefined)

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session))
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => setSession(session))
    return () => subscription.unsubscribe()
  }, [])

  if (session === undefined) return (
    <html lang="en"><body style={{ display:'flex', alignItems:'center', justifyContent:'center', minHeight:'100vh', background:'#f0efed' }}>
      <div style={{ width:32, height:32, border:'2px solid #ddd', borderTopColor:'#185FA5', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </body></html>
  )

  if (!session) return <html lang="en"><body><AuthPage /></body></html>

  return <html lang="en"><body>{children}</body></html>
}
