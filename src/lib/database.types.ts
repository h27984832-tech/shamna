type Table<Row> = {
  Row: Row
  Insert: Partial<Row>
  Update: Partial<Row>
  Relationships: []
}

export type Database = {
  public: {
    Tables: {
      cities: Table<{ id: string; name: string; slug: string; is_active: boolean; created_at: string }>
      categories: Table<{ id: string; name: string; slug: string; is_active: boolean; created_at: string }>
      profiles: Table<{ id: string; display_name: string | null; created_at: string; updated_at: string }>
      user_roles: Table<{ id: string; user_id: string; role: 'customer' | 'seller' | 'admin'; created_at: string }>
      stores: Table<{ id: string; owner_id: string; city_id: string; name: string; description: string; status: 'pending' | 'approved' | 'suspended'; created_at: string; updated_at: string }>
      products: Table<{ id: string; store_id: string; category_id: string; name: string; description: string; price_syp: number; stock_quantity: number; is_active: boolean; created_at: string; updated_at: string }>
    }
    Views: Record<string, never>
    Functions: { has_role: { Args: { requested_role: string }; Returns: boolean } }
    Enums: Record<string, never>
    CompositeTypes: Record<string, never>
  }
}
