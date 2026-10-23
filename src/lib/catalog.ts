import type { Product, StorePreview } from '../types'
import { supabase } from './supabase'

export type CatalogData = {
  products: Product[]
  categories: string[]
  areas: string[]
  stores: StorePreview[]
}

export async function loadCatalog(): Promise<CatalogData> {
  if (!supabase) throw new Error('Supabase is not configured')

  const [productResult, categoryResult, cityResult, storeResult] = await Promise.all([
    supabase.from('products').select('id, name, description, price_syp, stock_quantity, category_id, store_id').eq('is_active', true).gt('stock_quantity', 0).order('created_at', { ascending: false }),
    supabase.from('categories').select('id, name').eq('is_active', true).order('name'),
    supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
    supabase.from('stores').select('id, name, description, city_id').eq('status', 'approved').order('name'),
  ])

  const error = productResult.error ?? categoryResult.error ?? cityResult.error ?? storeResult.error
  if (error) throw error

  const categories = categoryResult.data ?? []
  const cities = cityResult.data ?? []
  const stores = storeResult.data ?? []
  const categoryNames = new Map(categories.map((item) => [item.id, item.name]))
  const cityNames = new Map(cities.map((item) => [item.id, item.name]))
  const storeNames = new Map(stores.map((item) => [item.id, item.name]))
  const storeById = new Map(stores.map((item) => [item.id, item]))

  return {
    categories: categories.map((item) => item.name),
    areas: cities.map((item) => item.name),
    stores: stores.map((item) => ({
      id: item.id,
      name: item.name,
      area: cityNames.get(item.city_id) ?? 'منطقة غير محددة',
      description: item.description,
    })),
    products: (productResult.data ?? []).map((item) => ({
      id: item.id,
      storeId: item.store_id,
      name: item.name,
      category: categoryNames.get(item.category_id) ?? 'غير مصنف',
      priceSyp: Number(item.price_syp),
      area: cityNames.get(storeById.get(item.store_id)?.city_id ?? '') ?? 'منطقة غير محددة',
      storeName: storeNames.get(item.store_id) ?? 'متجر محلي',
      emoji: '🛍️',
      tone: 'sage' as const,
      description: item.description,
      stockQuantity: item.stock_quantity,
    })),
  }
}
