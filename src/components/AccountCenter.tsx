import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthSession as Session } from '@supabase/supabase-js'
import type { AppRole, MarketplaceOrderStatus, StoreStatus } from '../lib/models'
import { userFacingError } from '../lib/user-facing-error'
import { supabase } from '../lib/supabase'
import { useAccessibleDialog } from '../hooks/useAccessibleDialog'

type AccountCenterProps = {
  session: Session
  roles: AppRole[]
  onClose: () => void
  notify: (message: string) => void
}

type City = { id: string; name: string; is_active: boolean }
type Category = { id: string; name: string; is_active: boolean }
type Store = { id: string; name: string; slug: string; status: StoreStatus; city_id: string }
type OwnedProduct = {
  id: string
  name: string
  description: string
  category_id: string | null
  price_syp: number
  stock_count: number
  is_active: boolean
}
type SellerOrder = { id: string; status: MarketplaceOrderStatus; total_syp: number; created_at: string; order_items?: { product_name_snapshot: string; quantity: number }[] }
type Relation<T> = T | T[] | null
type OrderStatusEvent = { id: string; old_status: MarketplaceOrderStatus | null; new_status: MarketplaceOrderStatus; created_at: string }
type CustomerStoreOrder = {
  id: string
  status: MarketplaceOrderStatus
  subtotal_syp: number
  delivery_fee_syp: number
  total_syp: number
  stores?: Relation<{ name: string }>
  order_items?: { product_name_snapshot: string; quantity: number; unit_price_syp: number; line_total_syp: number }[]
  order_status_history?: OrderStatusEvent[]
}
type CustomerOrder = { id: string; status: MarketplaceOrderStatus; total_syp: number; created_at: string; store_orders?: CustomerStoreOrder[] }
type PendingStore = { id: string; name: string; owner_id: string; city_id: string; cities?: Relation<{ name: string }> }
type AdminProduct = { id: string; name: string; price_syp: number; stock_count: number; is_active: boolean; stores?: Relation<{ name: string }> }
type AdminOrder = { id: string; status: MarketplaceOrderStatus; total_syp: number; created_at: string; store_orders?: { id: string; status: MarketplaceOrderStatus; stores?: Relation<{ name: string }> }[] }
type AuditEvent = { id: string; action: 'INSERT' | 'UPDATE' | 'DELETE'; entity_table: string; entity_id: string | null; created_at: string }

function relatedRecord<T>(relation: Relation<T> | undefined): T | undefined {
  return Array.isArray(relation) ? relation[0] : relation ?? undefined
}

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
const formatDateTime = (value: string) => new Intl.DateTimeFormat('ar-SY', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))

