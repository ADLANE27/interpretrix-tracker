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
      chat_channels: {
        Row: {
          id: string
          name: string
          description: string | null
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          created_at?: string
          updated_at?: string | null
        }
      }
      chat_messages: {
        Row: {
          id: string
          channel_id: string
          sender_id: string
          content: string
          parent_message_id: string | null
          attachments: Json[] | null
          reactions: Json
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          channel_id: string
          sender_id: string
          content: string
          parent_message_id?: string | null
          attachments?: Json[] | null
          reactions?: Json
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          channel_id?: string
          sender_id?: string
          content?: string
          parent_message_id?: string | null
          attachments?: Json[] | null
          reactions?: Json
          created_at?: string
          updated_at?: string | null
        }
      }
      channel_members: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          role: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          role?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string
          role?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      interpretation_missions: {
        Row: {
          id: string
          client_id: string
          assigned_interpreter_id: string | null
          source_language: string
          target_language: string
          mission_type: string
          status: string
          scheduled_start_time: string | null
          scheduled_end_time: string | null
          estimated_duration: number
          notified_interpreters: string[]
          created_at: string
          updated_at: string | null
          assignment_time: string | null
          client_name: string | null
          client_phone: string | null
          client_email: string | null
          notes: string | null
        }
        Insert: {
          id?: string
          client_id: string
          assigned_interpreter_id?: string | null
          source_language: string
          target_language: string
          mission_type?: string
          status?: string
          scheduled_start_time?: string | null
          scheduled_end_time?: string | null
          estimated_duration?: number
          notified_interpreters?: string[]
          created_at?: string
          updated_at?: string | null
          assignment_time?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_email?: string | null
          notes?: string | null
        }
        Update: {
          id?: string
          client_id?: string
          assigned_interpreter_id?: string | null
          source_language?: string
          target_language?: string
          mission_type?: string
          status?: string
          scheduled_start_time?: string | null
          scheduled_end_time?: string | null
          estimated_duration?: number
          notified_interpreters?: string[]
          created_at?: string
          updated_at?: string | null
          assignment_time?: string | null
          client_name?: string | null
          client_phone?: string | null
          client_email?: string | null
          notes?: string | null
        }
      }
      interpreter_profiles: {
        Row: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone_number: string | null
          languages: string[]
          employment_status: string
          status: string
          address: Json | null
          birth_country: string | null
          nationality: string | null
          phone_interpretation_rate: number | null
          siret_number: string | null
          vat_number: string | null
          profile_picture_url: string | null
          password_changed: boolean
          created_at: string
          updated_at: string | null
          landline_phone: string | null
          tarif_15min: number | null
        }
        Insert: {
          id: string
          first_name: string
          last_name: string
          email: string
          phone_number?: string | null
          languages: string[]
          employment_status?: string
          status?: string
          address?: Json | null
          birth_country?: string | null
          nationality?: string | null
          phone_interpretation_rate?: number | null
          siret_number?: string | null
          vat_number?: string | null
          profile_picture_url?: string | null
          password_changed?: boolean
          created_at?: string
          updated_at?: string | null
          landline_phone?: string | null
          tarif_15min?: number | null
        }
        Update: {
          id?: string
          first_name?: string
          last_name?: string
          email?: string
          phone_number?: string | null
          languages?: string[]
          employment_status?: string
          status?: string
          address?: Json | null
          birth_country?: string | null
          nationality?: string | null
          phone_interpretation_rate?: number | null
          siret_number?: string | null
          vat_number?: string | null
          profile_picture_url?: string | null
          password_changed?: boolean
          created_at?: string
          updated_at?: string | null
          landline_phone?: string | null
          tarif_15min?: number | null
        }
      }
      message_mentions: {
        Row: {
          id: string
          channel_id: string
          message_id: string
          mentioned_user_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          message_id: string
          mentioned_user_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          message_id?: string
          mentioned_user_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "message_mentions_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_mentions_message_id_fkey"
            columns: ["message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "message_mentions_mentioned_user_id_fkey"
            columns: ["mentioned_user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          }
        ]
      }
      mission_notifications: {
        Row: {
          id: string
          mission_id: string
          interpreter_id: string
          status: string
          created_at: string
          updated_at: string | null
        }
        Insert: {
          id?: string
          mission_id: string
          interpreter_id: string
          status?: string
          created_at?: string
          updated_at?: string | null
        }
        Update: {
          id?: string
          mission_id?: string
          interpreter_id?: string
          status?: string
          created_at?: string
          updated_at?: string | null
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          endpoint: string
          p256dh: string
          auth: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          endpoint?: string
          p256dh?: string
          auth?: string
          created_at?: string
        }
      }
      user_roles: {
        Row: {
          id: string
          user_id: string
          role: string
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          role: string
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          role?: string
          created_at?: string
        }
      }
      vapid_keys: {
        Row: {
          id: number
          public_key: string
          private_key: string
          created_at: string
        }
        Insert: {
          id?: number
          public_key: string
          private_key: string
          created_at?: string
        }
        Update: {
          id?: number
          public_key?: string
          private_key?: string
          created_at?: string
        }
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      get_message_sender_details: {
        Args: {
          sender_id: string
        }
        Returns: {
          id: string
          name: string
          avatar_url: string | null
        }[]
      }
    }
    Enums: {
      [_ in never]: never
    }
  }
}