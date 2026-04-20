'use client'
import { supabase } from '@/lib/supabase'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const path = usePathname()

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/fleet', label: 'Fleet' },
    { href: '/inspect', label: 'New Inspection' },
    { href: '/reports', label: 'Reports' },
  ]

  return (
    <nav style={{ background:'white', borderBottom:'0.5px solid rgba(0,0,0,0.1)', padding:'0 20px', display:'flex', alignItems:'center', height:56, gap:8, position:'sticky', top:0, zIndex:100 }}>
      {/* Logo */}
      <Link href="/" style={{ display:'flex', alignItems:'center', gap:8, textDecoration:'none', marginRight:16 }}>
        <div style={{ width:30, height:30, background:'#185FA5', borderRadius:7, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="17" height="17" viewBox="0 0 24 24" fill="white"><path d="M1 16v-4l3-7h16l3 7v4H1zm3.5-2h15v-1.5l-2.5-5.5H7L4.5 13.5V14zM6 17.5a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0zm9 0a1.5 1.5 0 1 0 3 0 1.5 1.5 0 0 0-3 0z"/></svg>
        </div>
        <span style={{ fontWeight:600, fontSize:15, color:'#1a1a1a' }}>FleetGuard</span>
      </Link>

      {/* Nav links */}
      <div style={{ display:'flex', gap:2, flex:1 }}>
        {navItems.map(item => (
          <Link key={item.href} href={item.href} style={{
            padding:'6px 12px', borderRadius:7, fontSize:13, fontWeight:500, textDecoration:'none',
            background: path === item.href ? '#E6F1FB' : 'transparent',
            color: path === item.href ? '#0C447C' : '#555',
          }}>
            {item.label}
          </Link>
        ))}
      </div>

      {/* Sign out */}
      <button onClick={() => supabase.auth.signOut()} style={{ background:'none', border:'0.5px solid rgba(0,0,0,0.15)', borderRadius:7, padding:'5px 12px', fontSize:13, color:'#888', cursor:'pointer' }}>
        Sign out
      </button>
    </nav>
  )
}
