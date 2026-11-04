/**
 * Columns that define a published listing's public identity. For approved
 * listings, owner edits to these are stored in `pending_changes` and applied
 * after admin review (also enforced by the businesses_guard_update trigger).
 */
export const REVIEWED_COLUMNS = [
  "name",
  "category_id",
  "subcategory_id",
  "short_description",
  "description",
  "owner_display_name",
  "address_line",
  "postal_code",
  "city",
  "bundesland",
  "logo_path",
  "cover_image_path",
] as const;

export type ReviewedColumn = (typeof REVIEWED_COLUMNS)[number];

export function isReviewedColumn(key: string): key is ReviewedColumn {
  return (REVIEWED_COLUMNS as readonly string[]).includes(key);
}
