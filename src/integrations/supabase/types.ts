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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      business_metrics: {
        Row: {
          key: string
          label: string
          note: string | null
          unit: string | null
          value: number | null
        }
        Insert: {
          key: string
          label: string
          note?: string | null
          unit?: string | null
          value?: number | null
        }
        Update: {
          key?: string
          label?: string
          note?: string | null
          unit?: string | null
          value?: number | null
        }
        Relationships: []
      }
      claim_field_changes: {
        Row: {
          case_id: string
          created_at: string
          editor: string
          field: string
          id: number
          new_value: Json | null
          old_value: Json | null
        }
        Insert: {
          case_id: string
          created_at?: string
          editor: string
          field: string
          id?: never
          new_value?: Json | null
          old_value?: Json | null
        }
        Update: {
          case_id?: string
          created_at?: string
          editor?: string
          field?: string
          id?: never
          new_value?: Json | null
          old_value?: Json | null
        }
        Relationships: [
          {
            foreignKeyName: "claim_field_changes_case_id_fkey"
            columns: ["case_id"]
            isOneToOne: false
            referencedRelation: "claims"
            referencedColumns: ["case_id"]
          },
        ]
      }
      claims: {
        Row: {
          case_id: string
          case_status: string
          claim_summary: string
          source_fields: Json
        }
        Insert: {
          case_id: string
          case_status: string
          claim_summary: string
          source_fields: Json
        }
        Update: {
          case_id?: string
          case_status?: string
          claim_summary?: string
          source_fields?: Json
        }
        Relationships: []
      }
      decisions: {
        Row: {
          case_id: string
          case_status: string
          created_at: string
          explanation: string
          matched_rule: string
          policy_clause: string | null
          policy_version: string
          recommendation: string
          supporting_facts: Json
        }
        Insert: {
          case_id: string
          case_status: string
          created_at?: string
          explanation: string
          matched_rule: string
          policy_clause?: string | null
          policy_version: string
          recommendation: string
          supporting_facts?: Json
        }
        Update: {
          case_id?: string
          case_status?: string
          created_at?: string
          explanation?: string
          matched_rule?: string
          policy_clause?: string | null
          policy_version?: string
          recommendation?: string
          supporting_facts?: Json
        }
        Relationships: []
      }
      overrides: {
        Row: {
          case_id: string
          corrected_recommendation: string
          created_at: string
          id: number
          original_recommendation: string
          policy_version: string
          reason: string
          request_id: string | null
          reviewer: string
          revision: number
        }
        Insert: {
          case_id: string
          corrected_recommendation: string
          created_at?: string
          id?: never
          original_recommendation: string
          policy_version: string
          reason: string
          request_id?: string | null
          reviewer: string
          revision: number
        }
        Update: {
          case_id?: string
          corrected_recommendation?: string
          created_at?: string
          id?: never
          original_recommendation?: string
          policy_version?: string
          reason?: string
          request_id?: string | null
          reviewer?: string
          revision?: number
        }
        Relationships: [
          {
            foreignKeyName: "overrides_case_id_policy_version_fkey"
            columns: ["case_id", "policy_version"]
            isOneToOne: false
            referencedRelation: "decisions"
            referencedColumns: ["case_id", "policy_version"]
          },
        ]
      }
      policies: {
        Row: {
          content: string
          created_at: string
          file_name: string | null
          id: string
          name: string
          version: string
        }
        Insert: {
          content?: string
          created_at?: string
          file_name?: string | null
          id?: string
          name: string
          version: string
        }
        Update: {
          content?: string
          created_at?: string
          file_name?: string | null
          id?: string
          name?: string
          version?: string
        }
        Relationships: []
      }
      validation_results: {
        Row: {
          case_id: string
          expected: string
          expected_change: boolean | null
          policy_version: string
          source: string
        }
        Insert: {
          case_id: string
          expected: string
          expected_change?: boolean | null
          policy_version: string
          source: string
        }
        Update: {
          case_id?: string
          expected?: string
          expected_change?: boolean | null
          policy_version?: string
          source?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_change_check: {
        Row: {
          actual_change: boolean | null
          case_id: string | null
          case_status: string | null
          expected_change: boolean | null
          quadrant: string | null
          source: string | null
        }
        Relationships: []
      }
      v_compare: {
        Row: {
          case_id: string | null
          case_status: string | null
          changed: boolean | null
          explanation_v1: string | null
          explanation_v2: string | null
          latest_correction: string | null
          latest_correction_version: string | null
          needs_recheck: boolean | null
          override_count: number | null
          recommendation_v1: string | null
          recommendation_v2: string | null
          rule_v1: string | null
          rule_v2: string | null
        }
        Relationships: []
      }
      v_error_rate: {
        Row: {
          cases: number | null
          correct: number | null
          decided: number | null
          error_rate: number | null
          errors: number | null
          incorrect_routine: number | null
          policy_version: string | null
          source: string | null
          unnecessary_review: number | null
        }
        Relationships: []
      }
      v_kpis: {
        Row: {
          key: string | null
          label: string | null
          target: number | null
          unit: string | null
          value: number | null
        }
        Relationships: []
      }
      v_rule_impact: {
        Row: {
          cases: number | null
          changed_cases: number | null
          matched_rule: string | null
          needs_recheck_cases: number | null
          open_cases: number | null
          policy_version: string | null
        }
        Relationships: []
      }
      v_transition: {
        Row: {
          case_status: string | null
          cases: number | null
          recommendation_v1: string | null
          recommendation_v2: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      claim_evidence_io: {
        Args: {
          p_action: string
          p_data: Json
          p_service: string
          p_token: string
        }
        Returns: Json
      }
      claim_intake_link: {
        Args: { p_action: string; p_data: Json; p_token: string }
        Returns: Json
      }
      claim_staff_correct: {
        Args: { p_data: Json; p_reference: string; p_service: string }
        Returns: Json
      }
      claim_staff_read: {
        Args: { p_action: string; p_data: Json; p_service: string }
        Returns: Json
      }
      reviewer_save_correction: {
        Args: {
          p_case_id: string
          p_expected_revision: number
          p_policy_version: string
          p_reason: string
          p_recommendation: string
          p_request_id: string
          p_reviewer: string
        }
        Returns: string
      }
      submit_claim_intake: { Args: { p_payload: Json }; Returns: Json }
      update_claim_fields: {
        Args: { p_case_id: string; p_editor: string; p_fields: Json }
        Returns: number
      }
    }
    Enums: {
      [_ in never]: never
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
