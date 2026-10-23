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
      addresses: {
        Row: {
          address_line: string
          city_id: string
          created_at: string
          delivery_notes: string
          id: string
          phone: string
          recipient_name: string
          updated_at: string
          user_id: string
        }
        Insert: {
          address_line: string
          city_id: string
          created_at?: string
          delivery_notes?: string
          id?: string
          phone: string
          recipient_name: string
          updated_at?: string
          user_id: string
        }
        Update: {
          address_line?: string
          city_id?: string
          created_at?: string
          delivery_notes?: string
          id?: string
          phone?: string
          recipient_name?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "addresses_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "addresses_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      admin_audit_log: {
        Row: {
          action: string
          admin_id: string | null
          created_at: string
          entity_id: string | null
          entity_table: string
          id: string
          new_values: Json | null
          old_values: Json | null
        }
        Insert: {
          action: string
          admin_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Update: {
          action?: string
          admin_id?: string | null
          created_at?: string
          entity_id?: string | null
          entity_table?: string
          id?: string
          new_values?: Json | null
          old_values?: Json | null
        }
        Relationships: []
      }
      categories: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          parent_id: string | null
          slug: string
          sort_order: number
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          parent_id?: string | null
          slug: string
          sort_order?: number
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          parent_id?: string | null
          slug?: string
          sort_order?: number
        }
        Relationships: [
          {
            foreignKeyName: "categories_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      cities: {
        Row: {
          created_at: string
          id: string
          is_active: boolean
          name: string
          region_name: string
          slug: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_active?: boolean
          name: string
          region_name?: string
          slug: string
        }
        Update: {
          created_at?: string
          id?: string
          is_active?: boolean
          name?: string
          region_name?: string
          slug?: string
        }
        Relationships: []
      }
      order_items: {
        Row: {
          created_at: string
          id: string
          line_total_syp: number
          product_id: string | null
          product_name_snapshot: string
          quantity: number
          store_order_id: string
          unit_price_syp: number
        }
        Insert: {
          created_at?: string
          id?: string
          line_total_syp: number
          product_id?: string | null
          product_name_snapshot: string
          quantity: number
          store_order_id: string
          unit_price_syp: number
        }
        Update: {
          created_at?: string
          id?: string
          line_total_syp?: number
          product_id?: string | null
          product_name_snapshot?: string
          quantity?: number
          store_order_id?: string
          unit_price_syp?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_store_order_id_fkey"
            columns: ["store_order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      order_status_history: {
        Row: {
          changed_by: string | null
          created_at: string
          id: string
          new_status: Database["public"]["Enums"]["order_status"]
          old_status: Database["public"]["Enums"]["order_status"] | null
          store_order_id: string
        }
        Insert: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status: Database["public"]["Enums"]["order_status"]
          old_status?: Database["public"]["Enums"]["order_status"] | null
          store_order_id: string
        }
        Update: {
          changed_by?: string | null
          created_at?: string
          id?: string
          new_status?: Database["public"]["Enums"]["order_status"]
          old_status?: Database["public"]["Enums"]["order_status"] | null
          store_order_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "order_status_history_store_order_id_fkey"
            columns: ["store_order_id"]
            isOneToOne: false
            referencedRelation: "store_orders"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          address_snapshot: Json
          created_at: string
          currency: string
          customer_id: string
          delivery_fee_syp: number
          id: string
          payment_method: string
          status: Database["public"]["Enums"]["order_status"]
          subtotal_syp: number
          total_syp: number
          updated_at: string
        }
        Insert: {
          address_snapshot: Json
          created_at?: string
          currency?: string
          customer_id: string
          delivery_fee_syp?: number
          id?: string
          payment_method?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_syp?: number
          total_syp?: number
          updated_at?: string
        }
        Update: {
          address_snapshot?: Json
          created_at?: string
          currency?: string
          customer_id?: string
          delivery_fee_syp?: number
          id?: string
          payment_method?: string
          status?: Database["public"]["Enums"]["order_status"]
          subtotal_syp?: number
          total_syp?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      product_images: {
        Row: {
          alt_text: string
          created_at: string
          id: string
          product_id: string
          sort_order: number
          storage_path: string
        }
        Insert: {
          alt_text?: string
          created_at?: string
          id?: string
          product_id: string
          sort_order?: number
          storage_path: string
        }
        Update: {
          alt_text?: string
          created_at?: string
          id?: string
          product_id?: string
          sort_order?: number
          storage_path?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_images_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          category_id: string | null
          created_at: string
          description: string
          id: string
          is_active: boolean
          name: string
          price_syp: number
          stock_count: number
          store_id: string
          updated_at: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name: string
          price_syp: number
          stock_count?: number
          store_id: string
          updated_at?: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          description?: string
          id?: string
          is_active?: boolean
          name?: string
          price_syp?: number
          stock_count?: number
          store_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          created_at: string
          display_name: string
          id: string
          phone: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          display_name?: string
          id: string
          phone?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          display_name?: string
          id?: string
          phone?: string | null
          updated_at?: string
        }
        Relationships: []
      }
      store_delivery_zones: {
        Row: {
          city_id: string
          fee_syp: number
          is_active: boolean
          store_id: string
        }
        Insert: {
          city_id: string
          fee_syp: number
          is_active?: boolean
          store_id: string
        }
        Update: {
          city_id?: string
          fee_syp?: number
          is_active?: boolean
          store_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_delivery_zones_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_delivery_zones_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      store_orders: {
        Row: {
          created_at: string
          delivery_fee_syp: number
          id: string
          order_id: string
          status: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal_syp: number
          total_syp: number
          updated_at: string
        }
        Insert: {
          created_at?: string
          delivery_fee_syp: number
          id?: string
          order_id: string
          status?: Database["public"]["Enums"]["order_status"]
          store_id: string
          subtotal_syp: number
          total_syp: number
          updated_at?: string
        }
        Update: {
          created_at?: string
          delivery_fee_syp?: number
          id?: string
          order_id?: string
          status?: Database["public"]["Enums"]["order_status"]
          store_id?: string
          subtotal_syp?: number
          total_syp?: number
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "store_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "store_orders_store_id_fkey"
            columns: ["store_id"]
            isOneToOne: false
            referencedRelation: "stores"
            referencedColumns: ["id"]
          },
        ]
      }
      stores: {
        Row: {
          city_id: string
          created_at: string
          description: string
          id: string
          name: string
          owner_id: string
          slug: string
          status: Database["public"]["Enums"]["store_status"]
          updated_at: string
        }
        Insert: {
          city_id: string
          created_at?: string
          description?: string
          id?: string
          name: string
          owner_id: string
          slug: string
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
        }
        Update: {
          city_id?: string
          created_at?: string
          description?: string
          id?: string
          name?: string
          owner_id?: string
          slug?: string
          status?: Database["public"]["Enums"]["store_status"]
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "stores_city_id_fkey"
            columns: ["city_id"]
            isOneToOne: false
            referencedRelation: "cities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "stores_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: true
            referencedRelation: "profiles"
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
      approve_store: { Args: { p_store_id: string }; Returns: undefined }
      has_role: {
        Args: { p_role: Database["public"]["Enums"]["app_role"] }
        Returns: boolean
      }
      owns_store_order: { Args: { p_order_id: string }; Returns: boolean }
      place_order: {
        Args: { p_address_id: string; p_items: Json }
        Returns: string
      }
      update_store_order_status: {
        Args: {
          p_new_status: Database["public"]["Enums"]["order_status"]
          p_store_order_id: string
        }
        Returns: undefined
      }
    }
    Enums: {
      app_role: "customer" | "seller" | "admin"
      order_status:
        | "new"
        | "confirmed"
        | "preparing"
        | "out_for_delivery"
        | "completed"
        | "cancelled"
      store_status: "pending" | "active" | "rejected" | "suspended"
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
    Enums: {
      app_role: ["customer", "seller", "admin"],
      order_status: [
        "new",
        "confirmed",
        "preparing",
        "out_for_delivery",
        "completed",
        "cancelled",
      ],
      store_status: ["pending", "active", "rejected", "suspended"],
    },
  },
} as const
