'use client'
import { supabase } from '@/lib/supabase'
import { useProfile } from '@/lib/useProfile'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useState, useEffect, useRef } from 'react'

export default function Navbar() {
  const { profile, isOwner, isDriver } = useProfile()
  const path = usePathname()
  const [open, setOpen] = useState(false)
  const menuRef = useRef<HTMLDivElement>(null)

  const navItems = isDriver
    ? [
        { href: '/', label: 'Dashboard', icon: DashboardIcon },
        { href: '/inspect', label: 'New Inspection', icon: InspectIcon },
      ]
    : [
        { href: '/', label: 'Dashboard', icon: DashboardIcon },
        { href: '/fleet', label: 'Fleet', icon: FleetIcon },
        { href: '/inspect', label: 'New Inspection', icon: InspectIcon },
        { href: '/reports', label: 'Reports', icon: ReportsIcon },
        ...(isOwner
          ? [
              { href: '/users', label: 'Users', icon: UsersIcon },
              { href: '/admin', label: 'Admin', icon: AdminIcon },
            ]
          : []),
      ]

  // Close menu on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  // Close menu on route change
  useEffect(() => { setOpen(false) }, [path])

  // Lock body scroll when menu open on mobile
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [open])

  const roleStyle = {
    owner: { bg: '#FCEBEB', color: '#A32D2D' },
    manager: { bg: '#E6F1FB', color: '#0C447C' },
    driver: { bg: '#EAF3DE', color: '#27500A' },
  }[profile?.role || 'driver'] || { bg: '#EAF3DE', color: '#27500A' }

  return (
    <>
      <nav style={{
        background: 'white',
        borderBottom: '0.5px solid rgba(0,0,0,0.1)',
        padding: '0 16px',
        display: 'flex',
        alignItems: 'center',
        height: 60,
        position: 'sticky',
        top: 0,
        zIndex: 200,
      }}>
        {/* Logo */}
        <Link href="/" style={{ display: 'flex', alignItems: 'center', gap: 10, textDecoration: 'none', flex: 1 }}>
          <svg width="32" height="38" viewBox="0 0 100 115" fill="none">
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
            <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a', lineHeight: 1.1 }}>FleetGuard</div>
            <div style={{ fontSize: 10, color: '#888', letterSpacing: '0.08em', textTransform: 'uppercase' }}>AI Inspection</div>
          </div>
        </Link>

        {/* Desktop nav links */}
        <div className="desktop-nav" style={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          {navItems.map(item => (
            <Link key={item.href} href={item.href} style={{
              padding: '6px 12px',
              borderRadius: 7,
              fontSize: 13,
              fontWeight: 500,
              textDecoration: 'none',
              background: path === item.href ? '#E6F1FB' : 'transparent',
              color: path === item.href ? '#0C447C' : '#555',
              transition: 'background 0.15s, color 0.15s',
            }}>
              {item.label}
            </Link>
          ))}
          {profile && (
            <span style={{
              fontSize: 11, padding: '3px 10px', borderRadius: 20,
              background: roleStyle.bg, color: roleStyle.color,
              fontWeight: 500, marginLeft: 8,
            }}>
              {profile.full_name?.split(' ')[0]} · {profile.role}
            </span>
          )}
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              background: 'none', border: '0.5px solid rgba(0,0,0,0.15)',
              borderRadius: 7, padding: '5px 12px', fontSize: 13,
              color: '#888', cursor: 'pointer', marginLeft: 4,
            }}
          >
            Sign out
          </button>
        </div>

        {/* Mobile: role pill + hamburger */}
        <div className="mobile-nav" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {profile && (
            <span style={{
              fontSize: 11, padding: '3px 8px', borderRadius: 20,
              background: roleStyle.bg, color: roleStyle.color,
              fontWeight: 500, whiteSpace: 'nowrap',
            }}>
              {profile.full_name?.split(' ')[0]}
            </span>
          )}
          <button
            onClick={() => setOpen(o => !o)}
            aria-label="Open menu"
            aria-expanded={open}
            style={{
              background: 'none', border: 'none', cursor: 'pointer',
              padding: 8, borderRadius: 8, display: 'flex', flexDirection: 'column',
              gap: 5, alignItems: 'center', justifyContent: 'center',
              width: 40, height: 40,
            }}
          >
            <HamburgerIcon open={open} />
          </button>
        </div>
      </nav>

      {/* Mobile drawer overlay */}
      <div
        className="mobile-nav"
        onClick={() => setOpen(false)}
        style={{
          position: 'fixed', inset: 0, zIndex: 190,
          background: 'rgba(0,0,0,0.35)',
          opacity: open ? 1 : 0,
          pointerEvents: open ? 'auto' : 'none',
          transition: 'opacity 0.2s',
        }}
      />

      {/* Mobile drawer */}
      <div
        ref={menuRef}
        className="mobile-nav"
        style={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          width: 'min(280px, 85vw)',
          background: 'white',
          zIndex: 195,
          transform: open ? 'translateX(0)' : 'translateX(100%)',
          transition: 'transform 0.25s cubic-bezier(0.4, 0, 0.2, 1)',
          display: 'flex',
          flexDirection: 'column',
          boxShadow: '-4px 0 24px rgba(0,0,0,0.12)',
        }}
      >
        {/* Drawer header */}
        <div style={{
          padding: '20px 20px 16px',
          borderBottom: '0.5px solid rgba(0,0,0,0.08)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            {profile && (
              <>
                <div style={{ fontWeight: 600, fontSize: 14, color: '#1a1a1a' }}>
                  {profile.full_name || 'User'}
                </div>
                <div style={{
                  fontSize: 11, marginTop: 2,
                  display: 'inline-block', padding: '2px 8px',
                  borderRadius: 20, background: roleStyle.bg, color: roleStyle.color,
                  fontWeight: 500, textTransform: 'capitalize',
                }}>
                  {profile.role}
                </div>
              </>
            )}
          </div>
          <button
            onClick={() => setOpen(false)}
            aria-label="Close menu"
            style={{
              background: '#f4f4f4', border: 'none', borderRadius: 8,
              width: 32, height: 32, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              color: '#666', fontSize: 18, fontWeight: 300,
            }}
          >
            ✕
          </button>
        </div>

        {/* Nav links */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px' }}>
          {navItems.map(item => {
            const Icon = item.icon
            const active = path === item.href
            return (
              <Link
                key={item.href}
                href={item.href}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '12px 14px',
                  borderRadius: 10,
                  fontSize: 15,
                  fontWeight: active ? 600 : 500,
                  textDecoration: 'none',
                  color: active ? '#0C447C' : '#333',
                  background: active ? '#E6F1FB' : 'transparent',
                  marginBottom: 2,
                  transition: 'background 0.15s',
                }}
              >
                <span style={{ opacity: active ? 1 : 0.5, flexShrink: 0 }}>
                  <Icon active={active} />
                </span>
                {item.label}
                {active && (
                  <span style={{
                    marginLeft: 'auto', width: 6, height: 6,
                    borderRadius: '50%', background: '#185FA5',
                  }} />
                )}
              </Link>
            )
          })}
        </div>

        {/* Sign out at bottom */}
        <div style={{ padding: '12px 12px 32px', borderTop: '0.5px solid rgba(0,0,0,0.08)' }}>
          <button
            onClick={() => supabase.auth.signOut()}
            style={{
              width: '100%', background: 'none',
              border: '0.5px solid rgba(0,0,0,0.15)',
              borderRadius: 10, padding: '12px 16px',
              fontSize: 14, color: '#666', cursor: 'pointer',
              display: 'flex', alignItems: 'center', gap: 10,
              fontWeight: 500,
            }}
          >
            <SignOutIcon />
            Sign out
          </button>
        </div>
      </div>

      {/* Responsive CSS */}
      <style>{`
        .desktop-nav { display: flex !important; }
        .mobile-nav  { display: none !important; }

        @media (max-width: 700px) {
          .desktop-nav { display: none !important; }
          .mobile-nav  { display: flex !important; }
        }
      `}</style>
    </>
  )
}

