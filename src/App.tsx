import { useEffect, useMemo, useState } from 'react'
import type { User } from '@supabase/supabase-js'
import { AccountDialog } from './components/AccountDialog'
import { ProductCard } from './components/ProductCard'
import { ProductDetailsDialog } from './components/ProductDetailsDialog'
import { SiteHeader } from './components/SiteHeader'
import { SellerCenter } from './components/SellerCenter'
import { StoreDetailsDialog } from './components/StoreDetailsDialog'
import { areas as demoAreas, categories as demoCategories, demoProducts } from './data/demoCatalog'
import { loadCatalog, type CatalogData } from './lib/catalog'
import { supabase } from './lib/supabase'
import type { Product, StorePreview } from './types'

type CatalogState = 'demo' | 'loading' | 'ready' | 'empty' | 'error'

const demoStores: StorePreview[] = [...new Set(demoProducts.map((product) => product.storeName))].map((name, index) => {
  const product = demoProducts.find((item) => item.storeName === name)!
  return { id: `sample-store-${index + 1}`, name, area: product.area, description: product.description }
})

const categoryIcons = ['✳', '🍯', '🏺', '🧵', '🌱']
const emptyCatalog: CatalogData = { products: [], categories: [], areas: [], stores: [] }

export default function App() {
  const isDemo = !supabase
  const [query, setQuery] = useState('')
  const [area, setArea] = useState(demoAreas[0]!)
  const [category, setCategory] = useState(demoCategories[0]!)
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [favorites, setFavorites] = useState<string[]>([])
  const [cart, setCart] = useState<Product[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [accountOpen, setAccountOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [selectedStore, setSelectedStore] = useState<StorePreview | null>(null)
  const [user, setUser] = useState<User | null>(null)
  const [notice, setNotice] = useState('')
  const [refreshToken, setRefreshToken] = useState(0)
  const [catalogState, setCatalogState] = useState<CatalogState>(isDemo ? 'demo' : 'loading')
  const [catalog, setCatalog] = useState<CatalogData>(() => isDemo ? {
    products: demoProducts,
    categories: demoCategories.slice(1),
    areas: demoAreas.slice(1),
    stores: demoStores,
  } : emptyCatalog)

  useEffect(() => {
    if (!supabase) return
    let cancelled = false
    setCatalogState('loading')
    void loadCatalog().then((result) => {
      if (cancelled) return
      setCatalog(result)
      setCatalogState(result.products.length ? 'ready' : 'empty')
    }).catch(() => {
      if (!cancelled) setCatalogState('error')
    })
    return () => { cancelled = true }
  }, [refreshToken])

  useEffect(() => {
    if (!supabase) return
    let active = true
    void supabase.auth.getSession().then(({ data }) => {
      if (active) setUser(data.session?.user ?? null)
    })
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
    })
    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const categoryOptions = ['الكل', ...catalog.categories]
  const areaOptions = ['كل المناطق', ...catalog.areas]
  const products = useMemo(() => {
    if (catalogState === 'error' || catalogState === 'loading') return []
    const search = query.trim().toLocaleLowerCase('ar')
    return catalog.products.filter((product) => {
      const matchesCategory = category === 'الكل' || product.category === category
      const matchesArea = area === 'كل المناطق' || product.area === area
      const matchesSearch = !search || `${product.name} ${product.storeName} ${product.category}`.toLocaleLowerCase('ar').includes(search)
      const matchesFavorites = !favoritesOnly || favorites.includes(product.id)
      return matchesCategory && matchesArea && matchesSearch && matchesFavorites
    })
  }, [area, catalog.products, catalogState, category, favorites, favoritesOnly, query])

  const showNotice = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2200)
  }

  const toggleFavorite = (productId: string) => {
    setFavorites((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId])
  }

  const addToCart = (product: Product) => {
    setCart((current) => [...current, product])
    showNotice('أُضيف المنتج إلى السلة التجريبية.')
  }

  return (
    <>
      <SiteHeader
        query={query}
        onQueryChange={setQuery}
        area={areaOptions.includes(area) ? area : areaOptions[0]!}
        areaOptions={areaOptions}
        onAreaChange={setArea}
        cartCount={cart.length}
        onCartClick={() => setCartOpen(true)}
        userEmail={user?.email ?? null}
        onAccountClick={() => setAccountOpen(true)}
        isDemo={isDemo}
      />
      <main id="home">
        <section className="hero page-width">
          <div className="hero-copy">
            <span className="eyebrow"><i /> من حارتنا، إلك</span>
            <h1>أشياء حلوة،<br /><em>من ناسنا.</em></h1>
            <p>اكتشف منتجات محلية من متاجر قريبة منك. تصفّح حسب الفئة والمنطقة وخلي دعمك يوصل لأصحابه.</p>
            <a className="primary-button" href="#products">تصفّح المنتجات <span aria-hidden="true">←</span></a>
            <div className="hero-note"><span aria-hidden="true">✳</span> نبدأ من قطنا وجرمانا، ونتوسع سوا.</div>
          </div>
          <div className="hero-illustration" aria-label="رسم توضيحي لمنتجات محلية">
            <div className="hero-sun" />
            <div className="hero-shape shape-sage"><span>🌿</span><small>من خيرات الدار</small></div>
            <div className="hero-shape shape-clay"><span>🏺</span><small>صنع بمحبة</small></div>
            <div className="hero-sticker">من قلب الشام<br /><b>إلك بكل محبة</b></div>
          </div>
        </section>

        <section className="category-section page-width" aria-labelledby="category-title">
          <div className="section-heading"><div><span className="eyebrow">اختار على ذوقك</span><h2 id="category-title">من وين بدك تبلّش؟</h2></div><span className="section-hint">{isDemo ? 'فئات عرض تجريبية' : 'فئات من قاعدة البيانات'}</span></div>
          <div className="category-list" role="group" aria-label="فلترة حسب الفئة">
            {categoryOptions.map((name, index) => <button className={`category-chip ${category === name ? 'selected' : ''}`} type="button" key={name} onClick={() => setCategory(name)} aria-pressed={category === name}><span aria-hidden="true">{categoryIcons[index % categoryIcons.length]}</span>{name}</button>)}
          </div>
        </section>

        <section className="products-section page-width" id="products" aria-labelledby="products-title">
          <div className="section-heading"><div><span className="eyebrow">اختيرت إلك</span><h2 id="products-title">{favoritesOnly ? 'منتجاتك المحفوظة' : 'منتجات من متاجر قريبة'}</h2><p className="section-hint">{catalogState === 'demo' ? `${products.length} منتجات تجريبية` : `${products.length} منتجات من الكتالوج`}</p></div><button className="saved-filter" type="button" onClick={() => setFavoritesOnly((current) => !current)} aria-pressed={favoritesOnly}>♡ المحفوظات <span>{favorites.length}</span></button></div>
          {catalogState === 'loading' && <div className="catalog-message" role="status"><span className="loading-dot" /> جارٍ تحميل المنتجات والفئات والمناطق…</div>}
          {catalogState === 'error' && <div className="catalog-message catalog-error" role="alert"><h3>تعذر تحميل الكتالوج</h3><p>تحقق من الاتصال وإعدادات Supabase وسياسات القراءة (RLS). لم نعرض بيانات تجريبية بدلًا من بيانات قاعدة البيانات.</p><button type="button" onClick={() => setRefreshToken((value) => value + 1)}>إعادة المحاولة</button></div>}
          {catalogState !== 'loading' && catalogState !== 'error' && <>
            <div className="product-grid">{products.map((product) => <ProductCard key={product.id} product={product} favorite={favorites.includes(product.id)} onToggleFavorite={toggleFavorite} onAdd={addToCart} onView={setSelectedProduct} />)}</div>
            {products.length === 0 && <div className="empty-state"><span>⌕</span><h3>{catalogState === 'empty' && !favoritesOnly ? 'لا توجد منتجات معروضة حاليًا' : favoritesOnly ? 'ما عندك منتجات محفوظة' : 'ما لقينا نتائج'}</h3><p>{catalogState === 'empty' && !favoritesOnly ? 'قد يكون الكتالوج فارغًا أو لا توجد منتجات منشورة متاحة لحسابك.' : favoritesOnly ? 'اضغط ♡ على أي منتج ليظهر هنا.' : 'جرّب كلمة تانية أو اختار فئة أو منطقة مختلفة.'}</p><button type="button" onClick={() => { setQuery(''); setArea('كل المناطق'); setCategory('الكل'); setFavoritesOnly(false) }}>عرض كل المنتجات</button></div>}
          </>}
        </section>

        <section className="stores-section" id="stores">
          <div className="page-width"><div className="section-heading"><div><span className="eyebrow">ناس من منطقتك</span><h2>تعرّف على المتاجر</h2></div><span className="section-hint">{isDemo ? 'أمثلة غير مسجلة فعليًا' : 'متاجر معتمدة من قاعدة البيانات'}</span></div>
            {catalog.stores.length ? <div className="store-list">{catalog.stores.map((store, index) => <button className="store-card" type="button" key={store.id} onClick={() => setSelectedStore(store)}><span aria-hidden="true">{['🌿', '🏺', '🧵'][index % 3]}</span><div><h3>{store.name}</h3><p>{store.area} · {store.description || (isDemo ? 'مثال توضيحي' : 'متجر محلي')}</p><small>عرض المتجر والمنتجات ←</small></div></button>)}</div> : <div className="store-empty">{isDemo ? 'لا توجد متاجر حقيقية في بيانات العرض.' : 'لا توجد متاجر معتمدة للعرض بعد.'}</div>}
          </div>
        </section>

        <section className="steps-section page-width" id="how-it-works"><div className="section-heading"><div><span className="eyebrow">بكل بساطة</span><h2>من حارتك لحد بابك</h2></div><span className="section-hint">طريقة الطلب بعد تفعيل المتاجر</span></div><div className="steps-grid"><article><b>١</b><h3>اختار منتجك</h3><p>اكتشف المنتجات حسب الفئة والمنطقة.</p></article><article><b>٢</b><h3>أرسل طلبك</h3><p>أضف عنوانك ورقم تواصلك وتأكد من التوصيل.</p></article><article><b>٣</b><h3>ادفع عند الاستلام</h3><p>تدفع للمتجر عند وصول الطلب، حسب الخدمة المتاحة.</p></article></div></section>

        <SellerCenter user={user} onSignIn={() => setAccountOpen(true)} />
      </main>
      <footer className="site-footer"><a className="brand" href="#home"><span className="brand-mark">ش</span><span className="brand-copy"><strong>شامنا</strong><small>سوقنا أقرب</small></span></a><span>من أهلنا، لأهلنا. ♡</span><small>© شامنا SHAMNA · {isDemo ? 'واجهة عرض تجريبية' : 'كتالوج متصل'}</small></footer>
      {notice && <div className="toast" role="status">✓ {notice}</div>}
      {cartOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}><aside className="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title"><div className="cart-head"><h2 id="cart-title">سلتك التجريبية</h2><button type="button" aria-label="إغلاق السلة" onClick={() => setCartOpen(false)}>×</button></div>{cart.length === 0 ? <div className="cart-empty"><span>♧</span><h3>السلة فاضية</h3><p>أضف منتجًا من المتجر ليظهر هنا.</p></div> : <><div className="cart-items">{cart.map((product, index) => <article className="cart-row" key={`${product.id}-${index}`}><span className="cart-thumb" aria-hidden="true">{product.emoji}</span><div><h3>{product.name}</h3><p>{product.priceSyp.toLocaleString('ar-SY')} ل.س</p></div><button className="remove-item" type="button" onClick={() => setCart((current) => current.filter((_, itemIndex) => itemIndex !== index))} aria-label={`إزالة ${product.name}`}>إزالة</button></article>)}</div><div className="cart-total"><span>المجموع التجريبي</span><strong>{cart.reduce((sum, product) => sum + product.priceSyp, 0).toLocaleString('ar-SY')} ل.س</strong></div><button className="clear-cart" type="button" onClick={() => setCart([])}>إفراغ السلة</button></>}<p className="cart-demo-note">هذه سلة للعرض فقط؛ لا يتم إرسال طلب أو تحصيل مبلغ.</p></aside></div>}
      {accountOpen && <AccountDialog user={user} onClose={() => setAccountOpen(false)} onAuthenticated={() => setAccountOpen(false)} />}
      {selectedProduct && <ProductDetailsDialog product={selectedProduct} favorite={favorites.includes(selectedProduct.id)} onClose={() => setSelectedProduct(null)} onToggleFavorite={toggleFavorite} onAdd={addToCart} />}
      {selectedStore && <StoreDetailsDialog store={selectedStore} products={catalog.products.filter((product) => product.storeId ? product.storeId === selectedStore.id : product.storeName === selectedStore.name)} isDemo={isDemo} onClose={() => setSelectedStore(null)} onViewProduct={(product) => { setSelectedStore(null); setSelectedProduct(product) }} />}
    </>
  )
}