export function AccountCenter({ session, roles, onClose, notify }: AccountCenterProps) {
  const dialogRef = useAccessibleDialog<HTMLElement>(onClose)
  const [store, setStore] = useState<Store | null>(null)
  const [cities, setCities] = useState<City[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [products, setProducts] = useState<OwnedProduct[]>([])
  const [sellerOrders, setSellerOrders] = useState<SellerOrder[]>([])
  const [customerOrders, setCustomerOrders] = useState<CustomerOrder[]>([])
  const [pendingStores, setPendingStores] = useState<PendingStore[]>([])
  const [adminProducts, setAdminProducts] = useState<AdminProduct[]>([])
  const [adminOrders, setAdminOrders] = useState<AdminOrder[]>([])
  const [auditEvents, setAuditEvents] = useState<AuditEvent[]>([])
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
  const [editingProductId, setEditingProductId] = useState<string | null>(null)
  const [zoneCity, setZoneCity] = useState('')
  const [zoneFee, setZoneFee] = useState('')
  const [newCityName, setNewCityName] = useState('')
  const [newCityRegion, setNewCityRegion] = useState('ريف دمشق')
  const [newCategoryName, setNewCategoryName] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const isSeller = roles.includes('seller')
  const isAdmin = roles.includes('admin')

  const reload = useCallback(async () => {
    if (!supabase) return
    const [storeResult, citiesResult, categoriesResult, profileResult, customerOrdersResult] = await Promise.all([
      supabase.from('stores').select('id,name,slug,status,city_id').eq('owner_id', session.user.id).maybeSingle(),
      supabase.from('cities').select('id,name,is_active').order('name'),
      supabase.from('categories').select('id,name,is_active').order('sort_order'),
      supabase.from('profiles').select('display_name,phone').eq('id', session.user.id).maybeSingle(),
      supabase.from('orders').select('id,status,total_syp,created_at,store_orders(id,status,subtotal_syp,delivery_fee_syp,total_syp,stores(name),order_items(product_name_snapshot,quantity,unit_price_syp,line_total_syp),order_status_history(id,old_status,new_status,created_at))').eq('customer_id', session.user.id).order('created_at', { ascending: false }).limit(20),
    ])

    if (storeResult.error && storeResult.error.code !== 'PGRST116') setError(userFacingError(storeResult.error, 'تعذر تحميل بيانات المتجر.'))
    const ownStore = storeResult.data as Store | null
    setStore(ownStore)
    const allCities = (citiesResult.data ?? []) as City[]
    const availableCities = isAdmin ? allCities : allCities.filter((city) => city.is_active)
    setCities(availableCities)
    const allCategories = (categoriesResult.data ?? []) as Category[]
    setCategories(isAdmin ? allCategories : allCategories.filter((item) => item.is_active))
    setDisplayName(profileResult.data?.display_name ?? '')
    setPhone(profileResult.data?.phone ?? '')
    if (customerOrdersResult.error) setError(userFacingError(customerOrdersResult.error, 'تعذر تحميل سجل طلباتك.'))
    setCustomerOrders((customerOrdersResult.data ?? []) as CustomerOrder[])
    if (!cityId && availableCities.length) setCityId(availableCities[0].id)
    if (!zoneCity && availableCities.length) setZoneCity(availableCities[0].id)

    if (ownStore && isSeller) {
      const [productsResult, ordersResult] = await Promise.all([
        supabase.from('products').select('id,name,description,category_id,price_syp,stock_count,is_active').eq('store_id', ownStore.id).order('created_at', { ascending: false }),
        supabase.from('store_orders').select('id,status,total_syp,created_at,order_items(product_name_snapshot,quantity)').eq('store_id', ownStore.id).order('created_at', { ascending: false }).limit(30),
      ])
      if (productsResult.error) setError(userFacingError(productsResult.error, 'تعذر تحميل منتجات المتجر.'))
      if (ordersResult.error) setError(userFacingError(ordersResult.error, 'تعذر تحميل طلبات المتجر.'))
      setProducts((productsResult.data ?? []) as OwnedProduct[])
      setSellerOrders((ordersResult.data ?? []) as SellerOrder[])
    }

    if (isAdmin) {
      const [pendingResult, productsResult, ordersResult, auditResult] = await Promise.all([
        supabase.from('stores').select('id,name,owner_id,city_id,cities(name)').eq('status', 'pending').order('created_at'),
        supabase.from('products').select('id,name,price_syp,stock_count,is_active,stores(name)').order('created_at', { ascending: false }).limit(100),
        supabase.from('orders').select('id,status,total_syp,created_at,store_orders(id,status,stores(name))').order('created_at', { ascending: false }).limit(100),
        supabase.from('admin_audit_log').select('id,action,entity_table,entity_id,created_at').order('created_at', { ascending: false }).limit(30),
      ])
      if (pendingResult.error) setError(userFacingError(pendingResult.error, 'تعذر تحميل طلبات المتاجر.'))
      if (productsResult.error) setError(userFacingError(productsResult.error, 'تعذر تحميل المنتجات.'))
      if (ordersResult.error) setError(userFacingError(ordersResult.error, 'تعذر تحميل الطلبات.'))
      if (auditResult.error) setError('تعذر تحميل سجل التدقيق. تحقق من سياسة قراءة سجل الإدارة.')
      setPendingStores((pendingResult.data ?? []) as PendingStore[])
      setAdminProducts((productsResult.data ?? []) as AdminProduct[])
      setAdminOrders((ordersResult.data ?? []) as AdminOrder[])
      setAuditEvents((auditResult.data ?? []) as AuditEvent[])
    }
  }, [cityId, isAdmin, isSeller, session.user.id, zoneCity])

  useEffect(() => {
    const timer = window.setTimeout(() => { void reload() }, 0)
    return () => window.clearTimeout(timer)
  }, [reload])

  const perform = async (action: () => Promise<void>, successMessage: string) => {
    if (!supabase) return
    setBusy(true)
    setError('')
    try {
      await action()
      await reload()
      notify(successMessage)
    } catch (cause) {
      setError(userFacingError(cause, 'تعذر إكمال العملية. تحقق من الاتصال وصلاحية الحساب ثم حاول مجددًا.'))
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
      const productValues = {
        category_id: productCategory || null,
        name: productName.trim(),
        description: productDescription.trim(),
        price_syp: Number(productPrice),
        stock_count: Number(productStock),
      }
      let productId: string
      if (editingProductId) {
        productId = editingProductId
        const { data: updated, error: updateError } = await supabase!.from('products')
          .update(productValues)
          .eq('id', editingProductId)
          .eq('store_id', store.id)
          .select('id')
          .maybeSingle()
        if (updateError) throw updateError
        if (!updated) throw new Error('لم يتم تعديل المنتج. تحقق من صلاحية متجرك ثم أعد المحاولة.')
      } else {
        const { data: created, error: insertError } = await supabase!.from('products').insert({
          store_id: store.id,
          ...productValues,
          is_active: false,
        }).select('id').single()
        if (insertError) throw insertError
        productId = created.id
      }
      if (productImage) {
        const path = `${store.id}/${productId}/${crypto.randomUUID()}.${validImageTypes[productImage.type]}`
        const { error: uploadError } = await supabase!.storage.from('product-images').upload(path, productImage, {
          contentType: productImage.type,
          upsert: false,
        })
        if (uploadError) {
          if (!editingProductId) await supabase!.from('products').delete().eq('id', productId)
          throw uploadError
        }
        let previousImage: { id: string; storage_path: string } | null = null
        if (editingProductId) {
          const { data: image, error: findImageError } = await supabase!.from('product_images')
            .select('id,storage_path')
            .eq('product_id', productId)
            .order('sort_order')
            .limit(1)
            .maybeSingle()
          if (findImageError) {
            await supabase!.storage.from('product-images').remove([path])
            throw findImageError
          }
          previousImage = image
        }
        const imageMutation = previousImage
          ? await supabase!.from('product_images').update({ storage_path: path, alt_text: productName.trim() }).eq('id', previousImage.id).eq('product_id', productId)
          : await supabase!.from('product_images').insert({ product_id: productId, storage_path: path, alt_text: productName.trim() })
        const imageError = imageMutation.error
        if (imageError) {
          await supabase!.storage.from('product-images').remove([path])
          if (!editingProductId) await supabase!.from('products').delete().eq('id', productId)
          throw imageError
        }
        if (previousImage) await supabase!.storage.from('product-images').remove([previousImage.storage_path])
      }
      setProductName('')
      setProductDescription('')
      setProductPrice('')
      setProductStock('')
      setProductCategory('')
      setProductImage(null)
      setEditingProductId(null)
    }, editingProductId ? 'تم حفظ تعديلات المنتج.' : 'تمت إضافة المنتج كمسودة. فعّله بعد مراجعته.')
  }

  const editProduct = (product: OwnedProduct) => {
    setEditingProductId(product.id)
    setProductName(product.name)
    setProductDescription(product.description)
    setProductPrice(String(product.price_syp))
    setProductStock(String(product.stock_count))
    setProductCategory(product.category_id ?? '')
    setProductImage(null)
    setError('')
  }

  const cancelProductEdit = () => {
    setEditingProductId(null)
    setProductName('')
    setProductDescription('')
    setProductPrice('')
    setProductStock('')
    setProductCategory('')
    setProductImage(null)
    setError('')
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

  const addCity = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = newCityName.trim()
    if (!name) return
    void perform(async () => {
      const { error: insertError } = await supabase!.from('cities').insert({
        name,
        slug: `city-${crypto.randomUUID().slice(0, 8)}`,
        region_name: newCityRegion.trim(),
      })
      if (insertError) throw insertError
      setNewCityName('')
    }, 'تمت إضافة المنطقة.')
  }

  const addCategory = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const name = newCategoryName.trim()
    if (!name) return
    void perform(async () => {
      const { error: insertError } = await supabase!.from('categories').insert({
        name,
        slug: `category-${crypto.randomUUID().slice(0, 8)}`,
      })
      if (insertError) throw insertError
      setNewCategoryName('')
    }, 'تمت إضافة الفئة.')
  }

  const setCityActive = (city: City) => {
    void perform(async () => {
      const { error: updateError } = await supabase!.from('cities').update({ is_active: !city.is_active }).eq('id', city.id)
      if (updateError) throw updateError
    }, city.is_active ? 'تم إيقاف المنطقة عن العرض.' : 'تم تفعيل المنطقة.')
  }

  const setCategoryActive = (category: Category) => {
    void perform(async () => {
      const { error: updateError } = await supabase!.from('categories').update({ is_active: !category.is_active }).eq('id', category.id)
      if (updateError) throw updateError
    }, category.is_active ? 'تم إيقاف الفئة عن العرض.' : 'تم تفعيل الفئة.')
  }

  const signOut = async () => {
    const { error: signOutError } = await supabase!.auth.signOut()
    if (signOutError) setError(userFacingError(signOutError, 'تعذر تسجيل الخروج. حاول مجددًا.'))
    else onClose()
  }

  return (
    <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section ref={dialogRef} tabIndex={-1} className="dialog account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
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
              <label>منطقة المتجر<select required value={cityId} onChange={(event) => setCityId(event.target.value)}>{cities.filter((city) => city.is_active).map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
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
                <select required value={zoneCity} onChange={(event) => setZoneCity(event.target.value)}>{cities.filter((city) => city.is_active).map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select>
                <input required type="number" min="0" step="1" inputMode="numeric" placeholder="رسم التوصيل ل.س" value={zoneFee} onChange={(event) => setZoneFee(event.target.value)} />
                <button className="secondary-submit" disabled={busy}>حفظ</button>
              </form>
            </section>
            <section className="account-section">
              <h3>{editingProductId ? 'تعديل المنتج' : 'إضافة منتج'}</h3>
              <form className="form-stack" onSubmit={addProduct}>
                <label>اسم المنتج<input required minLength={2} maxLength={160} value={productName} onChange={(event) => setProductName(event.target.value)} /></label>
                <label>الفئة<select value={productCategory} onChange={(event) => setProductCategory(event.target.value)}><option value="">بدون فئة</option>{categories.filter((item) => item.is_active).map((item) => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
                <label>الوصف<textarea maxLength={5000} value={productDescription} onChange={(event) => setProductDescription(event.target.value)} /></label>
                <div className="inline-form"><label>السعر بالليرة<input required type="number" min="1" step="1" inputMode="numeric" value={productPrice} onChange={(event) => setProductPrice(event.target.value)} /></label><label>الكمية<input required type="number" min="0" step="1" inputMode="numeric" value={productStock} onChange={(event) => setProductStock(event.target.value)} /></label></div>
                <label>صورة المنتج <small>(JPG أو PNG أو WebP، حتى 5 ميغابايت){editingProductId ? '؛ اتركها فارغة للإبقاء على الصورة الحالية' : ''}</small><input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => setProductImage(event.target.files?.[0] ?? null)} /></label>
                <div className="inline-form"><button className="form-submit" disabled={busy}>{editingProductId ? 'حفظ التعديلات' : 'حفظ كمسودة'}</button>{editingProductId && <button className="secondary-submit" type="button" disabled={busy} onClick={cancelProductEdit}>إلغاء التعديل</button>}</div>
              </form>
              <div className="managed-list">{products.map((product) => <div className="managed-row" key={product.id}><span>{product.name}<small>{formatPrice(product.price_syp)} · المخزون {product.stock_count}</small></span><button className="text-button" disabled={busy} onClick={() => editProduct(product)}>تعديل</button><button className="text-button" disabled={busy} onClick={() => void perform(async () => {
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
            {pendingStores.length ? pendingStores.map((pending) => <div className="managed-row" key={pending.id}><span>{pending.name}<small>{relatedRecord(pending.cities)?.name ?? 'منطقة غير معروفة'} · صاحب المتجر {pending.owner_id.slice(0, 8)}…</small></span><button className="secondary-submit" disabled={busy} onClick={() => approveStore(pending.id)}>موافقة وتفعيل</button></div>) : <p className="muted-copy">لا توجد طلبات معلّقة.</p>}
          </section>}

          {isAdmin && <section className="account-section">
            <h3>إدارة المناطق والفئات</h3>
            <form className="inline-form" onSubmit={addCity}>
              <label>إضافة منطقة<input required maxLength={100} value={newCityName} onChange={(event) => setNewCityName(event.target.value)} /></label>
              <label>المحافظة<input required maxLength={100} value={newCityRegion} onChange={(event) => setNewCityRegion(event.target.value)} /></label>
              <button className="secondary-submit" disabled={busy}>إضافة</button>
            </form>
            <div className="managed-list">{cities.map((city) => <div className="managed-row" key={city.id}><span>{city.name}<small>{city.is_active ? 'معروضة للزبائن' : 'متوقفة مؤقتًا'}</small></span><button className="text-button" disabled={busy} onClick={() => setCityActive(city)}>{city.is_active ? 'إيقاف العرض' : 'تفعيل'}</button></div>)}</div>
            <form className="inline-form" onSubmit={addCategory}>
              <label>إضافة فئة<input required maxLength={100} value={newCategoryName} onChange={(event) => setNewCategoryName(event.target.value)} /></label>
              <button className="secondary-submit" disabled={busy}>إضافة</button>
            </form>
            <div className="managed-list">{categories.map((category) => <div className="managed-row" key={category.id}><span>{category.name}<small>{category.is_active ? 'معروضة للزبائن' : 'متوقفة مؤقتًا'}</small></span><button className="text-button" disabled={busy} onClick={() => setCategoryActive(category)}>{category.is_active ? 'إيقاف العرض' : 'تفعيل'}</button></div>)}</div>
          </section>}

          {isAdmin && <section className="account-section">
            <h3>مراجعة المنتجات ({adminProducts.length})</h3>
            {adminProducts.length ? adminProducts.map((product) => <div className="managed-row" key={product.id}><span>{product.name}<small>{relatedRecord(product.stores)?.name ?? 'متجر غير معروف'} · {formatPrice(product.price_syp)} · مخزون {product.stock_count}</small></span><button className="text-button" disabled={busy} onClick={() => void perform(async () => {
              const { error: updateError } = await supabase!.from('products').update({ is_active: !product.is_active }).eq('id', product.id)
              if (updateError) throw updateError
            }, product.is_active ? 'تم إيقاف المنتج.' : 'تم تفعيل المنتج.')}>{product.is_active ? 'إيقاف' : 'تفعيل'}</button></div>) : <p className="muted-copy">لا توجد منتجات.</p>}
          </section>}

          {isAdmin && <section className="account-section">
            <h3>متابعة الطلبات ({adminOrders.length})</h3>
            {adminOrders.length ? adminOrders.map((order) => <div className="managed-row order-row" key={order.id}><span>{statusLabels[order.status]}<small>{order.id.slice(0, 8)}… · {(order.store_orders ?? []).map((storeOrder) => `${relatedRecord(storeOrder.stores)?.name ?? 'متجر'}: ${statusLabels[storeOrder.status]}`).join('، ')}</small></span><b>{formatPrice(order.total_syp)}</b><div className="status-actions">{(order.store_orders ?? []).flatMap((storeOrder) => (transitions[storeOrder.status] ?? []).map((next) => <button className="text-button" key={`${storeOrder.id}-${next}`} disabled={busy} onClick={() => changeOrderStatus(storeOrder.id, next)}>{relatedRecord(storeOrder.stores)?.name ?? 'متجر'}: {statusLabels[next]}</button>))}</div></div>) : <p className="muted-copy">لا توجد طلبات.</p>}
          </section>}

          {isAdmin && <section className="account-section">
            <h3>سجل التغييرات الإدارية</h3>
            {auditEvents.length ? auditEvents.map((event) => <div className="managed-row" key={event.id}>
              <span>{event.action === 'INSERT' ? 'إضافة' : event.action === 'UPDATE' ? 'تعديل' : 'حذف'} · {event.entity_table}<small>{event.entity_id ? `${event.entity_id.slice(0, 8)}… · ` : ''}{new Intl.DateTimeFormat('ar-SY', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(event.created_at))}</small></span>
            </div>) : <p className="muted-copy">لا توجد تغييرات مسجلة حتى الآن.</p>}
          </section>}

          <section className="account-section customer-orders-section">
            <h3>طلباتي</h3>
            {customerOrders.length ? customerOrders.map((order) => <article className="customer-order" key={order.id}>
              <div className="customer-order-summary">
                <span><b>{statusLabels[order.status]}</b><small>طلب رقم {order.id.slice(0, 8)}… · {formatDateTime(order.created_at)}</small></span>
                <strong>{formatPrice(order.total_syp)}</strong>
              </div>
              <details className="customer-order-details">
                <summary>تفاصيل الطلب وتتبع الحالة</summary>
                <div className="customer-order-stores">
                  {(order.store_orders ?? []).map((storeOrder) => {
                    const events = [...(storeOrder.order_status_history ?? [])].sort((left, right) => left.created_at.localeCompare(right.created_at))
                    return <section className="customer-store-order" key={storeOrder.id}>
                      <div className="customer-store-heading"><b>{relatedRecord(storeOrder.stores)?.name ?? 'متجر'}</b><span>{statusLabels[storeOrder.status]}</span></div>
                      <ul className="customer-order-items">{(storeOrder.order_items ?? []).map((item, index) => <li key={`${storeOrder.id}-${index}`}><span>{item.product_name_snapshot} × {item.quantity}</span><b>{formatPrice(item.line_total_syp)}</b></li>)}</ul>
                      <div className="customer-order-costs"><span>المجموع الفرعي <b>{formatPrice(storeOrder.subtotal_syp)}</b></span><span>التوصيل <b>{formatPrice(storeOrder.delivery_fee_syp)}</b></span></div>
                      <h4>سجل الحالة</h4>
                      {events.length ? <ol className="order-timeline">{events.map((event) => <li key={event.id}><span className="timeline-dot" /><div><b>{statusLabels[event.new_status]}</b><time dateTime={event.created_at}>{formatDateTime(event.created_at)}</time></div></li>)}</ol> : <p className="muted-copy">لا يوجد تحديث حالة إضافي لهذا المتجر بعد.</p>}
                    </section>
                  })}
                  {!order.store_orders?.length && <p className="muted-copy">تفاصيل المتاجر لهذا الطلب غير متاحة حاليًا.</p>}
                </div>
              </details>
            </article>) : <p className="muted-copy">لا توجد طلبات بعد.</p>}
          </section>
        </div>
        {error && <p className="form-error" role="alert">{error}</p>}
        <button className="signout-button" onClick={() => void signOut()}>تسجيل الخروج</button>
      </section>
    </div>
  )
}
