import { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import type { Session } from '@supabase/supabase-js'
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

export function CheckoutDialog({ session, cart, onClose, onRequireAuth, onCompleted }: CheckoutDialogProps) {
  const [cities, setCities] = useState<CityOption[]>([])
  const [cityId, setCityId] = useState('')
  const [recipientName, setRecipientName] = useState('')
  const [phone, setPhone] = useState('')
  const [addressLine, setAddressLine] = useState('')
  const [deliveryNotes, setDeliveryNotes] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  const subtotal = useMemo(() => cart.reduce((sum, product) => sum + product.price, 0), [cart])

  useEffect(() => {
    if (!supabase) return
    void supabase.from('cities').select('id,name').eq('is_active', true).order('name').then(({ data }) => {
      const options = (data ?? []) as CityOption[]
      setCities(options)
      setCityId((current) => current || options[0]?.id || '')
    })
  }, [])

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

      const items = Array.from(counts, ([product_id, quantity]) => ({ product_id, quantity }))
      const { error: orderError } = await supabase.rpc('place_order', {
        p_items: items,
        p_address_id: address.id,
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
          <label>الاسم<input required minLength={2} maxLength={100} value={recipientName} onChange={(event) => setRecipientName(event.target.value)} autoComplete="name" /></label>
          <label>رقم للتواصل<input required minLength={7} maxLength={30} value={phone} onChange={(event) => setPhone(event.target.value)} inputMode="tel" autoComplete="tel" /></label>
          <label>المنطقة<select required value={cityId} onChange={(event) => setCityId(event.target.value)}>{cities.map((city) => <option value={city.id} key={city.id}>{city.name}</option>)}</select></label>
          <label>العنوان بالتفصيل<input required minLength={3} maxLength={500} value={addressLine} onChange={(event) => setAddressLine(event.target.value)} autoComplete="street-address" /></label>
          <label>ملاحظات للتوصيل <small>(اختياري)</small><textarea maxLength={1000} value={deliveryNotes} onChange={(event) => setDeliveryNotes(event.target.value)} /></label>
          <div className="checkout-summary"><span>المجموع قبل التوصيل</span><b>{new Intl.NumberFormat('ar-SY').format(subtotal)} ل.س</b><small>يُعاد التحقق من الأسعار والمخزون والتوصيل داخل قاعدة البيانات عند الإرسال.</small></div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="form-submit" disabled={busy || !cityId || cart.length === 0}>{busy ? 'جارٍ تأكيد الطلب…' : 'تأكيد الطلب عند الاستلام'}</button>
        </form>}
      </section>
    </div>
  )
}
