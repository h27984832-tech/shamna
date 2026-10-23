import type { Product } from '../types'

type ProductDetailsDialogProps = {
  product: Product
  favorite: boolean
  onClose: () => void
  onToggleFavorite: (id: string) => void
  onAdd: (product: Product) => void
}

const formatPrice = (amount: number) => new Intl.NumberFormat('ar-SY').format(amount)

export function ProductDetailsDialog({ product, favorite, onClose, onToggleFavorite, onAdd }: ProductDetailsDialogProps) {
  return (
    <div className="details-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <article className="details-dialog" role="dialog" aria-modal="true" aria-labelledby="product-details-title">
        <button className="details-close" type="button" onClick={onClose} aria-label="إغلاق تفاصيل المنتج">×</button>
        <div className={`details-art tone-${product.tone}`} aria-hidden="true"><span>{product.emoji}</span></div>
        <div className="details-copy">
          <div className="product-meta"><span>{product.category}</span><span>⌖ {product.area}</span></div>
          <h2 id="product-details-title">{product.name}</h2>
          <p className="details-store">من متجر {product.storeName}</p>
          <p className="details-description">{product.description || 'لم يضف المتجر وصفًا لهذا المنتج بعد.'}</p>
          {product.stockQuantity !== undefined && <p className="details-stock">{product.stockQuantity > 0 ? `المتاح حاليًا: ${product.stockQuantity}` : 'غير متوفر حاليًا'}</p>}
          <strong className="details-price">{formatPrice(product.priceSyp)} <small>ل.س</small></strong>
          <div className="details-actions">
            <button className="primary-button" type="button" onClick={() => { onAdd(product); onClose() }}>أضف إلى السلة التجريبية</button>
            <button className={`details-favorite ${favorite ? 'is-favorite' : ''}`} type="button" onClick={() => onToggleFavorite(product.id)} aria-pressed={favorite}>{favorite ? '♥ محفوظ' : '♡ حفظ المنتج'}</button>
          </div>
          <p className="details-demo-note">{product.isDemo ? 'بيانات هذا المنتج تجريبية.' : 'بيانات المنتج من الكتالوج المتصل.'} الشراء والتواصل مع المتجر غير متاحين بعد، وهذه الصفحة لا تنشئ طلبًا.</p>
        </div>
      </article>
    </div>
  )
}
