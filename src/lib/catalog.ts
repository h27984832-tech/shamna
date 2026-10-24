import type { MarketplaceStore, Product } from './models'
import { supabase } from './supabase'

export const demoProducts: Product[] = [
  { id: 'demo-1', name: 'صابون غار طبيعي', category: 'عناية', price: 35000, stockCount: 5, area: 'جرمانا', store: 'بيت الصابون', storeId: 'demo-soap', emoji: '🧼', color: 'sage', note: 'صناعة محلية', isDemo: true },
  { id: 'demo-2', name: 'طقم فناجين قهوة', category: 'منزل', price: 85000, stockCount: 4, area: 'قطنا', store: 'دار الحرف', storeId: 'demo-crafts', emoji: '☕', color: 'clay', note: 'قطعة حرفية', isDemo: true },
  { id: 'demo-3', name: 'مربى المشمش البيتي', category: 'مونة', price: 42000, stockCount: 6, area: 'جرمانا', store: 'مونة ستّي', storeId: 'demo-pantry', emoji: '🍑', color: 'peach', note: 'دفعة صغيرة', isDemo: true },
  { id: 'demo-4', name: 'وشاح قطني مطرّز', category: 'أزياء', price: 120000, stockCount: 3, area: 'قطنا', store: 'خيط وحكاية', storeId: 'demo-thread', emoji: '🧣', color: 'rose', note: 'تطريز يدوي', isDemo: true },
  { id: 'demo-5', name: 'خلطة زعتر بلدي', category: 'مونة', price: 28000, stockCount: 8, area: 'قطنا', store: 'مونة ستّي', storeId: 'demo-pantry', emoji: '🌿', color: 'herb', note: 'مكونات محلية', isDemo: true },
  { id: 'demo-6', name: 'شمعة برائحة الياسمين', category: 'منزل', price: 55000, stockCount: 4, area: 'جرمانا', store: 'ضو الشام', storeId: 'demo-candles', emoji: '🕯️', color: 'cream', note: 'صنع يدوي', isDemo: true },
  { id: 'demo-7', name: 'حقيبة قماش يومية', category: 'أزياء', price: 68000, stockCount: 5, area: 'جرمانا', store: 'خيط وحكاية', storeId: 'demo-thread', emoji: '👜', color: 'lilac', note: 'قماش متين', isDemo: true },
  { id: 'demo-8', name: 'زيت زيتون بلدي', category: 'مونة', price: 95000, stockCount: 7, area: 'قطنا', store: 'خيرات الدار', storeId: 'demo-harvest', emoji: '🫒', color: 'olive', note: 'عبوة تجريبية', isDemo: true },
]

export const demoStores: MarketplaceStore[] = [
  { id: 'demo-harvest', name: 'خيرات الدار', description: 'مونة بلدية وخيرات موسمية من أهل المنطقة.', area: 'قطنا', productCount: 2, isDemo: true },
  { id: 'demo-crafts', name: 'دار الحرف', description: 'قطع منزلية مصنوعة يدويًا بحكاية شامية.', area: 'قطنا', productCount: 1, isDemo: true },
  { id: 'demo-thread', name: 'خيط وحكاية', description: 'تطريز وقطع قماشية بتفاصيل محلية.', area: 'جرمانا', productCount: 2, isDemo: true },
  { id: 'demo-soap', name: 'بيت الصابون', description: 'عناية طبيعية مستوحاة من صناعة الصابون السوري.', area: 'جرمانا', productCount: 1, isDemo: true },
  { id: 'demo-candles', name: 'ضو الشام', description: 'شموع بروائح دافئة مصنوعة يدويًا.', area: 'جرمانا', productCount: 1, isDemo: true },
]

type CatalogRow = {
  id: string
  name: string
  description: string | null
  price_syp: number
  stock_count: number
  store_id: string
  category_id: string | null
  product_images: { storage_path: string; sort_order: number }[] | null
  categories: { name: string } | { name: string }[] | null
  stores: { name: string; description: string; cities: { name: string } | { name: string }[] | null }
}

type StoreRow = {
  id: string
  name: string
  description: string
  cities: { name: string } | { name: string }[] | null
  products: { count: number }[]
}

const fallbackColor: Record<string, string> = {
  مونة: 'herb', منزل: 'cream', أزياء: 'rose', عناية: 'sage',
}

export async function loadCatalog(): Promise<Product[]> {
  if (!supabase) return demoProducts

  const { data, error } = await supabase
    .from('products')
    .select('id,name,description,price_syp,stock_count,store_id,category_id,product_images(storage_path,sort_order),categories(name),stores!inner(name,description,cities(name))')
    .eq('is_active', true)
    .eq('stores.status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as CatalogRow[]).map((row) => {
    const category = Array.isArray(row.categories) ? row.categories[0]?.name : row.categories?.name
    const city = Array.isArray(row.stores.cities) ? row.stores.cities[0]?.name : row.stores.cities?.name
    const firstImage = [...(row.product_images ?? [])].sort((a, b) => a.sort_order - b.sort_order)[0]
    const imageUrl = firstImage && supabase
      ? supabase.storage.from('product-images').getPublicUrl(firstImage.storage_path).data.publicUrl
      : undefined

    return {
      id: row.id,
      name: row.name,
      description: row.description ?? '',
      category: category ?? 'أخرى',
      categoryId: row.category_id ?? undefined,
      price: Number(row.price_syp),
      stockCount: row.stock_count,
      area: city ?? 'سوريا',
      store: row.stores.name,
      storeId: row.store_id,
      storeDescription: row.stores.description,
      emoji: '✳',
      color: fallbackColor[category ?? ''] ?? 'sage',
      note: row.stock_count > 0 ? 'متوفر' : 'نفد المخزون',
      imageUrl,
      isDemo: false,
    }
  })
}

export async function loadStores(): Promise<MarketplaceStore[]> {
  if (!supabase) return demoStores

  const { data, error } = await supabase
    .from('stores')
    .select('id,name,description,cities(name),products(count)')
    .eq('status', 'active')
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as StoreRow[]).map((row) => ({
    id: row.id,
    name: row.name,
    description: row.description,
    area: Array.isArray(row.cities) ? row.cities[0]?.name ?? 'سوريا' : row.cities?.name ?? 'سوريا',
    productCount: row.products?.[0]?.count ?? 0,
    isDemo: false,
  }))
}

export async function loadCategories(): Promise<string[]> {
  if (!supabase) return ['مونة', 'منزل', 'أزياء', 'عناية']
  const { data, error } = await supabase
    .from('categories')
    .select('name')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw error
  return (data ?? []).map((category) => category.name)
}

export async function loadCities(): Promise<string[]> {
  if (!supabase) return ['قطنا', 'جرمانا']
  const { data, error } = await supabase.from('cities').select('name').eq('is_active', true).order('name')
  if (error) throw error
  return (data ?? []).map((city) => city.name)
}
