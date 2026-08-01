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
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      class_members: {
        Row: {
          class_id: string
          joined_at: string
          student_id: string
        }
        Insert: {
          class_id: string
          joined_at?: string
          student_id: string
        }
        Update: {
          class_id?: string
          joined_at?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "class_members_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
        ]
      }
      classes: {
        Row: {
          created_at: string
          deleted_at: string | null
          deleted_by: string | null
          id: string
          is_deleted: boolean
          join_code: string
          language: string
          name: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          join_code: string
          language?: string
          name: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          deleted_at?: string | null
          deleted_by?: string | null
          id?: string
          is_deleted?: boolean
          join_code?: string
          language?: string
          name?: string
          teacher_id?: string
        }
        Relationships: []
      }
      email_log: {
        Row: {
          bounced_at: string | null
          created_at: string
          error_message: string | null
          id: string
          language: string
          opened_at: string | null
          recipient_email: string
          recipient_id: string | null
          status: string
          subject: string | null
          template_key: string
        }
        Insert: {
          bounced_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          language?: string
          opened_at?: string | null
          recipient_email: string
          recipient_id?: string | null
          status?: string
          subject?: string | null
          template_key: string
        }
        Update: {
          bounced_at?: string | null
          created_at?: string
          error_message?: string | null
          id?: string
          language?: string
          opened_at?: string | null
          recipient_email?: string
          recipient_id?: string | null
          status?: string
          subject?: string | null
          template_key?: string
        }
        Relationships: []
      }
      email_templates: {
        Row: {
          body_en: string
          body_fi: string
          body_sv: string
          created_at: string
          description_en: string | null
          description_fi: string | null
          description_sv: string | null
          id: string
          name_en: string
          name_fi: string
          name_sv: string
          subject_en: string
          subject_fi: string
          subject_sv: string
          template_key: string
          updated_at: string
          updated_by: string | null
        }
        Insert: {
          body_en: string
          body_fi: string
          body_sv: string
          created_at?: string
          description_en?: string | null
          description_fi?: string | null
          description_sv?: string | null
          id?: string
          name_en: string
          name_fi: string
          name_sv: string
          subject_en: string
          subject_fi: string
          subject_sv: string
          template_key: string
          updated_at?: string
          updated_by?: string | null
        }
        Update: {
          body_en?: string
          body_fi?: string
          body_sv?: string
          created_at?: string
          description_en?: string | null
          description_fi?: string | null
          description_sv?: string | null
          id?: string
          name_en?: string
          name_fi?: string
          name_sv?: string
          subject_en?: string
          subject_fi?: string
          subject_sv?: string
          template_key?: string
          updated_at?: string
          updated_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "email_templates_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_responses: {
        Row: {
          field_key: string
          id: string
          student_id: string
          submitted_at: string
          token: string
          value: string | null
        }
        Insert: {
          field_key: string
          id?: string
          student_id: string
          submitted_at?: string
          token: string
          value?: string | null
        }
        Update: {
          field_key?: string
          id?: string
          student_id?: string
          submitted_at?: string
          token?: string
          value?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "external_responses_token_fkey"
            columns: ["token"]
            isOneToOne: false
            referencedRelation: "share_links"
            referencedColumns: ["token"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          current_screen: number
          display_name: string | null
          id: string
          language: string
          school_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          current_screen?: number
          display_name?: string | null
          id: string
          language?: string
          school_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          current_screen?: number
          display_name?: string | null
          id?: string
          language?: string
          school_id?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "profiles_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
        ]
      }
      responses: {
        Row: {
          field_key: string
          id: string
          updated_at: string
          user_id: string
          value: string | null
        }
        Insert: {
          field_key: string
          id?: string
          updated_at?: string
          user_id: string
          value?: string | null
        }
        Update: {
          field_key?: string
          id?: string
          updated_at?: string
          user_id?: string
          value?: string | null
        }
        Relationships: []
      }
      school_codes: {
        Row: {
          code: string
          code_type: string
          created_at: string
          created_by: string | null
          created_by_super_admin_id: string | null
          id: string
          is_revoked: boolean
          is_used: boolean
          school_id: string
          used_by_admin_id: string | null
        }
        Insert: {
          code: string
          code_type?: string
          created_at?: string
          created_by?: string | null
          created_by_super_admin_id?: string | null
          id?: string
          is_revoked?: boolean
          is_used?: boolean
          school_id: string
          used_by_admin_id?: string | null
        }
        Update: {
          code?: string
          code_type?: string
          created_at?: string
          created_by?: string | null
          created_by_super_admin_id?: string | null
          id?: string
          is_revoked?: boolean
          is_used?: boolean
          school_id?: string
          used_by_admin_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "school_codes_created_by_super_admin_id_fkey"
            columns: ["created_by_super_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_codes_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "school_codes_used_by_admin_id_fkey"
            columns: ["used_by_admin_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      schools: {
        Row: {
          billing_expiry_date: string | null
          billing_start_date: string
          code: string
          created_at: string
          id: string
          is_active: boolean
          language: string | null
          name: string
          school_logo_url: string | null
        }
        Insert: {
          billing_expiry_date?: string | null
          billing_start_date?: string
          code: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string | null
          name: string
          school_logo_url?: string | null
        }
        Update: {
          billing_expiry_date?: string | null
          billing_start_date?: string
          code?: string
          created_at?: string
          id?: string
          is_active?: boolean
          language?: string | null
          name?: string
          school_logo_url?: string | null
        }
        Relationships: []
      }
      share_links: {
        Row: {
          created_at: string
          expires_at: string
          student_id: string
          target: string
          token: string
          used: boolean
        }
        Insert: {
          created_at?: string
          expires_at?: string
          student_id: string
          target: string
          token: string
          used?: boolean
        }
        Update: {
          created_at?: string
          expires_at?: string
          student_id?: string
          target?: string
          token?: string
          used?: boolean
        }
        Relationships: []
      }
      teacher_assigned_strengths: {
        Row: {
          created_at: string
          id: string
          message: string | null
          strength_id: string
          student_id: string
          teacher_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          message?: string | null
          strength_id: string
          student_id: string
          teacher_id: string
        }
        Update: {
          created_at?: string
          id?: string
          message?: string | null
          strength_id?: string
          student_id?: string
          teacher_id?: string
        }
        Relationships: []
      }
      user_roles: {
        Row: {
          created_at: string
          role: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Insert: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id: string
        }
        Update: {
          created_at?: string
          role?: Database["public"]["Enums"]["app_role"]
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      check_school_expiry: { Args: never; Returns: undefined }
      claim_teacher_role: { Args: { p_code: string }; Returns: boolean }
      cleanup_deleted_classes: { Args: never; Returns: undefined }
      get_my_class_language: { Args: never; Returns: string }
      get_my_received_strengths: {
        Args: never
        Returns: {
          created_at: string
          id: string
          message: string
          strength_id: string
          teacher_name: string
        }[]
      }
      get_share_link_info: { Args: { p_token: string }; Returns: Json }
      has_role: {
        Args: {
          _role: Database["public"]["Enums"]["app_role"]
          _user_id: string
        }
        Returns: boolean
      }
      is_class_member: { Args: { _class_id: string }; Returns: boolean }
      is_class_teacher: { Args: { _class_id: string }; Returns: boolean }
      is_teacher_of: { Args: { _student_id: string }; Returns: boolean }
      join_class: { Args: { p_join_code: string }; Returns: Json }
      my_classes_deleted: { Args: never; Returns: boolean }
      my_school_id: { Args: never; Returns: string }
      register_teacher_with_any_code: {
        Args: { p_code: string }
        Returns: Json
      }
      register_teacher_with_school: { Args: { p_code: string }; Returns: Json }
      submit_external_response: {
        Args: { p_payload: Json; p_token: string }
        Returns: Json
      }
      validate_school_code: {
        Args: { input_code: string }
        Returns: {
          school_id: string
          school_language: string
          school_name: string
        }[]
      }
    }
    Enums: {
      app_role: "student" | "teacher" | "admin" | "super_admin" | "school_admin"
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
      app_role: ["student", "teacher", "admin", "super_admin", "school_admin"],
    },
  },
} as const
