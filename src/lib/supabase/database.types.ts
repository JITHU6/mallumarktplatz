/**
 * Database types for the Supabase schema in supabase/migrations.
 *
 * Hand-maintained in the shape produced by `supabase gen types typescript`.
 * When you have the Supabase CLI + Docker available you can regenerate with:
 *   npm run db:types
 * and keep the convenience aliases at the bottom of this file.
 */

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

type Rel<FK extends string, Col extends string, Ref extends string, OneToOne extends boolean = false> = {
  foreignKeyName: FK;
  columns: [Col];
  isOneToOne: OneToOne;
  referencedRelation: Ref;
  referencedColumns: ["id"];
};

/** Builds Row/Insert/Update for a table. `Opt` are columns with DB defaults or nullable. */
type Table<R extends Record<string, unknown>, Opt extends keyof R, Rels extends unknown[] = []> = {
  Row: R;
  Insert: Omit<R, Opt> & Partial<Pick<R, Opt>>;
  Update: Partial<R>;
  Relationships: Rels;
};

export type UserRole = "user" | "business_owner" | "admin";
export type BusinessStatus = "pending" | "approved" | "rejected" | "suspended";
export type SocialPlatform = "instagram" | "facebook" | "linkedin" | "youtube" | "tiktok" | "x";
export type ReportReason =
  | "incorrect_information"
  | "closed_permanently"
  | "not_malayali_owned"
  | "inappropriate_content"
  | "spam"
  | "privacy"
  | "removal_request"
  | "other";
export type ReportStatus = "open" | "resolved" | "dismissed";
export type VerificationStatus = "pending" | "approved" | "rejected";
export type ReviewStatus = "pending" | "approved" | "rejected";

type ProfileRow = {
  id: string;
  email: string | null;
  full_name: string | null;
  role: UserRole;
  preferred_locale: string;
  created_at: string;
  updated_at: string;
};

