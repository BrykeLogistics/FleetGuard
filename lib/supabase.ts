import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export type Database = {
  public: {
    Tables: {
      trucks: {
        Row: {
          id: string
          created_at: string
          truck_number: string
          driver_name: string
          make: string
          model: string
          year: number
          license_plate: string
          vin: string
          status: 'active' | 'inactive' | 'maintenance'
          user_id: string
        }
        Insert: Omit<Database['public']['Tables']['trucks']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['trucks']['Insert']>
      }
      inspections: {
        Row: {
          id: string
          created_at: string
          truck_id: string
          inspector_name: string
          inspection_type: string
          notes: string
          overall_condition: string
          summary: string
          follow_up_required: boolean
          repair_urgency: string
          is_baseline: boolean
          user_id: string
        }
        Insert: Omit<Database['public']['Tables']['inspections']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['inspections']['Insert']>
      }
      damages: {
        Row: {
          id: string
          created_at: string
          inspection_id: string
          truck_id: string
          severity: 'critical' | 'moderate' | 'minor'
          location: string
          description: string
          recommendation: string
          is_new: boolean
          user_id: string
        }
        Insert: Omit<Database['public']['Tables']['damages']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['damages']['Insert']>
      }
      inspection_photos: {
        Row: {
          id: string
          created_at: string
          inspection_id: string
          truck_id: string
          storage_path: string
          photo_type: string
          user_id: string
        }
        Insert: Omit<Database['public']['Tables']['inspection_photos']['Row'], 'id' | 'created_at'>
        Update: Partial<Database['public']['Tables']['inspection_photos']['Insert']>
      }
    }
  }
}
