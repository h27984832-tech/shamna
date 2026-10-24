-- Harden trigger-only SECURITY DEFINER functions against direct API execution.
-- PostgreSQL triggers continue to invoke these functions; application roles do not need RPC access.

revoke all on function public.handle_new_auth_user() from public, anon, authenticated;
revoke all on function public.record_store_order_status() from public, anon, authenticated;
