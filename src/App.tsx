import { useMemo, useState } from 'react'

type Product = {
  id: number
  name: string
  category: string
  price: number
  area: string
  store: string
  emoji: string
  color: string
  note: string
}

const products: Product[] = [
  { id: 1, name: 'صابون غار طبيعي', category: 'عناية', price: 35000, area: 'جرمانا', store: 'بيت الصابون', emoji: '🧼', color: 'sage', note: 'صناعة محلية' },
  { id: 2, name: 'طقم فناجين قهوة', category: 'منزل', price: 85000, area: 'قطنا', store: 'دار الحرف', emoji: '☕', color: 'clay', note: 'قطعة حرفية' },
  { id: 3, name: 'مربى المشمش البيتي', category: 'مونة', price: 42000, area: 'جرمانا', store: 'مونة ستّي', emoji: '🍑', color: 'peach', note: 'دفعة صغيرة' },
  { id: 4, name: 'وشاح قطني مطرّز', category: 'أزياء', price: 120000, area: 'قطنا', store: 'خيط وحكاية', emoji: '🧣', color: 'rose', note: 'تطريز يدوي' },
  { id: 5, name: 'خلطة زعتر بلدي', category: 'مونة', price: 28000, area: 'قطنا', store: 'مونة ستّي', emoji: '🌿', color: 'herb', note: 'مكونات محلية' },
  { id: 6, name: 'شمعة برائحة الياسمين', category: 'منزل', price: 55000, area: 'جرمانا', store: 'ضو الشام', emoji: '🕯️', color: 'cream', note: 'صنع يدوي' },
  { id: 7, name: 'حقيبة قماش يومية', category: 'أزياء', price: 68000, area: 'جرمانا', store: 'خيط وحكاية', emoji: '👜', color: 'lilac', note: 'قماش متين' },
  { id: 8, name: 'زيت زيتون بلدي', category: 'مونة', price: 95000, area: 'قطنا', store: 'خيرات الدار', emoji: '🫒', color: 'olive', note: 'عبوة تجريبية' },
]

const categories = [
  { name: 'الكل', icon: '✳' }, { name: 'مونة', icon: '🍯' }, { name: 'منزل', icon: '🏺' },
  { name: 'أزياء', icon: '🧵' }, { name: 'عناية', icon: '🌱' },
]

const formatPrice = (price: number) => new Intl.NumberFormat('ar-SY').format(price)

