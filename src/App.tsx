import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useAccessibleDialog } from './hooks/useAccessibleDialog'
import type { MarketplaceStore, Product } from './lib/models'
import { demoProducts, loadCatalog, loadCategories, loadCities, loadStores } from './lib/catalog'
import { isSupabaseConfigured } from './lib/supabase'
import { useAuth } from './hooks/useAuth'
import { filterCatalog, filterFavorites, summarizeCart } from './lib/marketplace'
import { accountHash, parseMarketplaceHash, productHash, storeHash } from './lib/routes'
import { userFacingError } from './lib/user-facing-error'

const AccountCenter = lazy(() => import('./components/AccountCenter').then((module) => ({ default: module.AccountCenter })))
const AuthDialog = lazy(() => import('./components/AuthDialog').then((module) => ({ default: module.AuthDialog })))
const PasswordRecoveryDialog = lazy(() => import('./components/PasswordRecoveryDialog').then((module) => ({ default: module.PasswordRecoveryDialog })))
const CheckoutDialog = lazy(() => import('./components/CheckoutDialog').then((module) => ({ default: module.CheckoutDialog })))

const categoryIcons: Record<string, string> = { 'الكل': '✳', 'مونة': '🍯', 'منزل': '🏺', 'أزياء': '🧵', 'عناية': '🌱' }
const formatPrice = (price: number) => new Intl.NumberFormat('ar-SY').format(price)

function DialogLoading() {
  return <div className="overlay" role="status" aria-live="polite"><div className="dialog-loading">عم نجهّز النافذة…</div></div>
}

