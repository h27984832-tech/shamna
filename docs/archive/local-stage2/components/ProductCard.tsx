import type { Product } from '../types'

type ProductCardProps = {
  product: Product
  favorite: boolean
  onToggleFavorite: (productId: string) => void
  onAdd: (product: Product) => void
  onView: (product: Product) => void
}

const formatPrice = (price: number) => new Intl.NumberFormat('ar-SY').format(price)

export function ProductCard({ product, favorite, onToggleFavorite, onAdd, onView }: ProductCardProps) {
  return (
    <article className="product-card">
      <div className={`product-art tone-${product.tone}`}>
        <span aria-hidden="true">{product.emoji}</span>
        <button
          className={`favorite-button ${favorite ? 'is-favorite' : ''}`}
          type="button"
          onClick={() => onToggleFavorite(product.id)}
          aria-label={favorite ? `إزالة ${product.name} من المحفوظات` : `حفظ ${product.name}`}
          aria-pressed={favorite}
        >♡</button>
        {product.isDemo && <small aria-hidden="true">مثال</small>}
      </div>
      <div className="product-card-body">
        <div className="product-meta"><span>{product.category}</span><span>⌖ {product.area}</span></div>
        <h3><button className="product-title-button" type="button" onClick={() => onView(product)}>{product.name}</button></h3>
        <p>{product.storeName}</p>
        <div className="product-card-footer">
          <strong>{formatPrice(product.priceSyp)} <small>ل.س</small></strong>
          <button type="button" onClick={() => onAdd(product)} aria-label={`أضف ${product.name} إلى السلة التجريبية`}>＋</button>
        </div>
      </div>
    </article>
  )
}
