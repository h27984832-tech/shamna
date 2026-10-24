import type { Product, StorePreview } from '../types'

type StoreDetailsDialogProps = {
  store: StorePreview
  products: Product[]
  isDemo: boolean
  onClose: () => void
  onViewProduct: (product: Product) => void
}

const formatPrice = (amount: number) => new Intl.NumberFormat('ar-SY').format(amount)

export function StoreDetailsDialog({ store, products, isDemo, onClose, onViewProduct }: StoreDetailsDialogProps) {
  return (
    <div className="details-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="store-details-dialog" role="dialog" aria-modal="true" aria-labelledby="store-details-title">
        <button className="details-close" type="button" onClick={onClose} aria-label="إغلاق تفاصيل المتجر">×</button>
        <span className="store-details-mark" aria-hidden="true">✿</span>
        <span className="eyebrow">متجر من منطقتك</span>
        <h2 id="store-details-title">{store.name}</h2>
        <p className="details-store">⌖ {store.area}</p>
        <p className="details-description">{store.description || 'لم يضف المتجر نبذة تعريفية بعد.'}</p>
        <h3 className="store-products-title">منتجات المتجر</h3>
        {products.length ? <div className="store-products-list">{products.map((product) => <article className="store-product-row" key={product.id}><span aria-hidden="true">{product.emoji}</span><div><strong>{product.name}</strong><small>{formatPrice(product.priceSyp)} ل.س</small></div><button type="button" onClick={() => onViewProduct(product)}>التفاصيل</button></article>)}</div> : <p className="store-empty">لا توجد منتجات منشورة في هذا المتجر بعد.</p>}
        <p className="details-demo-note">{isDemo ? 'بيانات المتجر تجريبية.' : 'بيانات المتجر من الكتالوج المتصل.'} الطلب والتواصل غير مفعّلين حاليًا.</p>
      </section>
    </div>
  )
}