type CategoryRow = {
  id: string;
  parent_id: string | null;
  slug: string;
  name: string;
  name_translations: Json;
  description: string | null;
  icon: string;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type CityRow = {
  id: string;
  slug: string;
  name: string;
  name_translations: Json;
  aliases: string[];
  state: string | null;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
  is_featured: boolean;
  sort_order: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
};

type BusinessRow = {
  id: string;
  owner_id: string | null;
  slug: string;
  status: BusinessStatus;
  rejection_reason: string | null;
  name: string;
  category_id: string;
  subcategory_id: string | null;
  short_description: string;
  description: string | null;
  services: string[];
  owner_display_name: string | null;
  email: string | null;
  phone: string | null;
  whatsapp: string | null;
  website: string | null;
  address_line: string | null;
  hide_street_address: boolean;
  postal_code: string;
  city: string;
  city_slug: string;
  bundesland: string | null;
  country_code: string;
  latitude: number | null;
  longitude: number | null;
  logo_path: string | null;
  cover_image_path: string | null;
  is_featured: boolean;
  is_verified: boolean;
  verified_at: string | null;
  is_demo: boolean;
  pending_changes: Json | null;
  pending_changes_submitted_at: string | null;
  publish_consent_at: string;
  approved_at: string | null;
  search_text: string;
  created_at: string;
  updated_at: string;
};

type BusinessManagerRow = { business_id: string; user_id: string; created_at: string };

type OwnerDetailsRow = {
  business_id: string;
  owner_name: string;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
  updated_at: string;
};

type BusinessImageRow = {
  id: string;
  business_id: string;
  storage_path: string;
  alt_text: string | null;
  sort_order: number;
  created_at: string;
};

type OpeningHoursRow = {
  id: string;
  business_id: string;
  day_of_week: number;
  opens_at: string | null;
  closes_at: string | null;
  is_closed: boolean;
};

type SocialLinkRow = { id: string; business_id: string; platform: SocialPlatform; url: string };

type FavouriteRow = { user_id: string; business_id: string; created_at: string };

type ReviewRow = {
  id: string;
  business_id: string;
  user_id: string;
  rating: number;
  comment: string | null;
  status: ReviewStatus;
  created_at: string;
  updated_at: string;
};

type ReportRow = {
  id: string;
  business_id: string;
  reporter_id: string | null;
  reporter_email: string | null;
  reason: ReportReason;
  details: string | null;
  status: ReportStatus;
  admin_notes: string | null;
  resolved_at: string | null;
  created_at: string;
};

type VerificationRequestRow = {
  id: string;
  business_id: string;
  requested_by: string | null;
  message: string | null;
  status: VerificationStatus;
  admin_notes: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
};

type DailyViewsRow = { business_id: string; day: string; views: number };

type BusinessFk<Name extends string> = Rel<Name, "business_id", "businesses">;

export type Database = {
  __InternalSupabase: { PostgrestVersion: "12" };
  public: {
    Tables: {
      profiles: Table<ProfileRow, "email" | "full_name" | "role" | "preferred_locale" | "created_at" | "updated_at">;
      business_categories: Table<
        CategoryRow,
        | "id"
        | "parent_id"
        | "name_translations"
        | "description"
        | "icon"
        | "sort_order"
        | "is_active"
        | "created_at"
        | "updated_at",
        [Rel<"business_categories_parent_id_fkey", "parent_id", "business_categories">]
      >;
      cities: Table<
        CityRow,
        | "id"
        | "name_translations"
        | "aliases"
        | "state"
        | "country_code"
        | "latitude"
        | "longitude"
        | "is_featured"
        | "sort_order"
        | "is_active"
        | "created_at"
        | "updated_at"
      >;
      businesses: Table<
        BusinessRow,
        | "id"
        | "owner_id"
        | "slug"
        | "status"
        | "rejection_reason"
        | "subcategory_id"
        | "description"
        | "services"
        | "owner_display_name"
        | "email"
        | "phone"
        | "whatsapp"
        | "website"
        | "address_line"
        | "hide_street_address"
        | "city_slug"
        | "bundesland"
        | "country_code"
        | "latitude"
        | "longitude"
        | "logo_path"
        | "cover_image_path"
        | "is_featured"
        | "is_verified"
        | "verified_at"
        | "is_demo"
        | "pending_changes"
        | "pending_changes_submitted_at"
        | "publish_consent_at"
        | "approved_at"
        | "search_text"
        | "created_at"
        | "updated_at",
        [
          Rel<"businesses_owner_id_fkey", "owner_id", "profiles">,
          Rel<"businesses_category_id_fkey", "category_id", "business_categories">,
          Rel<"businesses_subcategory_id_fkey", "subcategory_id", "business_categories">,
        ]
      >;
      business_managers: Table<
        BusinessManagerRow,
        "created_at",
        [BusinessFk<"business_managers_business_id_fkey">, Rel<"business_managers_user_id_fkey", "user_id", "profiles">]
      >;
      business_owner_details: Table<
        OwnerDetailsRow,
        "contact_email" | "contact_phone" | "created_at" | "updated_at",
        [Rel<"business_owner_details_business_id_fkey", "business_id", "businesses", true>]
      >;
      business_images: Table<
        BusinessImageRow,
        "id" | "alt_text" | "sort_order" | "created_at",
        [BusinessFk<"business_images_business_id_fkey">]
      >;
      business_opening_hours: Table<
        OpeningHoursRow,
        "id" | "opens_at" | "closes_at" | "is_closed",
        [BusinessFk<"business_opening_hours_business_id_fkey">]
      >;
      business_social_links: Table<SocialLinkRow, "id", [BusinessFk<"business_social_links_business_id_fkey">]>;
      favourites: Table<
        FavouriteRow,
        "created_at",
        [BusinessFk<"favourites_business_id_fkey">, Rel<"favourites_user_id_fkey", "user_id", "profiles">]
      >;
      business_reviews: Table<
        ReviewRow,
        "id" | "comment" | "status" | "created_at" | "updated_at",
        [BusinessFk<"business_reviews_business_id_fkey">, Rel<"business_reviews_user_id_fkey", "user_id", "profiles">]
      >;
      business_reports: Table<
        ReportRow,
        "id" | "reporter_id" | "reporter_email" | "details" | "status" | "admin_notes" | "resolved_at" | "created_at",
        [BusinessFk<"business_reports_business_id_fkey">, Rel<"business_reports_reporter_id_fkey", "reporter_id", "profiles">]
      >;
      business_verification_requests: Table<
        VerificationRequestRow,
        "id" | "requested_by" | "message" | "status" | "admin_notes" | "reviewed_by" | "reviewed_at" | "created_at",
        [
          BusinessFk<"business_verification_requests_business_id_fkey">,
          Rel<"business_verification_requests_requested_by_fkey", "requested_by", "profiles">,
          Rel<"business_verification_requests_reviewed_by_fkey", "reviewed_by", "profiles">,
        ]
      >;
      business_daily_views: Table<DailyViewsRow, "day" | "views", [BusinessFk<"business_daily_views_business_id_fkey">]>;
    };
    Views: { [_ in never]: never };
    Functions: {
      record_business_view: { Args: { p_business_id: string }; Returns: undefined };
      city_business_counts: {
        Args: Record<PropertyKey, never>;
        Returns: { city_slug: string; city: string; business_count: number }[];
      };
      category_business_counts: {
        Args: Record<PropertyKey, never>;
        Returns: { category_id: string; business_count: number }[];
      };
      is_admin: { Args: Record<PropertyKey, never>; Returns: boolean };
      can_manage_business: { Args: { p_business_id: string }; Returns: boolean };
      slugify: { Args: { value: string }; Returns: string };
    };
    Enums: {
      user_role: UserRole;
      business_status: BusinessStatus;
      social_platform: SocialPlatform;
      report_reason: ReportReason;
      report_status: ReportStatus;
      verification_status: VerificationStatus;
      review_status: ReviewStatus;
    };
    CompositeTypes: { [_ in never]: never };
  };
};

type PublicTables = Database["public"]["Tables"];
export type Tables<T extends keyof PublicTables> = PublicTables[T]["Row"];
export type TablesInsert<T extends keyof PublicTables> = PublicTables[T]["Insert"];
export type TablesUpdate<T extends keyof PublicTables> = PublicTables[T]["Update"];

export type Profile = Tables<"profiles">;
export type Category = Tables<"business_categories">;
export type City = Tables<"cities">;
export type Business = Tables<"businesses">;
export type BusinessImage = Tables<"business_images">;
export type OpeningHours = Tables<"business_opening_hours">;
export type SocialLink = Tables<"business_social_links">;
export type BusinessReport = Tables<"business_reports">;
export type VerificationRequest = Tables<"business_verification_requests">;
