// Types écrits à la main, en miroir de supabase/migrations/*.sql.
// Si le schéma évolue, pensez à les mettre à jour (ou générez-les avec
// `supabase gen types typescript` une fois le projet provisionné).

export type ListStatus = 'brouillon' | 'a_acheter' | 'traitee';

export interface Household {
  id: string;
  name: string;
  timezone: string;
  invite_code: string;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  user_id: string;
  display_name: string;
  can_prepare: boolean;
  is_admin: boolean;
  created_at: string;
}

export interface Category {
  id: string;
  household_id: string;
  name: string;
  icon: string;
  sort_order: number;
  active: boolean;
  created_at: string;
}

export interface Product {
  id: string;
  household_id: string;
  category_id: string | null;
  name: string;
  photo_url: string | null;
  sort_order: number;
  active: boolean;
  priority: boolean;
  created_at: string;
}

export interface ShoppingList {
  id: string;
  household_id: string;
  list_date: string;
  status: ListStatus;
  created_at: string;
  updated_at: string;
  first_saved_at: string | null;
  closed_at: string | null;
}

export interface ListItem {
  id: string;
  list_id: string;
  product_id: string | null;
  free_text_name: string | null;
  quantity: string | null;
  note: string | null;
  purchased: boolean;
  purchased_by: string | null;
  purchased_at: string | null;
  created_at: string;
}

export interface Database {
  public: {
    Tables: {
      households: { Row: Household; Insert: Partial<Household>; Update: Partial<Household> };
      household_members: { Row: HouseholdMember; Insert: Partial<HouseholdMember>; Update: Partial<HouseholdMember> };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> };
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> };
      shopping_lists: { Row: ShoppingList; Insert: Partial<ShoppingList>; Update: Partial<ShoppingList> };
      list_items: { Row: ListItem; Insert: Partial<ListItem>; Update: Partial<ListItem> };
    };
    Functions: {
      get_or_create_today_list: { Args: { p_household_id: string }; Returns: ShoppingList };
      create_household: { Args: { p_name: string; p_display_name: string }; Returns: Household };
      join_household: {
        Args: { p_invite_code: string; p_display_name: string; p_can_prepare: boolean };
        Returns: Household;
      };
      seed_default_catalog: { Args: { p_household_id: string }; Returns: void };
    };
  };
}
