export type Product = {
  id: string
  name: string
  category: string
  categoryId?: string
  price: number
  stockCount?: number
  area: string
  store: string
  storeId?: string
  storeDescription?: string
  emoji: string
  color: string
  note: string
  description?: string
  imageUrl?: string
  isDemo?: boolean
}

export type MarketplaceStore = {
  id: string
  name: string
  description: string
  area: string
  productCount: number
  isDemo?: boolean
}

export type AppRole = 'customer' | 'seller' | 'admin'

export type StoreStatus = 'pending' | 'active' | 'rejected' | 'suspended'

export type MarketplaceOrderStatus =
  | 'new'
  | 'confirmed'
  | 'preparing'
  | 'out_for_delivery'
  | 'completed'
  | 'cancelled'
