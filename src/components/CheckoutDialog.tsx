import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { AuthSession as Session } from '@supabase/supabase-js'
import type { Product } from '../lib/models'
import { supabase } from '../lib/supabase'

type CheckoutDialogProps = {
  session: Session | null
  cart: Product[]
  onClose: () => void
  onRequireAuth: () => void
  onCompleted: () => void
}

type CityOption = { id: string; name: string }
type SavedAddress = { id: string; city_id: string; recipient_name: string; phone: string; address_line: string; delivery_notes: string }

export function CheckoutDialog({ session, cart, onClose, onRequireAuth, onCompleted }: CheckoutDialogProps) {
  const [cities, setCities] = useState<CityOption[]>([])
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([])
  const [addressId, setAddressId] = useState('new')
  const [cityId, setCityId] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [phone, setPhone] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const subtotal = useMemo(() => cart.reduce((sum, product) => sum + product.price, 0), [cart])
  const selectedAddress = savedAddresses.find((address) => address.id === addressId)
  const sessionUserId = session?.user.id

  useEffect(() => {
    if (!supabase) return
    let active = true
    void Promise.all([
      supabase.from('cities').select('id,name').eq('is_active', true).order('name'),
      sessionUserId
        ? supabase.from('addresses').select('id,city_id,recipient_name,phone,address_line,delivery_notes').eq('user_id', sessionUserId).order('created_at', { ascending: false })
        : Promise.resolve({ data: [], error: null }),
    ]).then(([cityResult, addressResult]) => {
      if (!active) return
      if (cityResult.error) throw cityResult.error
      if (addressResult.error) throw addressResult.error
      const options = (cityResult.data ?? []) as CityOption[]
      const addresses = (addressResult.data ?? []) as SavedAddress[]
      setCities(options)
      setCityId((current) => current || options[0]?.id || '')
      setSavedAddresses(addresses)
      if (addresses.length) setAddressId(addresses[0]!.id)
    }).catch(() => {
      if (active) setError('تعذر تحميل مناطق التوصيل أو العناوين المحفوظة. حاول إعادة فتح نافذة الطلب.')
    })
    return () => { active = false }
  }, [sessionUserId])

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!supabase || !session) {
      setError('سجّل دخولك أولاً قبل إرسال الطلب.')
      return
    }
    if (cart.some((product) => product.isDemo || !product.id)) {
      setError('السلة تحتوي أمثلة تجريبية. الطلب متاح بعد ربط المنتجات الحقيقية.')
      return
    }

    setBusy(true)
    try {
      const counts = new Map<string, number>()
      cart.forEach((product) => counts.set(product.id, (counts.get(product.id) ?? 0) + 1))
      let selectedAddressId = addressId
      if (addressId === 'new') {
        const { data: address, error: addressError } = await supabase
          .from('addresses')
          .insert({
            user_id: session.user.id,
            city_id: cityId,
            recipient_name: recipientName.trim(),
            phone: phone.trim(),
            address_line: addressLine.trim(),
            delivery_notes: deliveryNotes.trim(),
          })
          .select('id')
          .single()
        if (addressError) throw addressError
        selectedAddressId = address.id
      }

      const items = Array.from(counts, ([product_id, quantity]) => ({ product_id, quantity }))
      const { error: orderError } = await supabase.rpc('place_order', {
        p_items: items,
        p_address_id: selectedAddressId,
      })
      if (orderError) throw orderError
      onCompleted()
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إنشاء الطلب. تحقق من توفر التوصيل وحاول مجدداً.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="dialog checkout-dialog" role="dialog" aria-modal="true" aria-labelledby="checkout-title">
        <div className="dialog-heading">
          <div><span className="eyebrow">الدفع عند الاستلام</span><h2 id="checkout-title">عنوان التوصيل</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق">×</button>
        </div>
        {!session && <div className="setup-note">لازم تسجّل دخولك لإتمام الطلب.<button className="text-button" onClick={onRequireAuth}>تسجيل الدخول</button></div>}
        {!supabase && <div className="setup-note">إتمام الطلب غير مفعّل في النسخة التجريبية، ولم تُرسل أي بيانات.</div>}
        {supabase && session && <form className="form-stack" onSubmit={submit}>
          {savedAddresses.length > 0 && <label>عنوان محفوظ<select value={addressId} onChange={(event) => setAddressId(event.target.value)}><option value="new">استخدام عنوان جديد</option>{savedAddresses.map((address) => <option value={address.id} key={address.id}>{address.recipient_name} · {address.address_line}</option>)}</select></label>}
          {selectedAddress ? <div className="setup-note">{selectedAddress.recipient_name} · {selectedAddress.phone}<br />{selectedAddress.address_line} · {cities.find((city) => city.id === selectedAddress.city_id)?.name ?? 'منطقة محفوظة'}{selectedAddress.delivery_notes ? <><br />{selectedAddress.delivery_notes}</> : null}</div> : <>
            <label>الاسم<input required minLength={2} maxLength={100} value={recipientName} onChange={(event) => setRecipientName(event.target.value)} autoComplete="name" /></label>
            <label>رقم للتواصل<input required minLength={7} maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" /></label>
            <label>المنطقة<select required value={cityId} onChange={(event) => setCityId(event.target.value)}>{cities.map((city) => <option value={city.id} key={city.id}>{city.name}</option>)}</select></label>
            <label>العنوان بالتفصيل<input required minLength={3} maxLength={500} value={addressLine} onChange={(event) => setAddressLine(event.target.value)} autoComplete="street-address" /></label>
            <label>ملاحظات للتوصيل <small>(اختياري)</small><textarea maxLength={1000} value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} /></label>
          </>}
          <div className="checkout-summary"><span>المجموع قبل التوصيل</span><b>{new Intl.NumberFormat('ar-SY').format(subtotal)} ل.س</b><small>يُعاد التحقق من الأسعار والمخزون والتوصيل داخل قاعدة البيانات عند الإرسال.</small></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="form-submit" disabled={busy || (addressId === 'new' && !cityId) || cart.length === 0}>{busy ? 'جارٍ تأكيد الطلب…' : 'تأكيد الطلب عند الاستلام'}</button>
        </form>}
      </section>
    </div>
  )
}
