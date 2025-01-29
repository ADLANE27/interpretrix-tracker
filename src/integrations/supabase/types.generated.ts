export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export interface Database {
  public: {
    Tables: {
      interpreter_profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          employment_status: "salaried" | "self_employed"
          phone_number: string | null
          email: string
          languages: string[]
          phone_interpretation_rate: number | null
          siret_number: string | null
          vat_number: string | null
          status: string | null
          created_at: string
          updated_at: string
          address: Json | null
          birth_country: string | null
          nationality: string | null
          specializations: string[] | null
          profile_picture_url: string | null
          landline_phone: string | null
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          employment_status: "salaried" | "self_employed"
          phone_number?: string | null
          email: string
          languages: string[]
          phone_interpretation_rate?: number | null
          siret_number?: string | null
          vat_number?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
          address?: Json | null
          birth_country?: string | null
          nationality?: string | null
          specializations?: string[] | null
          profile_picture_url?: string | null
          landline_phone?: string | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          employment_status?: "salaried" | "self_employed"
          phone_number?: string | null
          email?: string
          languages?: string[]
          phone_interpretation_rate?: number | null
          siret_number?: string | null
          vat_number?: string | null
          status?: string | null
          created_at?: string
          updated_at?: string
          address?: Json | null
          birth_country?: string | null
          nationality?: string | null
          specializations?: string[] | null
          profile_picture_url?: string | null
          landline_phone?: string | null
        }
      }
      interpretation_missions: {
        Row: {
          id: string
          client_name: string | null
          source_language: string
          target_language: string
          estimated_duration: number
          status: string
          created_at: string
          updated_at: string
          assigned_interpreter_id: string | null
          assignment_time: string | null
          notification_expiry: string
          notified_interpreters: string[] | null
        }
        Insert: {
          id?: string
          client_name?: string | null
          source_language: string
          target_language: string
          estimated_duration: number
          status?: string
          created_at?: string
          updated_at?: string
          assigned_interpreter_id?: string | null
          assignment_time?: string | null
          notification_expiry: string
          notified_interpreters?: string[] | null
        }
        Update: {
          id?: string
          client_name?: string | null
          source_language?: string
          target_language?: string
          estimated_duration?: number
          status?: string
          created_at?: string
          updated_at?: string
          assigned_interpreter_id?: string | null
          assignment_time?: string | null
          notification_expiry?: string
          notified_interpreters?: string[] | null
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: "admin" | "interpreter"
          created_at: string
          active: boolean | null
        }
        Insert: {
          id?: string
          user_id: string
          role: "admin" | "interpreter"
          created_at?: string
          active?: boolean | null
        }
        Update: {
          id?: string
          user_id?: string
          role?: "admin" | "interpreter"
          created_at?: string
          active?: boolean | null
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      employment_status: "salaried" | "self_employed"
      user_role: "admin" | "interpreter"
    }
  }
}