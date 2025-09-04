export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "12.2.12 (cd3cf9e)"
  }
  public: {
    Tables: {
      bill_reminders: {
        Row: {
          category: string
          comment: string
          created_at: string
          frequency: string
          id: string
          is_processing: boolean | null
          is_recurring: boolean
          logo_type: string
          next_notification_date: string | null
          notification_date: string | null
          notification_sent: boolean
          recurring_enabled: boolean
          reminder_day: number | null
          reminder_name: string
          reminder_time: string | null
          updated_at: string
          user_id: string
        }
        Insert: {
          category: string
          comment?: string
          created_at?: string
          frequency?: string
          id?: string
          is_processing?: boolean | null
          is_recurring?: boolean
          logo_type?: string
          next_notification_date?: string | null
          notification_date?: string | null
          notification_sent?: boolean
          recurring_enabled?: boolean
          reminder_day?: number | null
          reminder_name: string
          reminder_time?: string | null
          updated_at?: string
          user_id: string
        }
        Update: {
          category?: string
          comment?: string
          created_at?: string
          frequency?: string
          id?: string
          is_processing?: boolean | null
          is_recurring?: boolean
          logo_type?: string
          next_notification_date?: string | null
          notification_date?: string | null
          notification_sent?: boolean
          recurring_enabled?: boolean
          reminder_day?: number | null
          reminder_name?: string
          reminder_time?: string | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      categories: {
        Row: {
          color: string | null
          created_at: string
          icon: string | null
          id: string
          is_default: boolean | null
          name: string
          type: string
          user_id: string | null
        }
        Insert: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name: string
          type: string
          user_id?: string | null
        }
        Update: {
          color?: string | null
          created_at?: string
          icon?: string | null
          id?: string
          is_default?: boolean | null
          name?: string
          type?: string
          user_id?: string | null
        }
        Relationships: []
      }
      category_budgets: {
        Row: {
          auto_renew: boolean
          budget_amount: number
          category_id: string
          created_at: string
          id: string
          period_end: string
          period_start: string
          period_type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          auto_renew?: boolean
          budget_amount: number
          category_id: string
          created_at?: string
          id?: string
          period_end: string
          period_start: string
          period_type?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          auto_renew?: boolean
          budget_amount?: number
          category_id?: string
          created_at?: string
          id?: string
          period_end?: string
          period_start?: string
          period_type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      device_registrations: {
        Row: {
          created_at: string
          device_fingerprint: string
          id: string
          ip_address: unknown
          updated_at: string
          user_id: string | null
        }
        Insert: {
          created_at?: string
          device_fingerprint: string
          id?: string
          ip_address: unknown
          updated_at?: string
          user_id?: string | null
        }
        Update: {
          created_at?: string
          device_fingerprint?: string
          id?: string
          ip_address?: unknown
          updated_at?: string
          user_id?: string | null
        }
        Relationships: []
      }
      fcm_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string | null
          token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform?: string | null
          token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string | null
          token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      feature_usage: {
        Row: {
          created_at: string
          feature_type: string
          id: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_type: string
          id?: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          feature_type?: string
          id?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      feature_usage_limits: {
        Row: {
          created_at: string
          feature_type: string
          id: string
          last_used: string
          updated_at: string
          usage_count: number
          user_id: string
        }
        Insert: {
          created_at?: string
          feature_type: string
          id?: string
          last_used?: string
          updated_at?: string
          usage_count?: number
          user_id: string
        }
        Update: {
          created_at?: string
          feature_type?: string
          id?: string
          last_used?: string
          updated_at?: string
          usage_count?: number
          user_id?: string
        }
        Relationships: []
      }
      installments: {
        Row: {
          category_id: string | null
          created_at: string
          current_installment: number
          first_payment_date: string
          id: string
          installment_amount: number
          is_paid: boolean
          last_payment_date: string
          notes: string | null
          paid_at: string | null
          purchase_name: string
          receipt_url: string | null
          total_amount: number
          total_installments: number
          updated_at: string
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          current_installment?: number
          first_payment_date: string
          id?: string
          installment_amount: number
          is_paid?: boolean
          last_payment_date: string
          notes?: string | null
          paid_at?: string | null
          purchase_name: string
          receipt_url?: string | null
          total_amount: number
          total_installments: number
          updated_at?: string
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          current_installment?: number
          first_payment_date?: string
          id?: string
          installment_amount?: number
          is_paid?: boolean
          last_payment_date?: string
          notes?: string | null
          paid_at?: string | null
          purchase_name?: string
          receipt_url?: string | null
          total_amount?: number
          total_installments?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          created_at: string
          id: string
          message: string
          navigation_data: Json | null
          read: boolean
          reference_id: string | null
          reference_type: string | null
          title: string
          type: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message: string
          navigation_data?: Json | null
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title: string
          type?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string
          navigation_data?: Json | null
          read?: boolean
          reference_id?: string | null
          reference_type?: string | null
          title?: string
          type?: string
          user_id?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          balance_set_at: string | null
          created_at: string
          current_balance: number | null
          full_name: string | null
          id: string
          investment_balance: number | null
          last_selected_account_id: string | null
          monthly_income: number | null
          savings_goal: number | null
          updated_at: string
          user_id: string
        }
        Insert: {
          avatar_url?: string | null
          balance_set_at?: string | null
          created_at?: string
          current_balance?: number | null
          full_name?: string | null
          id?: string
          investment_balance?: number | null
          last_selected_account_id?: string | null
          monthly_income?: number | null
          savings_goal?: number | null
          updated_at?: string
          user_id: string
        }
        Update: {
          avatar_url?: string | null
          balance_set_at?: string | null
          created_at?: string
          current_balance?: number | null
          full_name?: string | null
          id?: string
          investment_balance?: number | null
          last_selected_account_id?: string | null
          monthly_income?: number | null
          savings_goal?: number | null
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      push_notifications: {
        Row: {
          body: string
          created_at: string
          data: Json | null
          delivered_at: string | null
          id: string
          platform: string
          push_token: string | null
          sent_at: string | null
          status: string
          title: string
          updated_at: string
          user_id: string
        }
        Insert: {
          body: string
          created_at?: string
          data?: Json | null
          delivered_at?: string | null
          id?: string
          platform: string
          push_token?: string | null
          sent_at?: string | null
          status?: string
          title: string
          updated_at?: string
          user_id: string
        }
        Update: {
          body?: string
          created_at?: string
          data?: Json | null
          delivered_at?: string | null
          id?: string
          platform?: string
          push_token?: string | null
          sent_at?: string | null
          status?: string
          title?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      sent_notifications: {
        Row: {
          created_at: string
          id: string
        }
        Insert: {
          created_at?: string
          id: string
        }
        Update: {
          created_at?: string
          id?: string
        }
        Relationships: []
      }
      shared_accounts: {
        Row: {
          created_at: string
          id: string
          invited_email: string | null
          owner_id: string
          shared_with_id: string | null
          status: string
        }
        Insert: {
          created_at?: string
          id?: string
          invited_email?: string | null
          owner_id: string
          shared_with_id?: string | null
          status?: string
        }
        Update: {
          created_at?: string
          id?: string
          invited_email?: string | null
          owner_id?: string
          shared_with_id?: string | null
          status?: string
        }
        Relationships: []
      }
      subscribers: {
        Row: {
          created_at: string
          email: string
          id: string
          is_vip: boolean
          stripe_customer_id: string | null
          subscribed: boolean
          subscription_end: string | null
          subscription_tier: string | null
          trial_end: string | null
          updated_at: string
          user_id: string | null
          vip_eternal: boolean
        }
        Insert: {
          created_at?: string
          email: string
          id?: string
          is_vip?: boolean
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
          vip_eternal?: boolean
        }
        Update: {
          created_at?: string
          email?: string
          id?: string
          is_vip?: boolean
          stripe_customer_id?: string | null
          subscribed?: boolean
          subscription_end?: string | null
          subscription_tier?: string | null
          trial_end?: string | null
          updated_at?: string
          user_id?: string | null
          vip_eternal?: boolean
        }
        Relationships: []
      }
      subscriptions: {
        Row: {
          amount: number
          category: string
          created_at: string
          frequency: string
          id: string
          last_charged: string | null
          logo_type: string
          name: string
          renewal_date: string | null
          renewal_day: number
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          category: string
          created_at?: string
          frequency?: string
          id?: string
          last_charged?: string | null
          logo_type?: string
          name: string
          renewal_date?: string | null
          renewal_day: number
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          category?: string
          created_at?: string
          frequency?: string
          id?: string
          last_charged?: string | null
          logo_type?: string
          name?: string
          renewal_date?: string | null
          renewal_day?: number
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      transactions: {
        Row: {
          amount: number
          audio_url: string | null
          category_id: string | null
          created_at: string
          date: string
          description: string | null
          id: string
          notes: string | null
          payment_method: string | null
          receipt_url: string | null
          type: string
          updated_at: string
          user_id: string
        }
        Insert: {
          amount: number
          audio_url?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          type: string
          updated_at?: string
          user_id: string
        }
        Update: {
          amount?: number
          audio_url?: string | null
          category_id?: string | null
          created_at?: string
          date?: string
          description?: string | null
          id?: string
          notes?: string | null
          payment_method?: string | null
          receipt_url?: string | null
          type?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "transactions_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      user_push_tokens: {
        Row: {
          created_at: string
          id: string
          platform: string
          push_token: string
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          platform: string
          push_token: string
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          platform?: string
          push_token?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      user_settings: {
        Row: {
          created_at: string
          id: string
          setting_key: string
          setting_value: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          setting_key: string
          setting_value: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          setting_key?: string
          setting_value?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      calculate_next_notification_date: {
        Args: { due_day: number; reference_date?: string }
        Returns: string
      }
      calculate_next_reminder_date: {
        Args:
          | {
              advance_days?: number
              frequency_type: string
              reference_date?: string
              reminder_day?: number
            }
          | { frequency_type: string; reference_date?: string }
          | {
              frequency_type: string
              reference_date?: string
              reminder_day?: number
            }
        Returns: string
      }
      configure_auth_settings: {
        Args: Record<PropertyKey, never>
        Returns: undefined
      }
      date_trunc_day: {
        Args: { "": string }
        Returns: string
      }
      get_user_by_email: {
        Args: { email_to_search: string }
        Returns: {
          email: string
          id: string
        }[]
      }
      process_installment_payment: {
        Args: {
          p_amount: number
          p_category_id?: string
          p_description: string
          p_installment_id: string
          p_receipt_url?: string
          p_user_id: string
        }
        Returns: Json
      }
      request_password_reset: {
        Args: { user_email: string }
        Returns: undefined
      }
      test_subscription_notifications: {
        Args: Record<PropertyKey, never>
        Returns: string
      }
    }
    Enums: {
      shared_account_status: "pending" | "accepted" | "pending_registration"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      shared_account_status: ["pending", "accepted", "pending_registration"],
    },
  },
} as const