function App() {
  const [category, setCategory] = useState('الكل')
  const [area, setArea] = useState('كل المناطق')
  const [query, setQuery] = useState('')
  const [cart, setCart] = useState<number[]>([])
  const [cartOpen, setCartOpen] = useState(false)
  const [notice, setNotice] = useState('')

  const visibleProducts = useMemo(() => products.filter((product) => {
    const matchesCategory = category === 'الكل' || product.category === category
    const matchesArea = area === 'كل المناطق' || product.area === area
    const matchesQuery = `${product.name} ${product.store} ${product.category}`.includes(query.trim())
    return matchesCategory && matchesArea && matchesQuery
  }), [area, category, query])

  const addToCart = (id: number) => {
    setCart((items) => [...items, id])
    setNotice('انضاف المنتج لسلتك')
    window.setTimeout(() => setNotice(''), 2200)
  }

  const cartProducts = cart.map((id) => products.find((product) => product.id === id)!).filter(Boolean)
  const total = cartProducts.reduce((sum, product) => sum + product.price, 0)

  return (
    <>
      <div className="announcement">سوق محلي من ناسنا · توصيل تجريبي في قطنا وجرمانا</div>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="شامنا الرئيسية"><span className="brand-mark">ش</span><span><b>شامنا</b><small>سوقنا أقرب</small></span></a>
        <label className="search"><span aria-hidden="true">⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="شو عم تدوّر اليوم؟" aria-label="ابحث عن المنتجات" /><kbd>بحث</kbd></label>
        <div className="header-actions"><button className="location" onClick={() => document.getElementById('area-filter')?.focus()}><span>⌖</span><span><small>منطقتك</small><b>{area === 'كل المناطق' ? 'قطنا وجرمانا' : area}</b></span><span className="chevron">⌄</span></button><button className="cart-button" onClick={() => setCartOpen(true)} aria-label={`السلة، ${cart.length} منتجات`}>سلتك <span className="cart-icon">♧</span><i>{cart.length}</i></button></div>
      </header>

      <main id="home">
        <section className="hero">
          <div className="hero-copy"><span className="eyebrow"><i /> من حارتنا، إلك</span><h1>أشياء حلوة،<br /><em>من ناسنا.</em></h1><p>اكتشف منتجات صُنعت بمحبة من متاجر قريبة منك. اختار اللي بتحبه وخلي دعمك يوصل لأصحابه.</p><a href="#products" className="primary-link">تسوّق من حولك <span>←</span></a><div className="hero-trust"><span className="avatar-stack"><i>🌿</i><i>🧵</i><i>🏺</i></span><span>متاجر محلية<br /><b>من قطنا وجرمانا</b></span></div></div>
          <div className="hero-art" aria-label="سلة منتجات محلية مرسومة"><div className="sun-orb" /><div className="art-leaf leaf-one">✿</div><div className="art-leaf leaf-two">✿</div><div className="art-card card-back">🌿<span>خيرات الدار</span></div><div className="art-card card-front">🏺<span>دار الحرف</span></div><div className="art-tag">من قلب الشام<br /><b>إلك بكل محبة</b></div><div className="hero-sticker">صنع<br />محلياً <span>✳</span></div></div>
          <div className="hero-bottom"><span>⌄</span><small>اكتشف حكايات المتاجر القريبة</small><span className="hero-line" /></div>
        </section>

        <section className="category-section" aria-label="تسوق حسب الفئة"><div className="section-heading"><div><span className="eyebrow">اختار على ذوقك</span><h2>من وين بدك تبلّش؟</h2></div><a href="#products">كل المنتجات <span>←</span></a></div><div className="category-list">{categories.map((item) => <button className={`category-chip ${category === item.name ? 'selected' : ''}`} key={item.name} onClick={() => setCategory(item.name)}><span>{item.icon}</span>{item.name}</button>)}</div></section>

        <section className="products-section" id="products"><div className="section-heading product-heading"><div><span className="eyebrow">اختيرت إلك</span><h2>من متاجر قريبة</h2></div><label className="area-select">⌖ <select id="area-filter" value={area} onChange={(event) => setArea(event.target.value)} aria-label="فلترة حسب المنطقة"><option>كل المناطق</option><option>قطنا</option><option>جرمانا</option></select><span>⌄</span></label></div><div className="demo-note"><span>✳</span> المنتجات المعروضة أمثلة تجريبية للتصميم، وليست عروضاً للبيع حالياً.</div>
          {visibleProducts.length ? <div className="product-grid">{visibleProducts.map((product) => <article className="product-card" key={product.id}><div className={`product-visual ${product.color}`}><span className="product-note">{product.note}</span><span className="product-emoji">{product.emoji}</span><button className="favorite" aria-label={`حفظ ${product.name}`} onClick={(event) => event.currentTarget.classList.toggle('active')}>♡</button></div><div className="product-meta"><span>{product.category} <i>·</i> {product.area}</span><span className="store-name">{product.store}</span></div><h3>{product.name}</h3><div className="product-bottom"><div className="price">{formatPrice(product.price)} <small>ل.س</small></div><button className="add-button" onClick={() => addToCart(product.id)} aria-label={`أضف ${product.name} إلى السلة`}>＋</button></div></article>)}</div> : <div className="empty-state"><span>⌕</span><h3>ما لقينا شي بهالبحث</h3><p>جرّب كلمة تانية أو اختار فئة مختلفة.</p><button onClick={() => { setCategory('الكل'); setArea('كل المناطق'); setQuery('') }}>عرض كل المنتجات</button></div>}
        </section>

        <section className="local-callout"><div className="callout-flower">✿</div><div><span className="eyebrow">كل متجر إله حكاية</span><h2>من حارتك،<br />لبيتك ومحبتك.</h2><p>خلف كل قطعة حدا تعب عليها. تسوّق محلي وخلّي خيرك يلفّ ويرجع.</p></div><a href="#products">تعرّف على المتاجر <span>←</span></a><span className="callout-star">✳</span></section>
      </main>

      <footer><a className="brand footer-brand" href="#home"><span className="brand-mark">ش</span><span><b>شامنا</b><small>سوقنا أقرب</small></span></a><span>من أهلنا، لأهلنا. <b>♡</b></span><small>© شامنا SHAMNA · نسخة تجريبية</small></footer>

      {notice && <div className="toast" role="status">✓ &nbsp;{notice}</div>}
      {cartOpen && <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) setCartOpen(false) }}><aside className="cart-panel"><div className="cart-head"><div><span className="eyebrow">سلتك المحلية</span><h2>طلباتك <i>({cart.length})</i></h2></div><button onClick={() => setCartOpen(false)} aria-label="إغلاق السلة">×</button></div>{cartProducts.length ? <><div className="cart-items">{cartProducts.map((product, index) => <div className="cart-row" key={`${product.id}-${index}`}><span className={`cart-thumb ${product.color}`}>{product.emoji}</span><div><b>{product.name}</b><small>{product.store} · {product.area}</small></div><strong>{formatPrice(product.price)} ل.س</strong></div>)}</div><div className="cart-total"><span>المجموع التقريبي</span><b>{formatPrice(total)} ل.س</b><small>الأسعار تجريبية ولا تشمل التوصيل</small></div><button className="checkout-button" onClick={() => setNotice('إتمام الطلب غير متاح في النسخة التجريبية')}>متابعة الطلب <span>←</span></button><button className="clear-cart" onClick={() => setCart([])}>إفراغ السلة</button></> : <div className="cart-empty"><span>♧</span><h3>سلتك لسا فاضية</h3><p>لما تلاقي شي حلو، ضيفه هون.</p><button onClick={() => setCartOpen(false)}>تصفّح المنتجات</button></div>}</aside></div>}
    </>
  )
}

export default App
