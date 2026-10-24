import type { Product } from './models'

export type CatalogFilters = {
  category: string
  area: string
  storeId: string
  query: string
}

export function filterCatalog(products: Product[], filters: CatalogFilters): Product[] {
  const query = filters.query.trim().toLocaleLowerCase('ar')
  return products.filter((product) => {
    const matchesCategory = filters.category === 'الكل' || product.category === filters.category
    const matchesArea = filters.area === 'كل المناطق' || product.area === filters.area
    const matchesStore = !filters.storeId || product.storeId === filters.storeId
    const text = `${product.name} ${product.store} ${product.category}`.toLocaleLowerCase('ar')
    return matchesCategory && matchesArea && matchesStore && (!query || text.includes(query))
  })
}

export function summarizeCart(products: Product[]): { itemCount: number; subtotal: number } {
  return products.reduce((summary, product) => ({
    itemCount: summary.itemCount + 1,
    subtotal: summary.subtotal + product.price,
  }), { itemCount: 0, subtotal: 0 })
}

export function filterFavorites(products: Product[], favoriteIds: string[]): Product[] {
  const saved = new Set(favoriteIds)
  return products.filter((product) => saved.has(product.id))
}

export type DeliveryZoneFee = { store_id: string; fee_syp: number }

export function summarizeDelivery(storeIds: string[], zones: DeliveryZoneFee[]): { supported: boolean; fee: number } {
  const feesByStore = new Map(zones.map((zone) => [zone.store_id, Number(zone.fee_syp)]))
  const uniqueStoreIds = [...new Set(storeIds)]
  if (uniqueStoreIds.some((storeId) => !feesByStore.has(storeId))) return { supported: false, fee: 0 }
  return {
    supported: true,
    fee: uniqueStoreIds.reduce((total, storeId) => total + (feesByStore.get(storeId) ?? 0), 0),
  }
}
