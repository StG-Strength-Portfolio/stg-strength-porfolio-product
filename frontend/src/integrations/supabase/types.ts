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
      sprint_players: {
        Row: {
          id: string
          is_completed: boolean
          joined_at: string
          sprint_id: string
          student_id: string
        }
        Insert: {
          id?: string
          is_completed?: boolean
          joined_at?: string
          sprint_id: string
          student_id: string
        }
        Update: {
          id?: string
          is_completed?: boolean
          joined_at?: string
          sprint_id?: string
          student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_players_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprint_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_players_student_id_fkey"
            columns: ["student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_sessions: {
        Row: {
          class_id: string
          created_at: string
          ended_at: string | null
          id: string
          join_code: string
          school_id: string | null
          started_at: string | null
          status: string
          teacher_id: string
        }
        Insert: {
          class_id: string
          created_at?: string
          ended_at?: string | null
          id?: string
          join_code: string
          school_id?: string | null
          started_at?: string | null
          status?: string
          teacher_id: string
        }
        Update: {
          class_id?: string
          created_at?: string
          ended_at?: string | null
          id?: string
          join_code?: string
          school_id?: string | null
          started_at?: string | null
          status?: string
          teacher_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_sessions_class_id_fkey"
            columns: ["class_id"]
            isOneToOne: false
            referencedRelation: "classes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_sessions_school_id_fkey"
            columns: ["school_id"]
            isOneToOne: false
            referencedRelation: "schools"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_sessions_teacher_id_fkey"
            columns: ["teacher_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      sprint_strengths: {
        Row: {
          created_at: string
          from_student_id: string
          id: string
          sprint_id: string
          strength_id: string
          to_student_id: string
        }
        Insert: {
          created_at?: string
          from_student_id: string
          id?: string
          sprint_id: string
          strength_id: string
          to_student_id: string
        }
        Update: {
          created_at?: string
          from_student_id?: string
          id?: string
          sprint_id?: string
          strength_id?: string
          to_student_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "sprint_strengths_from_student_id_fkey"
            columns: ["from_student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_strengths_sprint_id_fkey"
            columns: ["sprint_id"]
            isOneToOne: false
            referencedRelation: "sprint_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "sprint_strengths_to_student_id_fkey"
            columns: ["to_student_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teacher_assigned_strengths: {
        Row: {
          created_at: string
          from_role: string
          from_user_id: string | null
          id: string
          message: string | null
          strength_id: string
          student_id: string
          teacher_id: string
          to_role: string
          to_user_id: string | null
        }
        Insert: {
          created_at?: string
          from_role?: string
          from_user_id?: string | null
          id?: string
          message?: string | null
          strength_id: string
          student_id: string
          teacher_id: string
          to_role?: string
          to_user_id?: string | null
        }
        Update: {
          created_at?: string
          from_role?: string
          from_user_id?: string | null
          id?: string
          message?: string | null
          strength_id?: string
          student_id?: string
          teacher_id?: string
          to_role?: string
          to_user_id?: string | null
        }
        Relationships: []
      }
      teaching_articles: {
        Row: {
          category_id: string | null
          created_at: string
          created_by: string | null
          description_en: string | null
          description_fi: string | null
          description_sv: string | null
          google_slides_url_en: string | null
          google_slides_url_fi: string | null
          google_slides_url_sv: string | null
          id: string
          is_published: boolean
          slide_count: number
          sort_order: number
          subcategory_id: string | null
          thumbnail_url: string | null
          title_en: string
          title_fi: string
          title_sv: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_fi?: string | null
          description_sv?: string | null
          google_slides_url_en?: string | null
          google_slides_url_fi?: string | null
          google_slides_url_sv?: string | null
          id?: string
          is_published?: boolean
          slide_count?: number
          sort_order?: number
          subcategory_id?: string | null
          thumbnail_url?: string | null
          title_en: string
          title_fi: string
          title_sv: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_fi?: string | null
          description_sv?: string | null
          google_slides_url_en?: string | null
          google_slides_url_fi?: string | null
          google_slides_url_sv?: string | null
          id?: string
          is_published?: boolean
          slide_count?: number
          sort_order?: number
          subcategory_id?: string | null
          thumbnail_url?: string | null
          title_en?: string
          title_fi?: string
          title_sv?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_articles_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "teaching_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_articles_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "teaching_articles_subcategory_id_fkey"
            columns: ["subcategory_id"]
            isOneToOne: false
            referencedRelation: "teaching_subcategories"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_categories: {
        Row: {
          created_at: string
          id: string
          is_published: boolean
          sort_order: number
          strength_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          strength_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          is_published?: boolean
          sort_order?: number
          strength_id?: string
          updated_at?: string
        }
        Relationships: []
      }
      teaching_presentations: {
        Row: {
          canva_design_id: string
          canva_export_url: string | null
          created_at: string
          created_by: string | null
          description_en: string | null
          description_fi: string | null
          description_sv: string | null
          id: string
          is_published: boolean
          level_tag: string
          slide_count: number
          slide_urls: Json
          sort_order: number
          thumbnail_url: string | null
          title_en: string
          title_fi: string
          title_sv: string
          updated_at: string
        }
        Insert: {
          canva_design_id: string
          canva_export_url?: string | null
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_fi?: string | null
          description_sv?: string | null
          id?: string
          is_published?: boolean
          level_tag?: string
          slide_count?: number
          slide_urls?: Json
          sort_order?: number
          thumbnail_url?: string | null
          title_en: string
          title_fi: string
          title_sv: string
          updated_at?: string
        }
        Update: {
          canva_design_id?: string
          canva_export_url?: string | null
          created_at?: string
          created_by?: string | null
          description_en?: string | null
          description_fi?: string | null
          description_sv?: string | null
          id?: string
          is_published?: boolean
          level_tag?: string
          slide_count?: number
          slide_urls?: Json
          sort_order?: number
          thumbnail_url?: string | null
          title_en?: string
          title_fi?: string
          title_sv?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_presentations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      teaching_subcategories: {
        Row: {
          category_id: string
          created_at: string
          id: string
          is_published: boolean
          name_en: string
          name_fi: string
          name_sv: string
          sort_order: number
          updated_at: string
        }
        Insert: {
          category_id: string
          created_at?: string
          id?: string
          is_published?: boolean
          name_en: string
          name_fi: string
          name_sv: string
          sort_order?: number
          updated_at?: string
        }
        Update: {
          category_id?: string
          created_at?: string
          id?: string
          is_published?: boolean
          name_en?: string
          name_fi?: string
          name_sv?: string
          sort_order?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "teaching_subcategories_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "teaching_categories"
            referencedColumns: ["id"]
          },
        ]
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
      generate_sprint_code: { Args: never; Returns: string }
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
      is_sprint_host: { Args: { _sprint_id: string }; Returns: boolean }
      is_sprint_player: { Args: { _sprint_id: string }; Returns: boolean }
      is_teacher_of: { Args: { _student_id: string }; Returns: boolean }
      join_class: { Args: { p_join_code: string }; Returns: Json }
      join_sprint: { Args: { p_code: string }; Returns: Json }
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
