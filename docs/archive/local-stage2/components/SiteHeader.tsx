type SiteHeaderProps = {
  query: string
  onQueryChange: (value: string) => void
  area: string
  areaOptions: string[]
  onAreaChange: (value: string) => void
  cartCount: number
  onCartClick: () => void
  userEmail: string | null
  onAccountClick: () => void
  isDemo: boolean
}

export function SiteHeader({ query, onQueryChange, area, areaOptions, onAreaChange, cartCount, onCartClick, userEmail, onAccountClick, isDemo }: SiteHeaderProps) {
  return (
    <>
      <div className="demo-banner" role="note">
        {isDemo ? 'نسخة عرض تجريبية — المنتجات والمتاجر والأسعار أمثلة، ولا يمكن إتمام الشراء حاليًا.' : 'الكتالوج متصل بـSupabase — الطلبات والدفع غير مفعّلين بعد.'}
      </div>
      <header className="site-header">
        <a className="brand" href="#home" aria-label="شامنا — الرئيسية">
          <span className="brand-mark" aria-hidden="true">ش</span>
          <span className="brand-copy"><strong>شامنا</strong><small>سوقنا أقرب</small></span>
        </a>
        <label className="search-box">
          <span aria-hidden="true">⌕</span>
          <input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder="شو عم تدوّر اليوم؟"
            aria-label="ابحث عن منتج أو متجر"
          />
          <kbd>بحث</kbd>
        </label>
        <div className="header-actions">
          <label className="area-control">
            <span aria-hidden="true">⌖</span>
            <span className="area-copy"><small>منطقتك</small>
              <select value={area} onChange={(event) => onAreaChange(event.target.value)} aria-label="اختر منطقتك">
                {areaOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </span>
          </label>
          <button className="cart-button" type="button" onClick={onCartClick} aria-label={`السلة، ${cartCount} منتجات`}>
            سلتك <span aria-hidden="true">♧</span><i>{cartCount}</i>
          </button>
        </div>
        <button className="account-button" type="button" onClick={onAccountClick}>{userEmail ? 'حسابي' : 'دخول'}</button>
      </header>
      <nav className="main-nav" aria-label="التنقل الرئيسي">
        <a href="#products">المنتجات</a>
        <a href="#stores">المتاجر</a>
        <a href="#how-it-works">كيف تطلب؟</a>
        <a className="seller-link" href="#seller">عندك متجر؟ تعرّف على شامنا <span aria-hidden="true">←</span></a>
      </nav>
    </>
  )
}
