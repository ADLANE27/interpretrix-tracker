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
      channel_members: {
        Row: {
          channel_id: string
          id: string
          joined_at: string
          last_read_at: string
          user_id: string
        }
        Insert: {
          channel_id: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id: string
        }
        Update: {
          channel_id?: string
          id?: string
          joined_at?: string
          last_read_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "channel_members_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
        ]
      }
      chat_channels: {
        Row: {
          created_at: string
          created_by: string
          description: string | null
          id: string
          name: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          created_by: string
          description?: string | null
          id?: string
          name: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          created_by?: string
          description?: string | null
          id?: string
          name?: string
          updated_at?: string
        }
        Relationships: []
      }
      chat_messages: {
        Row: {
          attachments: Json[] | null
          channel_id: string
          content: string
          created_at: string
          id: string
          parent_message_id: string | null
          reactions: Json
          sender_id: string
          updated_at: string
        }
        Insert: {
          attachments?: Json[] | null
          channel_id: string
          content: string
          created_at?: string
          id?: string
          parent_message_id?: string | null
          reactions?: Json
          sender_id: string
          updated_at?: string
        }
        Update: {
          attachments?: Json[] | null
          channel_id?: string
          content?: string
          created_at?: string
          id?: string
          parent_message_id?: string | null
          reactions?: Json
          sender_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "chat_messages_channel_id_fkey"
            columns: ["channel_id"]
            isOneToOne: false
            referencedRelation: "chat_channels"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "chat_messages_parent_message_id_fkey"
            columns: ["parent_message_id"]
            isOneToOne: false
            referencedRelation: "chat_messages"
            referencedColumns: ["id"]
          },
        ]
      }
      interpretation_missions: {
        Row: {
          assigned_interpreter_id: string | null
          assignment_time: string | null
          client_name: string | null
          created_at: string
          estimated_duration: number
          id: string
          mission_type: string
          notification_expiry: string
          notified_interpreters: string[] | null
          scheduled_end_time: string | null
          scheduled_start_time: string | null
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
          mission_type?: string
          notification_expiry: string
          notified_interpreters?: string[] | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
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
          mission_type?: string
          notification_expiry?: string
          notified_interpreters?: string[] | null
          scheduled_end_time?: string | null
          scheduled_start_time?: string | null
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
          {
            foreignKeyName: "interpretation_missions_assigned_interpreter_id_fkey"
            columns: ["assigned_interpreter_id"]
            isOneToOne: false
            referencedRelation: "interpreters_with_next_mission"
            referencedColumns: ["id"]
          },
        ]
      }
      interpreter_connection_status: {
        Row: {
          connection_status: string | null
          created_at: string
          interpreter_id: string
          is_online: boolean | null
          last_heartbeat: string | null
          last_seen_at: string | null
          updated_at: string
        }
        Insert: {
          connection_status?: string | null
          created_at?: string
          interpreter_id: string
          is_online?: boolean | null
          last_heartbeat?: string | null
          last_seen_at?: string | null
          updated_at?: string
        }
        Update: {
          connection_status?: string | null
          created_at?: string
          interpreter_id?: string
          is_online?: boolean | null
          last_heartbeat?: string | null
          last_seen_at?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "interpreter_connection_status_interpreter_id_fkey"
            columns: ["interpreter_id"]
            isOneToOne: true
            referencedRelation: "interpreter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interpreter_connection_status_interpreter_id_fkey"
            columns: ["interpreter_id"]
            isOneToOne: true
            referencedRelation: "interpreters_with_next_mission"
            referencedColumns: ["id"]
          },
        ]
      }
      interpreter_languages: {
        Row: {
          created_at: string
          id: string
          interpreter_id: string
          source_language: string
          target_language: string
        }
        Insert: {
          created_at?: string
          id?: string
          interpreter_id: string
          source_language: string
          target_language: string
        }
        Update: {
          created_at?: string
          id?: string
          interpreter_id?: string
          source_language?: string
          target_language?: string
        }
        Relationships: [
          {
            foreignKeyName: "interpreter_languages_interpreter_id_fkey"
            columns: ["interpreter_id"]
            isOneToOne: false
            referencedRelation: "interpreter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "interpreter_languages_interpreter_id_fkey"
            columns: ["interpreter_id"]
            isOneToOne: false
            referencedRelation: "interpreters_with_next_mission"
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
          password_changed: boolean
          phone_interpretation_rate: number | null
          phone_number: string | null
          profile_picture_url: string | null
          siret_number: string | null
          specializations: string[] | null
          status: string | null
          tarif_15min: number
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
          password_changed?: boolean
          phone_interpretation_rate?: number | null
          phone_number?: string | null
          profile_picture_url?: string | null
          siret_number?: string | null
          specializations?: string[] | null
          status?: string | null
          tarif_15min?: number
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
          password_changed?: boolean
          phone_interpretation_rate?: number | null
          phone_number?: string | null
          profile_picture_url?: string | null
          siret_number?: string | null
          specializations?: string[] | null
          status?: string | null
          tarif_15min?: number
          updated_at?: string
          vat_number?: string | null
        }
        Relationships: []
      }
      message_mentions: {
        Row: {
          channel_id: string
          created_at: string
          id: string
          mentioned_user_id: string
          message_id: string
          status: string
          updated_at: string
        }
        Insert: {
          channel_id: string
          created_at?: string
          id?: string
          mentioned_user_id: string
          message_id: string
          status?: string
          updated_at?: string
        }
        Update: {
          channel_id?: string
          created_at?: string
          id?: string
          mentioned_user_id?: string
          message_id?: string
          status?: string
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
        ]
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
            foreignKeyName: "mission_notifications_interpreter_id_fkey"
            columns: ["interpreter_id"]
            isOneToOne: false
            referencedRelation: "interpreters_with_next_mission"
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
      push_subscriptions: {
        Row: {
          auth: string
          created_at: string
          endpoint: string
          id: string
          interpreter_id: string
          last_successful_push: string | null
          p256dh: string
          status: Database["public"]["Enums"]["subscription_status"] | null
          updated_at: string
          user_agent: string | null
        }
        Insert: {
          auth: string
          created_at?: string
          endpoint: string
          id?: string
          interpreter_id: string
          last_successful_push?: string | null
          p256dh: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string
          user_agent?: string | null
        }
        Update: {
          auth?: string
          created_at?: string
          endpoint?: string
          id?: string
          interpreter_id?: string
          last_successful_push?: string | null
          p256dh?: string
          status?: Database["public"]["Enums"]["subscription_status"] | null
          updated_at?: string
          user_agent?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "push_subscriptions_interpreter_id_fkey"
            columns: ["interpreter_id"]
            isOneToOne: false
            referencedRelation: "interpreter_profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "push_subscriptions_interpreter_id_fkey"
            columns: ["interpreter_id"]
            isOneToOne: false
            referencedRelation: "interpreters_with_next_mission"
            referencedColumns: ["id"]
          },
        ]
      }
      secrets: {
        Row: {
          created_at: string
          id: string
          name: string
          updated_at: string
          value: string
        }
        Insert: {
          created_at?: string
          id?: string
          name: string
          updated_at?: string
          value: string
        }
        Update: {
          created_at?: string
          id?: string
          name?: string
          updated_at?: string
          value?: string
        }
        Relationships: []
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
      interpreters_with_next_mission: {
        Row: {
          address: Json | null
          birth_country: string | null
          created_at: string | null
          email: string | null
          employment_status:
            | Database["public"]["Enums"]["employment_status"]
            | null
          first_name: string | null
          id: string | null
          landline_phone: string | null
          languages: string[] | null
          last_name: string | null
          nationality: string | null
          next_mission_duration: number | null
          next_mission_end: string | null
          next_mission_start: string | null
          password_changed: boolean | null
          phone_interpretation_rate: number | null
          phone_number: string | null
          profile_picture_url: string | null
          siret_number: string | null
          specializations: string[] | null
          status: string | null
          tarif_15min: number | null
          updated_at: string | null
          vat_number: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      get_available_channel_users: {
        Args: {
          channel_id: string
          search_query: string
        }
        Returns: {
          user_id: string
          email: string
          first_name: string
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      get_channel_interpreters_by_language: {
        Args: {
          p_channel_id: string
          p_target_language: string
        }
        Returns: {
          user_id: string
          email: string
          first_name: string
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
        }[]
      }
      get_channel_members: {
        Args: {
          channel_id: string
        }
        Returns: {
          user_id: string
          email: string
          first_name: string
          last_name: string
          role: Database["public"]["Enums"]["user_role"]
          joined_at: string
        }[]
      }
      get_channel_target_languages: {
        Args: {
          channel_id: string
        }
        Returns: {
          target_language: string
        }[]
      }
      get_full_name_from_metadata: {
        Args: {
          metadata: Json
        }
        Returns: string
      }
      get_interpreter_with_status: {
        Args: {
          p_interpreter_id: string
        }
        Returns: {
          id: string
          email: string
          first_name: string
          last_name: string
          active: boolean
          tarif_15min: number
          employment_status: Database["public"]["Enums"]["employment_status"]
          languages: string[]
          status: string
        }[]
      }
      get_message_sender_details: {
        Args: {
          sender_id: string
        }
        Returns: {
          id: string
          name: string
          avatar_url: string
        }[]
      }
      handle_mission_acceptance: {
        Args: {
          p_mission_id: string
          p_interpreter_id: string
        }
        Returns: undefined
      }
      has_role: {
        Args: {
          user_id: string
          role: Database["public"]["Enums"]["user_role"]
        }
        Returns: boolean
      }
      migrate_interpreter_languages: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      rename_storage_object: {
        Args: {
          bucket_name: string
          old_path: string
          new_path: string
        }
        Returns: undefined
      }
    }
    Enums: {
      employment_status:
        | "salaried_aft"
        | "salaried_aftcom"
        | "salaried_planet"
        | "self_employed"
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
      subscription_status: "active" | "expired" | "error"
      user_role: "admin" | "interpreter"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