function App() {
  const { session, roles, loading: authLoading, passwordRecovery, clearPasswordRecovery } = useAuth()
  const [route, setRoute] = useState(() => parseMarketplaceHash(window.location.hash))
  const [products, setProducts] = useState<Product[]>(isSupabaseConfigured ? [] : demoProducts)
  const [stores, setStores] = useState<MarketplaceStore[]>([])
  const [categoryNames, setCategoryNames] = useState(['مونة', 'منزل', 'أزياء', 'عناية'])
  const [cityNames, setCityNames] = useState(['قطنا', 'جرمانا'])
  const [catalogLoading, setCatalogLoading] = useState(isSupabaseConfigured)
  const [storesLoading, setStoresLoading] = useState(isSupabaseConfigured)
  const [catalogError, setCatalogError] = useState('')
  const [storeError, setStoreError] = useState('')
  const [category, setCategory] = useState('الكل')
  const [area, setArea] = useState('كل المناطق')
  const [query, setQuery] = useState('')
  const [favoriteIds, setFavoriteIds] = useState<string[]>(() => {
    try {
      const value: unknown = JSON.parse(localStorage.getItem('shamna-favorites') ?? '[]')
      return Array.isArray(value) && value.every((item) => typeof item === 'string') ? value : []
    } catch { return [] }
  })
  const [favoritesOnly, setFavoritesOnly] = useState(false)
  const [priceOrder, setPriceOrder] = useState<'recommended' | 'low' | 'high'>('recommended')
  const [cart, setCart] = useState<string[]>(() => {
    try {
      const saved: unknown = JSON.parse(localStorage.getItem('shamna-cart') ?? '[]')
      return Array.isArray(saved) && saved.every((item) => typeof item === 'string') ? saved : []
    } catch { return [] }
  })
  const [cartOpen, setCartOpen] = useState(false)
  const [authOpen, setAuthOpen] = useState(false)
  const [checkoutOpen, setCheckoutOpen] = useState(false)
  const [notice, setNotice] = useState('')
  const cartDialogRef = useAccessibleDialog<HTMLElement>(() => setCartOpen(false), cartOpen)

  useEffect(() => { localStorage.setItem('shamna-cart', JSON.stringify(cart)) }, [cart])
  useEffect(() => { localStorage.setItem('shamna-favorites', JSON.stringify(favoriteIds)) }, [favoriteIds])

  useEffect(() => {
    const updateRoute = () => setRoute(parseMarketplaceHash(window.location.hash))
    window.addEventListener('hashchange', updateRoute)
    return () => window.removeEventListener('hashchange', updateRoute)
  }, [])

  useEffect(() => {
    if (route.type !== 'home') {
      window.scrollTo({ top: 0 })
      return
    }
    const anchor = window.location.hash.slice(1)
    if (anchor) {
      let sectionId = anchor
      try { sectionId = decodeURIComponent(anchor) } catch { return }
      requestAnimationFrame(() => document.getElementById(sectionId)?.scrollIntoView())
    }
  }, [route])

  useEffect(() => {
    let active = true
    void Promise.all([loadCatalog(), loadCategories(), loadCities()])
      .then(([loadedProducts, loadedCategories, loadedCities]) => {
        if (!active) return
        setProducts(loadedProducts)
        setCategoryNames(loadedCategories)
        setCityNames(loadedCities)
        setCatalogError('')
      })
      .catch((cause: unknown) => {
        if (active) setCatalogError(userFacingError(cause, 'تعذر تحميل المنتجات. تحقق من اتصالك وحاول تحديث الصفحة.'))
      })
      .finally(() => { if (active) setCatalogLoading(false) })
    void loadStores()
      .then((loadedStores) => { if (active) setStores(loadedStores) })
      .catch((cause: unknown) => {
        if (active) setStoreError(userFacingError(cause, 'تعذر تحميل المتاجر. حاول تحديث الصفحة بعد قليل.'))
      })
      .finally(() => { if (active) setStoresLoading(false) })
    return () => { active = false }
  }, [])

  const categories = useMemo(() => [
    { name: 'الكل', icon: categoryIcons['الكل'] },
    ...categoryNames.map((name) => ({ name, icon: categoryIcons[name] ?? '✳' })),
  ], [categoryNames])

  const matchingProducts = useMemo(() => filterCatalog(products, {
    category, area, storeId: '', query,
  }), [area, category, products, query])
  const favoriteProducts = useMemo(
    () => favoritesOnly ? filterFavorites(matchingProducts, favoriteIds) : matchingProducts,
    [favoriteIds, favoritesOnly, matchingProducts],
  )
  const visibleProducts = useMemo(() => {
    if (priceOrder === 'recommended') return favoriteProducts
    return [...favoriteProducts].sort((left, right) => priceOrder === 'low'
      ? left.price - right.price
      : right.price - left.price)
  }, [favoriteProducts, priceOrder])

  const cartProducts = cart.map((id) => products.find((product) => product.id === id)).filter((item): item is Product => Boolean(item))
  const { subtotal: total } = summarizeCart(cartProducts)
  const routeProduct = route.type === 'product' ? products.find((product) => product.id === route.id) : undefined
  const routeStore = route.type === 'store' ? stores.find((store) => store.id === route.id) : undefined
  const routeStoreProducts = route.type === 'store' ? products.filter((product) => product.storeId === route.id) : []

  const notify = (message: string) => {
    setNotice(message)
    window.setTimeout(() => setNotice(''), 2600)
  }

  const addToCart = (product: Product) => {
    setCart((items) => [...items, product.id])
    notify(product.isDemo ? 'انضاف المنتج إلى السلة التجريبية' : 'انضاف المنتج لسلتك')
  }

  const toggleFavorite = (productId: string) => {
    setFavoriteIds((current) => current.includes(productId)
      ? current.filter((id) => id !== productId)
      : [...current, productId])
  }

  const categoryReset = () => { setCategory('الكل'); setArea('كل المناطق'); setQuery('') }
  const startStoreJourney = () => {
    if (session) window.location.hash = accountHash()
    else setAuthOpen(true)
  }
  const focusAreaFilter = () => {
    if (route.type !== 'home') window.location.hash = '#products'
    window.setTimeout(() => document.getElementById('area-filter')?.focus(), 0)
  }

  return (
    <>
      <div className="announcement">{isSupabaseConfigured ? 'سوق محلي من ناسنا · التوصيل حسب المناطق التي يحددها المتجر' : 'معاينة شامنا · المنتجات والأسعار أمثلة شكلية لا يمكن شراؤها'}</div>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="شامنا الرئيسية"><span className="brand-mark">ش</span><span><b>شامنا</b><small>سوقنا أقرب</small></span></a>
        <nav className="site-nav" aria-label="التنقل الرئيسي"><a href="#products">المنتجات</a><a href="#stores">المتاجر</a><a href="#how-it-works">كيف نطلب؟</a></nav>
        <label className="search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => { setQuery(event.target.value); if (route.type !== 'home') window.location.hash = '#products' }} placeholder="شو عم تدوّر اليوم؟" aria-label="ابحث عن المنتجات" /><kbd>بحث</kbd></label>
        <div className="header-actions">
          <button className="location" onClick={focusAreaFilter}><span>⌖</span><span><small>منطقتك</small><b>{area === 'كل المناطق' ? 'قطنا وجرمانا' : area}</b></span><span className="chevron">⌄</span></button>
          <button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`السلة، ${cart.length} منتجات`}>سلتك <span className="cart-icon">♧</span><i>{cart.length}</i></button>
          <button className="account-button" disabled={authLoading} aria-busy={authLoading} onClick={() => session ? window.location.hash = accountHash() : setAuthOpen(true)}>{authLoading ? 'جارٍ التحميل…' : session ? 'حسابي' : 'دخول'}</button>
        </div>
      </header>

      <main id="home">
        {route.type === 'home' && <>
        <section className="hero">
          <div className="hero-copy"><span className="eyebrow"><i /> من حارتنا، إلك</span><h1>أشياء حلوة،<br /><em>من ناسنا.</em></h1><p>منصة تجمع المتاجر والمنتجات المحلية. تصفّح حسب الفئة والمنطقة، واكتشف حكاية كل متجر.</p><div className="hero-actions"><a href="#products" className="primary-link">تسوّق من حولك <span>←</span></a><button className="seller-link" type="button" onClick={startStoreJourney}>عندك متجر؟ ابدأ من هون</button></div><div className="hero-trust"><span className="avatar-stack"><i>🌿</i><i>🧵</i><i>🏺</i></span><span>{isSupabaseConfigured ? `${stores.length} متجر نشط` : 'متاجر توضيحية'}<br /><b>قطنا وجرمانا</b></span></div></div>
          <div className="hero-art" aria-label="سلة منتجات محلية مرسومة"><div className="sun-orb" /><div className="art-leaf leaf-one">✿</div><div className="art-leaf leaf-two">✿</div><div className="art-card card-back">🌿<span>خيرات الدار</span></div><div className="art-card card-front">🏺<span>دار الحرف</span></div><div className="art-tag">من قلب الشام<br /><b>إلك بكل محبة</b></div><div className="hero-sticker">صنع<br />محلياً <span>✳</span></div></div>
          <div className="hero-bottom"><span>⌄</span><small>اكتشف حكايات المتاجر القريبة</small><span className="hero-line" /></div>
        </section>

        <section className="category-section" aria-label="تسوق حسب الفئة"><div className="section-heading"><div><span className="eyebrow">اختار على ذوقك</span><h2>من وين بدك تبلّش؟</h2></div><a href="#products">كل المنتجات <span>←</span></a></div><div className="category-list">{categories.map((item) => <button className={`category-chip ${category === item.name ? 'selected' : ''}`} key={item.name} onClick={() => setCategory(item.name)}><span>{item.icon}</span>{item.name}</button>)}</div></section>

        <section className="stores-section" id="stores">
          <div className="section-heading"><div><span className="eyebrow">ناس من منطقتك</span><h2>اكتشف المتاجر المحلية</h2></div><button className="text-button" type="button" onClick={startStoreJourney}>افتح متجرك على شامنا <span>←</span></button></div>
          {!isSupabaseConfigured && <div className="demo-note"><span>✳</span> أسماء المتاجر التالية للعرض فقط، وليست متاجر فعلية.</div>}
          {storeError && <div className="inline-error" role="alert">تعذر تحميل المتاجر. {storeError}</div>}
          {storesLoading ? <div className="stores-loading" role="status">عم نحمّل المتاجر القريبة…</div> : stores.filter((store) => area === 'كل المناطق' || store.area === area).length ? <div className="store-grid">{stores.filter((store) => area === 'كل المناطق' || store.area === area).map((store) => <a className="store-card" key={store.id} href={storeHash(store.id)}>
            <span className="store-monogram" aria-hidden="true">{store.name.slice(0, 1)}</span><span className="store-card-copy"><b>{store.name}</b><small>{store.area} · {store.productCount} منتجات</small><span>{store.description || 'متجر محلي على شامنا، اكتشف منتجاته.'}</span></span><span className="store-card-arrow" aria-hidden="true">←</span>
          </a>)}</div> : <div className="stores-empty"><span className="stores-empty-mark">ش</span><div><b>{storeError ? 'المتاجر غير متاحة حاليًا' : 'حارتنا بانتظار أول متجر'}</b><p>{storeError ? 'حاول تحديث الصفحة بعد قليل.' : 'قدّم طلب فتح متجر؛ وبعد مراجعة الإدارة سيظهر متجرك ومنتجاته للزبائن.'}</p></div><button className="primary-link" type="button" onClick={startStoreJourney}>ابدأ طلب متجرك <span>←</span></button></div>}
        </section>

        <section className="products-section" id="products">
          <div className="section-heading product-heading"><div><span className="eyebrow">اختيرت إلك</span><h2>{favoritesOnly ? 'منتجاتك المحفوظة' : 'من متاجر قريبة'}</h2><small className="result-count">{visibleProducts.length} منتج</small></div><div className="product-controls"><button className="favorites-filter" type="button" aria-pressed={favoritesOnly} onClick={() => setFavoritesOnly((value) => !value)}>♡ المحفوظات <span>{favoriteIds.length}</span></button><label className="area-select">⌖ <select id="area-filter" value={area} onChange={(event) => setArea(event.target.value)} aria-label="فلترة حسب المنطقة"><option>كل المناطق</option>{cityNames.map((city) => <option key={city}>{city}</option>)}</select><span>⌄</span></label><label className="area-select sort-select"><span className="sort-label">ترتيب</span><select value={priceOrder} onChange={(event) => setPriceOrder(event.target.value as typeof priceOrder)} aria-label="ترتيب المنتجات"><option value="recommended">الأقرب</option><option value="low">السعر: الأقل</option><option value="high">السعر: الأعلى</option></select><span>⌄</span></label></div></div>
          {!isSupabaseConfigured && <div className="demo-note"><span>✳</span> المنتجات المعروضة أمثلة تجريبية للتصميم، وليست عروضاً للبيع حالياً.</div>}
          {catalogError && <div className="inline-error" role="alert">تعذر تحميل كتالوج المتجر. {catalogError}</div>}
          {catalogLoading ? <div className="loading-state" role="status">عم نحمّل المنتجات…</div> : visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product) => <article className="product-card" key={product.id}>
            <div className={`product-visual ${product.color}`}>
              <span className="product-note">{product.note}</span>
              {product.imageUrl ? <img className="product-image" src={product.imageUrl} alt={product.name} loading="lazy" /> : <span className="product-emoji">{product.emoji}</span>}
              <button className={`favorite ${favoriteIds.includes(product.id) ? 'active' : ''}`} aria-label={`${favoriteIds.includes(product.id) ? 'إزالة من المحفوظات' : 'حفظ'} ${product.name}`} aria-pressed={favoriteIds.includes(product.id)} onClick={() => toggleFavorite(product.id)}>♡</button>
            </div>
            <div className="product-meta"><span>{product.category} <i>·</i> {product.area}</span>{product.storeId ? <a className="store-link" href={storeHash(product.storeId)}>{product.store}</a> : <span>{product.store}</span>}</div>
            <h3><a className="product-title-button" href={productHash(product.id)}>{product.name}</a></h3>
            <div className="product-bottom"><div className="price">{formatPrice(product.price)} <small>ل.س</small></div><button className="add-button" disabled={product.stockCount === 0 || (product.stockCount !== undefined && cart.filter((id) => id === product.id).length >= product.stockCount)} onClick={() => addToCart(product)} aria-label={`أضف ${product.name} إلى السلة`}>＋</button></div>
          </article>)}</div> : <div className="empty-state"><span>⌕</span><h3>{catalogError ? 'الكتالوج غير متاح حالياً' : favoritesOnly ? 'ما عندك منتجات محفوظة' : 'ما لقينا شي بهالبحث'}</h3><p>{catalogError ? 'تحقق من ربط قاعدة البيانات وسياسات الوصول.' : favoritesOnly ? 'اضغط ♡ على منتج ليظهر في هذه القائمة. المحفوظات تبقى على هذا الجهاز.' : 'جرّب كلمة تانية أو اختار فئة مختلفة.'}</p><button onClick={() => { setFavoritesOnly(false); categoryReset() }}>{favoritesOnly ? 'تصفّح المنتجات' : 'عرض كل المنتجات'}</button></div>}
        </section>

        <section className="how-section" id="how-it-works">
          <div className="how-intro"><span className="eyebrow">تسوّق براحة</span><h2>طلبك من الحارة،<br />لباب البيت.</h2><p>خطوات بسيطة، وتفاصيل واضحة قبل ما تأكد طلبك.</p><button className="text-button" type="button" onClick={() => document.getElementById('products')?.scrollIntoView({ behavior: 'smooth' })}>ابدأ التصفح <span>←</span></button></div>
          <div className="how-steps"><article><span>١</span><div><b>اختار منطقتك</b><p>حتى تشوف المتاجر اللي بتوصل لعندك.</p></div><i>⌖</i></article><article><span>٢</span><div><b>اكتشف منتجات ناسنا</b><p>قارن المنتجات واحفظ اللي عجبك.</p></div><i>✳</i></article><article><span>٣</span><div><b>أكد طلبك براحة</b><p>راجع رسوم التوصيل وادفع عند الاستلام.</p></div><i>♡</i></article></div>
        </section>
        <section className="local-callout"><div className="callout-flower">✿</div><div><span className="eyebrow">كل متجر إله حكاية</span><h2>من حارتك،<br />لبيتك ومحبتك.</h2><p>خلف كل قطعة حدا تعب عليها. تسوّق محلي وخلّي خيرك يلفّ ويرجع.</p></div><a href="#products">تعرّف على المتاجر <span>←</span></a><span className="callout-star">✳</span></section>
        </>}

        {route.type === 'product' && <section className="detail-page" aria-labelledby="product-page-title">
          <a className="detail-back" href="#products">← العودة للمنتجات</a>
          {catalogLoading ? <p className="loading-state" role="status">عم نحمّل تفاصيل المنتج…</p> : routeProduct ? <article className="detail-layout">
            <div className={`detail-visual ${routeProduct.color}`}>{routeProduct.imageUrl ? <img src={routeProduct.imageUrl} alt={routeProduct.name} /> : <span>{routeProduct.emoji}</span>}</div>
            <div className="detail-copy"><span className="eyebrow">{routeProduct.category} · {routeProduct.area}</span><h1 id="product-page-title">{routeProduct.name}</h1><p>{routeProduct.description || routeProduct.note}</p><strong className="detail-price">{formatPrice(routeProduct.price)} ل.س</strong><p className="detail-stock">{routeProduct.stockCount === 0 ? 'نفد المخزون' : routeProduct.stockCount === undefined ? 'تحقق من التوفر عند الطلب' : `المتوفر ${new Intl.NumberFormat('ar-SY').format(routeProduct.stockCount)} قطع`}</p>{routeProduct.storeId && <a className="detail-store-link" href={storeHash(routeProduct.storeId)}>من متجر {routeProduct.store} · {routeProduct.area} ←</a>}<button className="secondary-submit" aria-pressed={favoriteIds.includes(routeProduct.id)} onClick={() => toggleFavorite(routeProduct.id)}>{favoriteIds.includes(routeProduct.id) ? 'إزالة من المحفوظات' : 'حفظ في المحفوظات على هذا الجهاز'}</button><button className="form-submit" disabled={routeProduct.stockCount === 0 || (routeProduct.stockCount !== undefined && cart.filter((id) => id === routeProduct.id).length >= routeProduct.stockCount)} onClick={() => addToCart(routeProduct)}>أضف إلى السلة</button></div>
          </article> : <div className="empty-state"><span>⌕</span><h1 id="product-page-title">{catalogError ? 'تعذر تحميل المنتج' : 'المنتج غير متاح'}</h1><p>{catalogError || 'قد يكون المنتج قد أزيل أو لم يعد منشورًا.'}</p><a className="primary-link" href="#products">العودة للمنتجات ←</a></div>}
        </section>}

        {route.type === 'account' && (authLoading ? <section className="account-required" role="status">عم نتحقق من جلسة الحساب…</section> : session ? <Suspense fallback={<DialogLoading />}><AccountCenter presentation="page" session={session} roles={roles} onClose={() => { window.location.hash = '#home' }} notify={notify} /></Suspense> : <section className="account-required"><span className="eyebrow">حساب شامنا</span><h1>سجّل الدخول لمتابعة حسابك</h1><p>الملف الشخصي وطلباتك وإعدادات المتجر تظهر بعد تسجيل الدخول.</p><button className="form-submit" onClick={() => setAuthOpen(true)}>تسجيل الدخول</button></section>)}

        {route.type === 'store' && <section className="detail-page" aria-labelledby="store-page-title">
          <a className="detail-back" href="#stores">← العودة للمتاجر</a>
          {storesLoading ? <p className="loading-state" role="status">عم نحمّل صفحة المتجر…</p> : routeStore ? <>
            <header className="store-profile"><span className="store-monogram" aria-hidden="true">{routeStore.name.slice(0, 1)}</span><div><span className="eyebrow">متجر محلي · {routeStore.area}</span><h1 id="store-page-title">{routeStore.name}</h1><p>{routeStore.description || 'متجر محلي على شامنا، اكتشف منتجاته.'}</p><small>{new Intl.NumberFormat('ar-SY').format(routeStoreProducts.length)} منتج منشور</small></div></header>
            {routeStoreProducts.length ? <div className="store-product-list">{routeStoreProducts.map((product) => <article className="store-product-card" key={product.id}><a className={`store-product-visual ${product.color}`} href={productHash(product.id)} aria-label={`عرض ${product.name}`}>{product.imageUrl ? <img src={product.imageUrl} alt="" loading="lazy" /> : <span>{product.emoji}</span>}</a><div><span className="eyebrow">{product.category} · {product.note}</span><h2><a href={productHash(product.id)}>{product.name}</a></h2><p>{product.description || product.note}</p><strong>{formatPrice(product.price)} ل.س</strong></div><a className="text-button" href={productHash(product.id)}>تفاصيل المنتج ←</a></article>)}</div> : <div className="empty-state"><h2 id="store-page-title">ما في منتجات منشورة حالياً</h2><p>ارجع لاحقاً لاكتشاف منتجات هذا المتجر.</p></div>}
          </> : <div className="empty-state"><span>⌕</span><h1 id="store-page-title">{storeError ? 'تعذر تحميل المتجر' : 'المتجر غير متاح'}</h1><p>{storeError || 'قد يكون المتجر متوقفاً أو غير موجود.'}</p><a className="primary-link" href="#stores">العودة للمتاجر ←</a></div>}
        </section>}
      </main>

      <footer><a className="brand footer-brand" href="#home"><span className="brand-mark">ش</span><span><b>شامنا</b><small>سوقنا أقرب</small></span></a><span>من أهلنا، لأهلنا. <b>♡</b></span><small>© شامنا SHAMNA · {isSupabaseConfigured ? 'متجر تجريبي' : 'وضع العرض التجريبي'}</small></footer>

      {notice && <div className="toast" role="status">✓ &nbsp;{notice}</div>}

      {cartOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}><aside ref={cartDialogRef} tabIndex={-1} className="cart-panel" role="dialog" aria-modal="true" aria-labelledby="cart-title">
        <div className="cart-head"><div><span className="eyebrow">سلتك المحلية</span><h2 id="cart-title">طلباتك <i>({cart.length})</i></h2></div><button onClick={() => setCartOpen(false)} aria-label="إغلاق السلة">×</button></div>
        {cartProducts.length ? <><div className="cart-items">{cartProducts.map((product, index) => <div className="cart-row" key={`${product.id}-${index}`}><span className={`cart-thumb ${product.color}`}>{product.imageUrl ? <img src={product.imageUrl} alt="" /> : product.emoji}</span><div><b>{product.name}</b><small>{product.store} · {product.area}</small></div><strong>{formatPrice(product.price)} ل.س</strong><button className="remove-item" aria-label={`حذف ${product.name}`} onClick={() => setCart((items) => items.filter((_, itemIndex) => itemIndex !== index))}>×</button></div>)}</div><div className="cart-total"><span>المجموع قبل التوصيل</span><b>{formatPrice(total)} ل.س</b><small>تُراجع الأسعار والمخزون عند تأكيد الطلب، ويحسب رسم التوصيل حسب المنطقة والمتجر.</small></div><button className="checkout-button" onClick={() => { setCartOpen(false); setCheckoutOpen(true) }}>متابعة الطلب <span>←</span></button><button className="clear-cart" onClick={() => setCart([])}>إفراغ السلة</button></> : <div className="cart-empty"><span>♧</span><h3>سلتك لسا فاضية</h3><p>لما تلاقي شي حلو، ضيفه هون.</p><button onClick={() => setCartOpen(false)}>تصفّح المنتجات</button></div>}
      </aside></div>}

      {authOpen && <Suspense fallback={<DialogLoading />}><AuthDialog onClose={() => { setAuthOpen(false); if (route.type === 'account' && !session) window.location.hash = '#home' }} onAuthenticated={() => { setAuthOpen(false); notify('تم تسجيل الدخول.') }} /></Suspense>}
      {passwordRecovery && <Suspense fallback={<DialogLoading />}><PasswordRecoveryDialog onClose={clearPasswordRecovery} /></Suspense>}
      {checkoutOpen && <Suspense fallback={<DialogLoading />}><CheckoutDialog
        session={session}
        cart={cartProducts}
        onClose={() => setCheckoutOpen(false)}
        onRequireAuth={() => { setCheckoutOpen(false); setAuthOpen(true) }}
        onCompleted={() => { setCart([]); setCheckoutOpen(false); notify('تم تسجيل طلبك، وسيظهر في حسابك بعد تأكيد المتجر.') }}
      /></Suspense>}
    </>
  )
}

export default App
