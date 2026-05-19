'use client'
import { useEffect, useState } from 'react'
import { supabase } from './supabase'

export interface Profile {
  id: string
  full_name: string
  role: 'owner' | 'manager' | 'driver'
  csa: string
  email: string
  phone: string
  fedex_id: string
  is_active: boolean
  company_id: string
}

export function useProfile() {
  const [profile, setProfile] = useState<Profile | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) { setLoading(false); return }
      const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      setProfile(data || null)
      setLoading(false)
    }
    load()
  }, [])

  const isOwner = profile?.role === 'owner'
  const isManager = profile?.role === 'manager'
  const isDriver = profile?.role === 'driver'
  const isOwnerOrManager = profile?.role === 'owner' || profile?.role === 'manager'

  return { profile, loading, isOwner, isManager, isDriver, isOwnerOrManager }
}