/* ── Animated hamburger icon ── */
function HamburgerIcon({ open }: { open: boolean }) {
  const bar = {
    display: 'block', width: 22, height: 2,
    background: '#333', borderRadius: 2,
    transition: 'transform 0.22s, opacity 0.22s',
    transformOrigin: 'center',
  }
  return (
    <span style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
      <span style={{
        ...bar,
        transform: open ? 'translateY(7px) rotate(45deg)' : 'none',
      }} />
      <span style={{
        ...bar,
        opacity: open ? 0 : 1,
        transform: open ? 'scaleX(0)' : 'none',
      }} />
      <span style={{
        ...bar,
        transform: open ? 'translateY(-7px) rotate(-45deg)' : 'none',
      }} />
    </span>
  )
}

/* ── Nav icons ── */
function DashboardIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#0C447C' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
      <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
    </svg>
  )
}
function FleetIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#0C447C' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="1" y="3" width="15" height="13" rx="2"/>
      <path d="M16 8h4l3 5v3h-7V8z"/>
      <circle cx="5.5" cy="18.5" r="2.5"/><circle cx="18.5" cy="18.5" r="2.5"/>
    </svg>
  )
}
function InspectIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#0C447C' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 013 3L7 19l-4 1 1-4L16.5 3.5z"/>
    </svg>
  )
}
function ReportsIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#0C447C' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/>
      <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
      <polyline points="10 9 9 9 8 9"/>
    </svg>
  )
}
function UsersIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#0C447C' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/>
    </svg>
  )
}
function AdminIcon({ active }: { active?: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke={active ? '#0C447C' : '#555'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3"/>
      <path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/>
    </svg>
  )
}
function SignOutIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#888" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/>
      <polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
    </svg>
  )
}
