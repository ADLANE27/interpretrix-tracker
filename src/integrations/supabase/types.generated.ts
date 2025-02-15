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
          type: "admin_only" | "internal" | "external" | "mixed"
          created_by: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          description?: string | null
          type?: "admin_only" | "internal" | "external" | "mixed"
          created_by: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          description?: string | null
          type?: "admin_only" | "internal" | "external" | "mixed"
          created_by?: string
          created_at?: string
          updated_at?: string
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
          updated_at: string
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
          updated_at?: string
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
          updated_at?: string
        }
      }
      channel_members: {
        Row: {
          id: string
          channel_id: string
          user_id: string
          joined_at: string
          last_read_at: string
        }
        Insert: {
          id?: string
          channel_id: string
          user_id: string
          joined_at?: string
          last_read_at?: string
        }
        Update: {
          id?: string
          channel_id?: string
          user_id?: string
          joined_at?: string
          last_read_at?: string
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
          mission_type: string
          scheduled_start_time: string | null
          scheduled_end_time: string | null
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
          mission_type: string
          scheduled_start_time?: string | null
          scheduled_end_time?: string | null
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
          mission_type?: string
          scheduled_start_time?: string | null
          scheduled_end_time?: string | null
        }
      }
      interpreter_languages: {
        Row: {
          id: string
          interpreter_id: string
          source_language: string
          target_language: string
          created_at: string
        }
        Insert: {
          id?: string
          interpreter_id: string
          source_language: string
          target_language: string
          created_at?: string
        }
        Update: {
          id?: string
          interpreter_id?: string
          source_language?: string
          target_language?: string
          created_at?: string
        }
      }
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
          password_changed: boolean | null
          tarif_15min: number
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
          password_changed?: boolean | null
          tarif_15min?: number
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
          password_changed?: boolean | null
          tarif_15min?: number
        }
      }
      mission_notifications: {
        Row: {
          id: string
          mission_id: string
          interpreter_id: string
          status: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          mission_id: string
          interpreter_id: string
          status?: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          mission_id?: string
          interpreter_id?: string
          status?: string
          created_at?: string
          updated_at?: string
        }
      }
      push_subscriptions: {
        Row: {
          id: string
          interpreter_id: string
          endpoint: string
          auth: string
          p256dh: string
          created_at: string
          updated_at: string
          status: "active" | "expired" | "error" | null
          last_successful_push: string | null
          user_agent: string | null
        }
        Insert: {
          id?: string
          interpreter_id: string
          endpoint: string
          auth: string
          p256dh: string
          created_at?: string
          updated_at?: string
          status?: "active" | "expired" | "error" | null
          last_successful_push?: string | null
          user_agent?: string | null
        }
        Update: {
          id?: string
          interpreter_id?: string
          endpoint?: string
          auth?: string
          p256dh?: string
          created_at?: string
          updated_at?: string
          status?: "active" | "expired" | "error" | null
          last_successful_push?: string | null
          user_agent?: string | null
        }
      }
      onesignal_subscriptions: {
        Row: {
          id: string
          interpreter_id: string
          player_id: string
          platform: string
          user_agent: string | null
          status: string
          notification_count: number
          last_notification_sent: string | null
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          interpreter_id: string
          player_id: string
          platform: string
          user_agent?: string | null
          status?: string
          notification_count?: number
          last_notification_sent?: string | null
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          interpreter_id?: string
          player_id?: string
          platform?: string
          user_agent?: string | null
          status?: string
          notification_count?: number
          last_notification_sent?: string | null
          created_at?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "onesignal_subscriptions_interpreter_id_fkey"
            columns: ["interpreter_id"]
            isOneToOne: false
            referencedRelation: "interpreter_profiles"
            referencedColumns: ["id"]
          }
        ]
      }
      secrets: {
        Row: {
          id: string
          name: string
          value: string
          created_at: string
          updated_at: string
        }
        Insert: {
          id?: string
          name: string
          value: string
          created_at?: string
          updated_at?: string
        }
        Update: {
          id?: string
          name?: string
          value?: string
          created_at?: string
          updated_at?: string
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
    }
    Enums: {
      channel_type: "admin_only" | "internal" | "external" | "mixed"
      employment_status: "salaried" | "self_employed"
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
