import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
import type { AppRole, MarketplaceOrderStatus, StoreStatus } from '../lib/models'
import { supabase } from '../lib/supabase'

type AccountCenterProps = {
  session: Session
  roles: AppRole[]
  onClose: () => void
  notify: (message: string) => void
}

type City = { id: string; name: string }
type Category = { id: string; name: string }
type Store = { id: string; name: string; slug: string; status: StoreStatus; city_id: string }
type OwnedProduct = { id: string; name: string; price_syp: number; stock_count: number; is_active: boolean }
type SellerOrder = { id: string; status: MarketplaceOrderStatus; total_syp: number; created_at: string; order_items?: { product_name_snapshot: string; quantity: number }[] }
type CustomerOrder = { id: string; status: MarketplaceOrderStatus; total_syp: number; created_at: string }
type PendingStore = { id: string; name: string; owner_id: string; city_id: string; cities?: { name: string } | null }
type AdminProduct = { id: string; name: string; price_syp: number; stock_count: number; is_active: boolean; stores?: { name: string } | null }
type AdminOrder = { id: string; status: MarketplaceOrderStatus; total_syp: number; created_at: string; store_orders?: { id: string; status: MarketplaceOrderStatus; stores?: { name: string } | null }[] }

const statusLabels: Record<MarketplaceOrderStatus, string> = {
  new: 'جديد', confirmed: 'تم التأكيد', preparing: 'قيد التجهيز',
  out_for_delivery: 'خرج للتوصيل', completed: 'مكتمل', cancelled: 'ملغى',
}

const transitions: Partial<Record<MarketplaceOrderStatus, MarketplaceOrderStatus[]>> = {
  new: ['confirmed', 'cancelled'],
  confirmed: ['preparing', 'cancelled'],
  preparing: ['out_for_delivery', 'cancelled'],
  out_for_delivery: ['completed'],
}

const formatPrice = (value: number) => `${new Intl.NumberFormat('ar-SY').format(value)} ل.س`

