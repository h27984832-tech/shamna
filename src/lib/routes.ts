export type MarketplaceRoute =
  | { type: 'home' }
  | { type: 'account' }
  | { type: 'product'; id: string }
  | { type: 'store'; id: string }

export function parseMarketplaceHash(hash: string): MarketplaceRoute {
  if (/^#\/?account\/?$/.test(hash)) return { type: 'account' }
  const match = hash.match(/^#\/?(product|store)\/([^/?#]+)\/?$/)
  if (!match) return { type: 'home' }

  let id: string
  try {
    id = decodeURIComponent(match[2] ?? '')
  } catch {
    return { type: 'home' }
  }
  if (!id.trim()) return { type: 'home' }
  return match[1] === 'product' ? { type: 'product', id } : { type: 'store', id }
}

export function productHash(id: string): string {
  return `#product/${encodeURIComponent(id)}`
}

export function storeHash(id: string): string {
  return `#store/${encodeURIComponent(id)}`
}

export function accountHash(): string {
  return '#account'
}
