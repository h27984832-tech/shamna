import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'

const migrationUrl = new URL('../supabase/migrations/202610220001_initial_marketplace.sql', import.meta.url)
const migration = readFileSync(migrationUrl, 'utf8')
const triggerHardeningUrl = new URL('../supabase/migrations/20261023175445_revoke_trigger_function_client_grants.sql', import.meta.url)
const triggerHardening = readFileSync(triggerHardeningUrl, 'utf8')
const createdTables = [...migration.matchAll(/^create table public\.([a-z_]+)\s*\(/gim)]
  .map((match) => match[1])
  .sort()
const rlsTables = [...migration.matchAll(/^alter table public\.([a-z_]+) enable row level security/gim)]
  .map((match) => match[1])
  .sort()
const policyTables = new Set([...migration.matchAll(/^create policy [^\n]+ on public\.([a-z_]+)/gim)]
  .map((match) => match[1]))

assert.ok(createdTables.length > 0, 'The migration should create public tables.')
assert.deepEqual(rlsTables, createdTables, 'Every created public table must have RLS enabled.')
assert.deepEqual(
  createdTables.filter((table) => !policyTables.has(table)),
  [],
  'Every created public table must have an explicit policy.',
)

const anonymousGrants = migration
  .split('\n')
  .filter((line) => /^grant\b/i.test(line) && /\bto anon\b/i.test(line))
  .join('\n')
assert.doesNotMatch(
  anonymousGrants,
  /public\.(addresses|orders|store_orders|order_items|order_status_history|admin_audit_log)\b/i,
  'Anonymous users must not receive grants on private customer and order tables.',
)

const policy = (name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = migration.match(new RegExp(`create policy "${escapedName}"[\\s\\S]*?;`, 'i'))
  assert.ok(match, `Expected the ${name} RLS policy to exist.`)
  return match[0]
}

assert.match(
  policy('profiles update own'),
  /using\s*\(\s*id\s*=\s*\(select auth\.uid\(\)\)\s*\)[\s\S]*with check\s*\(\s*id\s*=\s*\(select auth\.uid\(\)\)\s*\)/i,
  'Profile updates must be limited to the signed-in user both before and after the update.',
)
assert.match(
  policy('customers manage own addresses'),
  /using\s*\(\s*user_id\s*=\s*\(select auth\.uid\(\)\)\s*\)[\s\S]*with check\s*\(\s*user_id\s*=\s*\(select auth\.uid\(\)\)\s*\)/i,
  'Address reads and writes must remain scoped to the signed-in user.',
)
assert.match(
  policy('seller updates own products'),
  /has_role\('seller'\)[\s\S]*owner_id\s*=\s*\(select auth\.uid\(\)\)[\s\S]*with check[\s\S]*owner_id\s*=\s*\(select auth\.uid\(\)\)/i,
  'Seller product updates must check store ownership both before and after the update.',
)
assert.match(
  policy('authorized users read order items'),
  /o\.customer_id\s*=\s*\(select auth\.uid\(\)\)\s+or\s+s\.owner_id\s*=\s*\(select auth\.uid\(\)\)/i,
  'Order items must only be visible to the buyer, the owning seller, or an admin.',
)

assert.doesNotMatch(
  migration,
  /grant\s+(?:insert|update|delete|all(?:\s+privileges)?)\s+on\s+(?:table\s+)?public\.user_roles\b/i,
  'Application users must not receive direct role assignment privileges.',
)

const functionBody = (name) => {
  const escapedName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  const match = migration.match(new RegExp(`create or replace function public\\.${escapedName}\\([\\s\\S]*?\\$\\$;`, 'i'))
  assert.ok(match, `Expected the ${name} database function to exist.`)
  return match[0]
}

for (const name of ['has_role', 'owns_store_order', 'place_order', 'update_store_order_status', 'approve_store']) {
  const body = functionBody(name)
  assert.match(body, /security definer/i, `${name} is expected to execute with its guarded definer privileges.`)
  assert.match(body, /set search_path\s*=\s*''/i, `${name} must pin an empty search_path.`)
}
assert.match(functionBody('approve_store'), /has_role\('admin'\)/i, 'Only an admin may approve a store.')
assert.match(functionBody('place_order'), /v_user_id\s+uuid\s*:=\s*auth\.uid\(\)/i, 'Order creation must bind to the authenticated customer.')
assert.match(functionBody('update_store_order_status'), /has_role\('seller'\)[\s\S]*owner_id\s*=\s*v_user_id/i, 'Sellers may update only orders for their own active store.')

assert.match(triggerHardening, /revoke all on function public\.handle_new_auth_user\(\) from public, anon, authenticated/i)
assert.match(triggerHardening, /revoke all on function public\.record_store_order_status\(\) from public, anon, authenticated/i)