export function AccountCenter({ session, roles, onClose, notify }: AccountCenterProps) {
  const [store, setStore] = useState<Store | null>(null)
  const [cities, setCities] = useState<City[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<OwnedProduct[]>([])
  const [sellerOrders, setSellerOrders] = useState<SellerOrder[]>([])
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [pendingStores, setPendingStores] = useState<PendingStore[]>([])
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([])
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([])
  const [displayName, setDisplayName] = useState('')
  const [phone, setPhone] = useState('')
  const [storeName, setStoreName] = useState('')
  const [cityId, setCityId] = useState('')
  const [storeDescription, setStoreDescription] = useState('')
  const [productName, setProductName] = useState('')
  const [productDescription, setProductDescription] = useState('')
  const [productPrice, setProductPrice] = useState('')
  const [productStock, setProductStock] = useState('')
  const [productCategory, setProductCategory] = useState('')
  const [productImage, setProductImage] = useState<File | null>(null)
  const [zoneCity, setZoneCity] = useState('')
  const [zoneFee, setZoneFee] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isSeller = roles.includes('seller')
  const isAdmin = roles.includes('admin')

  const reload = useCallback(async () => {
    if (!supabase) return
    const [storeResult, citiesResult, categoriesResult, profileResult, customerOrdersResult] = await Promise.all([
      supabase.from('stores').select('id,name,slug,status,city_id').eq('owner_id', session.user.id).maybeSingle(),
      supabase.from('cities').select('id,name').eq('is_active', true).order('name'),
      supabase.from('categories').select('id,name').eq('is_active', true).order('sort_order'),
      supabase.from('profiles').select('display_name,phone').eq('id', session.user.id).maybeSingle(),
      supabase.from('orders').select('id,status,total_syp,created_at').eq('customer_id', session.user.id).order('created_at', { ascending: false }).limit(20),
    ])

    if (storeResult.error && storeResult.error.code !== 'PGRST116') setError(storeResult.error.message)
    const ownStore = storeResult.data as Store | null
    setStore(ownStore)
    const availableCities = (citiesResult.data ?? []) as City[]
    setCities(availableCities)
    setCategories((categoriesResult.data ?? []) as Category[])
    setDisplayName(profileResult.data?.display_name ?? '')
    setPhone(profileResult.data?.phone ?? '')
    setCustomerOrders((customerOrdersResult.data ?? []) as CustomerOrder[])
    if (!cityId && availableCities.length) setCityId(availableCities[0].id)
    if (!zoneCity && availableCities.length) setZoneCity(availableCities[0].id)

    if (ownStore && isSeller) {
      const [productsResult, ordersResult] = await Promise.all([
        supabase.from('products').select('id,name,price_syp,stock_count,is_active').eq('store_id', ownStore.id).order('created_at', { ascending: false }),
        supabase.from('store_orders').select('id,status,total_syp,created_at,order_items(product_name_snapshot,quantity)').eq('store_id', ownStore.id).order('created_at', { ascending: false }).limit(30),
      ])
      if (productsResult.error) setError(productsResult.error.message)
      if (ordersResult.error) setError(ordersResult.error.message)
      setProducts((productsResult.data ?? []) as OwnedProduct[])
      setSellerOrders((ordersResult.data ?? []) as SellerOrder[])
    }

    if (isAdmin) {
      const [pendingResult, productsResult, ordersResult] = await Promise.all([
        supabase.from('stores').select('id,name,owner_id,city_id,cities(name)').eq('status', 'pending').order('created_at'),
        supabase.from('products').select('id,name,price_syp,stock_count,is_active,stores(name)').order('created_at', { ascending: false }).limit(100),
        supabase.from('orders').select('id,status,total_syp,created_at,store_orders(id,status,stores(name))').order('created_at', { ascending: false }).limit(100),
      ])
      if (pendingResult.error) setError(pendingResult.error.message)
      if (productsResult.error) setError(productsResult.error.message)
      if (ordersResult.error) setError(ordersResult.error.message)
      setPendingStores((pendingResult.data ?? []) as PendingStore[])
      setAdminProducts((productsResult.data ?? []) as AdminProduct[])
      setAdminOrders((ordersResult.data ?? []) as AdminOrder[])
    }
  }, [cityId, isAdmin, isSeller, session.user.id, zoneCity])

  useEffect(() => { void reload() }, [reload])

  const perform = async (action: () => Promise<void>, successMessage: string) => {
    if (!supabase) return
    setBusy(true)
    setError('')
    try {
      await action()
      await reload()
      notify(successMessage)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إكمال العملية.')
    } finally {
      setBusy(false)
    }
  }

  const saveProfile = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void perform(async () => {
      const { error: updateError } = await supabase!.from('profiles').update({ display_name: displayName.trim(), phone: phone.trim() || null }).eq('id', session.user.id)
      if (updateError) throw updateError
    }, 'تم حفظ بيانات الملف الشخصي.')
  }

  const requestStore = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    void perform(async () => {
      const slug = `store-${session.user.id.replaceAll('-', '').slice(0, 12)}`
      const { error: insertError } = await supabase!.from('stores').insert({
        owner_id: session.user.id,
        city_id: cityId,
        name: storeName.trim(),
        slug,
        description: storeDescription.trim(),
        status: 'pending',
      })
      if (insertError) throw insertError
    }, 'وصل طلب المتجر للإدارة للمراجعة.')
  }

  const addProduct = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!store) return
    if (!Number.isSafeInteger(Number(productPrice)) || Number(productPrice) < 1) {
      setError('أدخل سعراً صحيحاً بالليرة السورية.')
      return
    }
    if (!Number.isSafeInteger(Number(productStock)) || Number(productStock) < 0) {
      setError('أدخل كمية صحيحة للمخزون.')
      return
    }
    const validImageTypes: Record<string, string> = { 'image/jpeg': 'jpg', 'image/png': 'png', 'image/webp': 'webp' }
    if (productImage && (!validImageTypes[productImage.type] || productImage.size > 5 * 1024 * 1024)) {
      setError('الصورة يجب أن تكون JPG أو PNG أو WebP وبحجم لا يتجاوز 5 ميغابايت.')
      return
    }
    void perform(async () => {
      const { data: created, error: insertError } = await supabase!.from('products').insert({
        store_id: store.id,
        category_id: productCategory || null,
        name: productName.trim(),
        description: productDescription.trim(),
        price_syp: Number(productPrice),
        stock_count: Number(productStock),
        is_active: false,
      }).select('id').single()
      if (insertError) throw insertError
      if (productImage) {
        const path = `${store.id}/${created.id}/${crypto.randomUUID()}.${validImageTypes[productImage.type]}`
        const { error: uploadError } = await supabase!.storage.from('product-images').upload(path, productImage, {
          contentType: productImage.type,
          upsert: false,
        })
        if (uploadError) {
          await supabase!.from('products').delete().eq('id', created.id)
          throw uploadError
        }
        const { error: imageError } = await supabase!.from('product_images').insert({
          product_id: created.id,
          storage_path: path,
          alt_text: productName.trim(),
        })
        if (imageError) {
          await supabase!.storage.from('product-images').remove([path])
          await supabase!.from('products').delete().eq('id', created.id)
          throw imageError
        }
      }
      setProductName('')
      setProductDescription('')
      setProductPrice('')
      setProductStock('')
      setProductImage(null)
    }, 'تمت إضافة المنتج كمسودة. فعّله بعد مراجعته.')
  }

  const saveDeliveryZone = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!store) return
    void perform(async () => {
      const { error: zoneError } = await supabase!.from('store_delivery_zones').upsert({
        store_id: store.id, city_id: zoneCity, fee_syp: Number(zoneFee), is_active: true,
      })
      if (zoneError) throw zoneError
    }, 'تم حفظ منطقة التوصيل ورسمها الذي حددته.')
  }

  const changeOrderStatus = (orderId: string, nextStatus: MarketplaceOrderStatus) => {
    void perform(async () => {
      const { error: statusError } = await supabase!.rpc('update_store_order_status', {
        p_store_order_id: orderId,
        p_new_status: nextStatus,
      })
      if (statusError) throw statusError
    }, 'تم تحديث حالة الطلب.')
  }

  const approveStore = (storeId: string) => {
    void perform(async () => {
      const { error: approvalError } = await supabase!.rpc('approve_store', { p_store_id: storeId })
      if (approvalError) throw approvalError
    }, 'تم تفعيل المتجر ومنح صاحبه دور البائع.')
  }

  const signOut = async () => {
    const { error: signOutError } = await supabase!.auth.signOut()
    if (signOutError) setError(signOutError.message)
    else onClose()
  }

  return (
    <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="dialog account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <div className="dialog-heading">
          <div><span className="eyebrow">حساب شامنا</span><h2 id="account-title">أهلاً {displayName || session.user.email}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق">×</button>
        </div>
        <div className="role-badges">{roles.map((role) => <span key={role}>{role === 'admin' ? 'إدارة' : role === 'seller' ? 'بائع' : 'زبون'}</span>)}</div>
        <div className="account-content">
          <form className="form-stack profile-form" onSubmit={saveProfile}>
            <h3>بيانات التواصل</h3>
            <label>الاسم<input required minLength={2} maxLength={100} value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>
            <label>رقم الهاتف<input inputMode="tel" maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} /></label>
            <button className="secondary-submit" disabled={busy}>حفظ البيانات</button>
          </form>

          {!store && !isAdmin && <section className="account-section">
            <h3>عندك متجر؟</h3>
            <p className="muted-copy">قدّم طلباً لمراجعته. لن يتم تفعيل المتجر أو صلاحية البائع تلقائياً.</p>
            <form className="form-stack" onSubmit={requestStore}>
              <label>اسم المتجر<input required minLength={2} maxLength={100} value={storeName} onChange={(event) => setStoreName(event.target.value)} /></label>
              <label>منطقة المتجر<select required value={cityId} onChange={(event) => setCityId(event.target.value)}>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
              <label>نبذة عن المتجر<textarea maxLength={2000} value={storeDescription} onChange={(event) => setStoreDescription(event.target.value)} /></label>
              <button className="form-submit" disabled={busy || cities.length === 0}>إرسال طلب مراجعة</button>
            </form>
          </section>}

          {store?.status === 'pending' && <div className="setup-note"><b>{store.name}</b> — طلب متجرك قيد المراجعة. لا يمكنك إضافة منتجات قبل التفعيل.</div>}
          {store && (store.status === 'rejected' || store.status === 'suspended') && <div className="setup-note">حالة المتجر: {store.status === 'rejected' ? 'مرفوض' : 'موقوف'}. تواصل مع الإدارة لمعرفة التفاصيل.</div>}

          {store?.status === 'active' && isSeller && <>
            <section className="account-section">
              <h3>منطقة التوصيل</h3>
              <p className="muted-copy">حدد المدن ورسوم التوصيل التي يقبلها متجرك. الطلب لا يتاح لمنطقة بلا إعداد.</p>
              <form className="inline-form" onSubmit={saveDeliveryZone}>
                <select required value={zoneCity} onChange={(event) => setZoneCity(event.target.value)}>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select>
                <input required type="number" min="0" step="1" inputMode="numeric" placeholder="رسم التوصيل ل.س" value={zoneFee} onChange={(event) => setZoneFee(event.target.value)} />
                <button className="secondary-submit" disabled={busy}>حفظ</button>
              </form>
            </section>
            <section className="account-section">
              <h3>إضافة منتج</h3>
              <form className="form-stack" onSubmit={addProduct}>
                <label>اسم المنتج<input required minLength={2} maxLength={160} value={productName} onChange={(event) => setProductName(event.target.value)} /></label>
                <label>الفئة<select value={productCategory} onChange={(event) => setProductCategory(event.target.value)}><option value="">بدون فئة</option>{categories.map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>الوصف<textarea maxLength={5000} value={productDescription} onChange={(event) => setProductDescription(event.target.value)} /></label>
                <div className="inline-form"><label>السعر بالليرة<input required type="number" min="1" step="1" inputMode="numeric" value={productPrice} onChange={(event) => setProductPrice(event.target.value)} /></label><label>الكمية<input required type="number" min="0" step="1" inputMode="numeric" value={productStock} onChange={(event) => setProductStock(event.target.value)} /></label></div>
                <label>صورة المنتج <small>(JPG أو PNG أو WebP، حتى 5 ميغابايت)</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProductImage(event.target.files?.[0] ?? null)} /></label>
                <button className="form-submit" disabled={busy}>حفظ كمسودة</button>
              </form>
              <div className="managed-list">{products.map((product) => <div className="managed-row" key={product.id}><span>{product.name}<small>{formatPrice(product.price_syp)} · المخزون {product.stock_count}</small></span><button className="text-button" onClick={() => void perform(async () => {
                const { error: updateError } = await supabase!.from('products').update({ is_active: !product.is_active }).eq('id', product.id)
                if (updateError) throw updateError
              }, product.is_active ? 'تم إيقاف المنتج.' : 'تم تفعيل المنتج.')}>{product.is_active ? 'إيقاف' : 'تفعيل'}</button><button className="danger-button" onClick={() => void perform(async () => {
                const { error: deleteError } = await supabase!.from('products').delete().eq('id', product.id)
                if (deleteError) throw deleteError
              }, 'تم حذف المنتج.')}>حذف</button></div>)}</div>
            </section>
            <section className="account-section"><h3>طلبات متجرك</h3>{sellerOrders.length ? sellerOrders.map((order) => <div className="managed-row order-row" key={order.id}><span>{statusLabels[order.status]}<small>{(order.order_items ?? []).map((item) => `${item.product_name_snapshot} × ${item.quantity}`).join('، ')}</small></span><b>{formatPrice(order.total_syp)}</b><div className="status-actions">{(transitions[order.status] ?? []).map((next) => <button className="text-button" key={next} disabled={busy} onClick={() => changeOrderStatus(order.id, next)}>{statusLabels[next]}</button>)}</div></div>) : <p className="muted-copy">لا توجد طلبات لهذا المتجر حالياً.</p>}</section>
          </>}

          {isAdmin && <section className="account-section">
            <h3>طلبات تفعيل المتاجر ({pendingStores.length})</h3>
            {pendingStores.length ? pendingStores.map((pending) => <div className="managed-row" key={pending.id}><span>{pending.name}<small>{pending.cities?.name ?? 'منطقة غير معروفة'} · صاحب المتجر {pending.owner_id.slice(0, 8)}…</small></span><button className="secondary-submit" disabled={busy} onClick={() => approveStore(pending.id)}>موافقة وتفعيل</button></div>) : <p className="muted-copy">لا توجد طلبات معلّقة.</p>}
          </section>}

          {isAdmin && <section className="account-section">
            <h3>مراجعة المنتجات ({adminProducts.length})</h3>
            {adminProducts.length ? adminProducts.map((product) => <div className="managed-row" key={product.id}><span>{product.name}<small>{product.stores?.name ?? 'متجر غير معروف'} · {formatPrice(product.price_syp)} · مخزون {product.stock_count}</small></span><button className="text-button" disabled={busy} onClick={() => void perform(async () => {
              const { error: updateError } = await supabase!.from('products').update({ is_active: !product.is_active }).eq('id', product.id)
              if (updateError) throw updateError
            }, product.is_active ? 'تم إيقاف المنتج.' : 'تم تفعيل المنتج.')}>{product.is_active ? 'إيقاف' : 'تفعيل'}</button></div>) : <p className="muted-copy">لا توجد منتجات.</p>}
          </section>}

          {isAdmin && <section className="account-section">
            <h3>متابعة الطلبات ({adminOrders.length})</h3>
            {adminOrders.length ? adminOrders.map((order) => <div className="managed-row order-row" key={order.id}><span>{statusLabels[order.status]}<small>{order.id.slice(0, 8)}… · {(order.store_orders ?? []).map((storeOrder) => `${storeOrder.stores?.name ?? 'متجر'}: ${statusLabels[storeOrder.status]}`).join('، ')}</small></span><b>{formatPrice(order.total_syp)}</b><div className="status-actions">{(order.store_orders ?? []).flatMap((storeOrder) => (transitions[storeOrder.status] ?? []).map((next) => <button className="text-button" key={`${storeOrder.id}-${next}`} disabled={busy} onClick={() => changeOrderStatus(storeOrder.id, next)}>{storeOrder.stores?.name ?? 'متجر'}: {statusLabels[next]}</button>))}</div></div>) : <p className="muted-copy">لا توجد طلبات.</p>}
          </section>}

          <section className="account-section"><h3>طلباتي</h3>{customerOrders.length ? customerOrders.map((order) => <div className="managed-row" key={order.id}><span>{statusLabels[order.status]}<small>رقم الطلب {order.id.slice(0, 8)}…</small></span><b>{formatPrice(order.total_syp)}</b></div>) : <p className="muted-copy">لا توجد طلبات بعد.</p>}</section>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="signout-button" onClick={() => void signOut()}>تسجيل الخروج</button>
      </section>
    </div>
  )
}
