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
        <div style={{ width:30, height:34, display:'flex', alignItems:'center', justifyContent:'center' }}>
          <svg width="18" height="20" viewBox="0 0 32 36" fill="none"><path d="M16 1 L30 6.5 L30 19 Q30 28 16 33 Q2 28 2 19 L2 6.5 Z" fill="white"/><path d="M16 4 L27 8.5 L27 19 Q27 26 16 30 Q5 26 5 19 L5 8.5 Z" fill="#185FA5"/><rect x="7" y="12" width="12" height="8" rx="1.5" fill="white" opacity="0.95"/><rect x="20" y="14" width="6" height="6" rx="1" fill="white" opacity="0.7"/><rect x="7" y="18" width="19" height="2" rx="1" fill="white" opacity="0.25"/><circle cx="11" cy="22" r="2.5" fill="white"/><circle cx="23" cy="22" r="2.5" fill="white"/></svg>
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
