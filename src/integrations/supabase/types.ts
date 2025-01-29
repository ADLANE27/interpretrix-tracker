export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      interpretation_missions: {
        Row: {
          assigned_interpreter_id: string | null
          assignment_time: string | null
          client_name: string | null
          created_at: string
          estimated_duration: number
          id: string
          notification_expiry: string
          notified_interpreters: string[] | null
          source_language: string
          status: string
          target_language: string
          updated_at: string
        }
        Insert: {
          assigned_interpreter_id?: string | null
          assignment_time?: string | null
          client_name?: string | null
          created_at?: string
          estimated_duration: number
          id?: string
          notification_expiry: string
          notified_interpreters?: string[] | null
          source_language: string
          status?: string
          target_language: string
          updated_at?: string
        }
        Update: {
          assigned_interpreter_id?: string | null
          assignment_time?: string | null
          client_name?: string | null
          created_at?: string
          estimated_duration?: number
          id?: string
          notification_expiry?: string
          notified_interpreters?: string[] | null
          source_language?: string
          status?: string
          target_language?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interpretation_missions_assigned_interpreter_id_fkey"
            columns: ["assigned_interpreter_id"]
            isOneToOne: false
            referencedRelation: "interpreter_profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      interpreter_profiles: {
        Row: {
          address: Json | null
          birth_country: string | null
          created_at: string
          email: string
          employment_status: Database["public"]["Enums"]["employment_status"]
          first_name: string
          id: string
          landline_phone: string | null
          languages: string[]
          last_name: string
          nationality: string | null
          phone_interpretation_rate: number | null
          phone_number: string | null
          profile_picture_url: string | null
          siret_number: string | null
          specializations: string[] | null
          status: string | null
          updated_at: string
          vat_number: string | null
        }
        Insert: {
          address?: Json | null
          birth_country?: string | null
          created_at?: string
          email: string
          employment_status: Database["public"]["Enums"]["employment_status"]
          first_name: string
          id: string
          landline_phone?: string | null
          languages?: string[]
          last_name: string
          nationality?: string | null
          phone_interpretation_rate?: number | null
          phone_number?: string | null
          profile_picture_url?: string | null
          siret_number?: string | null
          specializations?: string[] | null
          status?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Update: {
          address?: Json | null
          birth_country?: string | null
          created_at?: string
          email?: string
          employment_status?: Database["public"]["Enums"]["employment_status"]
          first_name?: string
          id?: string
          landline_phone?: string | null
          languages?: string[]
          last_name?: string
          nationality?: string | null
          phone_interpretation_rate?: number | null
          phone_number?: string | null
          profile_picture_url?: string | null
          siret_number?: string | null
          specializations?: string[] | null
          status?: string | null
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      mission_notifications: {
        Row: {
          created_at: string
          id: string
          interpreter_id: string
          mission_id: string
          status: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          interpreter_id: string
          mission_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          interpreter_id?: string
          mission_id?: string
          status?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "mission_notifications_interpreter_id_fkey"
            columns: ["interpreter_id"]
            isOneToOne: false
            referencedRelation: "interpreter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "mission_notifications_mission_id_fkey"
            columns: ["mission_id"]
            isOneToOne: false
            referencedRelation: "interpretation_missions"
            referencedColumns: ["id"]
          },
        ]
      }
      user_roles: {
        Row: {
          active: boolean | null
          created_at: string
          id: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Insert: {
          active?: boolean | null
          created_at?: string
          id?: string
          role: Database["public"]["Enums"]["user_role"]
          user_id: string
        }
        Update: {
          active?: boolean | null
          created_at?: string
          id?: string
          role?: Database["public"]["Enums"]["user_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      has_role: {
        Args: {
          user_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
    }
    Enums: {
      employment_status: "salaried" | "self_employed"
      interpreter_specialization:
        | "medical"
        | "legal"
        | "technical"
        | "conference"
        | "business"
        | "education"
        | "social_services"
        | "immigration"
        | "mental_health"
        | "financial"
        | "diplomatic"
      user_role: "admin" | "interpreter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

export interface Address {
  street: string;
  postal_code: string;
  city: string;
}

export interface LanguagePair {
  source: string;
  target: string;
}

export interface Mission {
  id: string;
  client_name: string | null;
  source_language: string;
  target_language: string;
  estimated_duration: number;
  status: string;
  created_at: string;
  updated_at: string;
  assigned_interpreter_id: string | null;
  assignment_time: string | null;
  notification_expiry: string;
  notified_interpreters: string[] | null;
  assigned_interpreter?: {
    first_name: string;
    last_name: string;
    profile_picture_url: string | null;
  };
}
