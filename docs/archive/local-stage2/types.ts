export type Product = {
  id: string
  storeId?: string
  name: string
  category: string
  priceSyp: number
  area: string
  storeName: string
  emoji: string
  tone: 'sage' | 'clay' | 'peach' | 'rose' | 'olive'
  description: string
  stockQuantity?: number
  isDemo?: boolean
}

export type StorePreview = {
  id: string
  name: string
  area: string
  description: string
}
