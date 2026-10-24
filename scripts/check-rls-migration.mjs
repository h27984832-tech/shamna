import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { URL } from 'node:url'

const migrationUrl = new URL('../supabase/migrations/202610220001_initial_marketplace.sql', import.meta.url)
const migration = readFileSync(migrationUrl, 'utf8')
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

