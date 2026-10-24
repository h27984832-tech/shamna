-- Add covering indexes for foreign-key columns flagged by Supabase advisors.
-- These support joins and cascades; no rows are changed.

create index if not exists addresses_city_id_idx
  on public.addresses (city_id);
create index if not exists admin_audit_log_admin_id_idx
  on public.admin_audit_log (admin_id);
create index if not exists categories_parent_id_idx
  on public.categories (parent_id);
create index if not exists order_items_product_id_idx
  on public.order_items (product_id);
create index if not exists order_status_history_changed_by_idx
  on public.order_status_history (changed_by);
create index if not exists product_images_product_id_idx
  on public.product_images (product_id);
create index if not exists store_delivery_zones_city_id_idx
  on public.store_delivery_zones (city_id);
