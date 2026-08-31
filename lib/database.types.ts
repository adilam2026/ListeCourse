// Types écrits à la main, en miroir de supabase/migrations/*.sql.
// Si le schéma évolue, pensez à les mettre à jour (ou générez-les avec
// `supabase gen types typescript` une fois le projet provisionné).

export type ListStatus = 'brouillon' | 'a_acheter' | 'traitee';
export type HouseholdRole = 'admin' | 'responsable' | 'personnel';

export interface Profile {
  id: string;
  name: string;
  password_set: boolean;
  created_at: string;
  updated_at: string;
}

export interface Household {
  id: string;
  name: string;
  timezone: string;
  code: string;
  created_by: string | null;
  created_at: string;
}

export interface HouseholdMember {
  id: string;
  household_id: string;
  profile_id: string;
  username: string | null;
  role: HouseholdRole;
  active: boolean;
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
      profiles: { Row: Profile; Insert: Partial<Profile>; Update: Partial<Profile> };
      households: { Row: Household; Insert: Partial<Household>; Update: Partial<Household> };
      household_members: { Row: HouseholdMember; Insert: Partial<HouseholdMember>; Update: Partial<HouseholdMember> };
      categories: { Row: Category; Insert: Partial<Category>; Update: Partial<Category> };
      products: { Row: Product; Insert: Partial<Product>; Update: Partial<Product> };
      shopping_lists: { Row: ShoppingList; Insert: Partial<ShoppingList>; Update: Partial<ShoppingList> };
      list_items: { Row: ListItem; Insert: Partial<ListItem>; Update: Partial<ListItem> };
    };
    Functions: {
      get_or_create_today_list: { Args: { p_household_id: string }; Returns: ShoppingList };
      create_household: {
        Args: { p_name: string };
        Returns: { household_id: string; household_code: string }[];
      };
      resolve_login_email: {
        Args: { p_invite_code: string; p_username: string };
        Returns: string | null;
      };
      seed_default_catalog: { Args: { p_household_id: string }; Returns: void };
    };
  };
}
