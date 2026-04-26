'use client'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/useProfile'
import Link from 'next/link'
import { usePathname } from 'next/navigation'

export default function Navbar() {
  const { profile, isOwner, isManager, isDriver } = useProfile()
  const path = usePathname()

  const navItems = [
    { href: '/', label: 'Dashboard' },
    { href: '/fleet', label: 'Fleet' },
    { href: '/inspect', label: 'New Inspection' },
    { href: '/reports', label: 'Reports' },
  ]

  return (
    <nav style={{ background:'white', borderBottom:'0.5px solid rgba(0,0,0,0.1)', padding:'0 20px', display:'flex', alignItems:'center', height:60, gap:8, position:'sticky', top:0, zIndex:100 }}>
      {/* Logo */}
      <Link href="/" style={{ display:'flex', alignItems:'center', gap:10, textDecoration:'none', marginRight:16 }}>
        <svg width="36" height="42" viewBox="0 0 100 115" fill="none">
          <path d="M50 4 L90 18 L90 54 Q90 80 50 96 Q10 80 10 54 L10 18 Z" fill="#185FA5"/>
          <path d="M50 10 L84 23 L84 54 Q84 76 50 90 Q16 76 16 54 L16 23 Z" fill="#0C447C"/>
          <rect x="22" y="38" width="32" height="20" rx="3.5" fill="white"/>
          <rect x="56" y="43" width="22" height="15" rx="2.5" fill="white" opacity="0.75"/>
          <rect x="58" y="45" width="18" height="11" rx="1.5" fill="#185FA5" opacity="0.45"/>
          <rect x="22" y="55" width="56" height="3.5" rx="1.5" fill="white" opacity="0.25"/>
          <circle cx="32" cy="63" r="6" fill="white"/>
          <circle cx="32" cy="63" r="3" fill="#0C447C"/>
          <circle cx="64" cy="63" r="6" fill="white"/>
          <circle cx="64" cy="63" r="3" fill="#0C447C"/>
        </svg>
        <div>
          <div style={{ fontWeight:700, fontSize:16, color:'#1a1a1a', lineHeight:1.1 }}>FleetGuard</div>
          <div style={{ fontSize:10, color:'#888', letterSpacing:'0.08em', textTransform:'uppercase' }}>AI Inspection</div>
        </div>
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
      {profile && <span style={{ fontSize:11, padding:'3px 10px', borderRadius:20, background: profile.role==='owner'?'#FCEBEB':profile.role==='manager'?'#E6F1FB':'#EAF3DE', color: profile.role==='owner'?'#A32D2D':profile.role==='manager'?'#0C447C':'#27500A', fontWeight:500, marginRight:4 }}>{profile.full_name?.split(' ')[0]} · {profile.role}</span>}
            <button onClick={() => supabase.auth.signOut()} style={{ background:'none', border:'0.5px solid rgba(0,0,0,0.15)', borderRadius:7, padding:'5px 12px', fontSize:13, color:'#888', cursor:'pointer' }}>
        Sign out
      </button>
    </nav>
  )
}
