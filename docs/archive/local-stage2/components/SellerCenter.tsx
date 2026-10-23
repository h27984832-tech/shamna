import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type City = { id: string; name: string }
type StoreApplication = { id: string; name: string; status: 'pending' | 'approved' | 'suspended'; created_at: string }
type SellerCenterProps = { user: User | null; onSignIn: () => void }

function requestErrorMessage(message: string) {
  const normalized = message.toLowerCase()
  if (normalized.includes('permission') || normalized.includes('row-level security') || normalized.includes('rls')) {
    return 'رفضت قاعدة البيانات الطلب وفق سياسات الأمان. تأكد أن migration المرحلة الثانية راجعتها وطبقتها على بيئة التطوير.'
  }
  if (normalized.includes('fetch') || normalized.includes('network')) return 'تعذر الاتصال بخدمة المتاجر. تحقق من الإنترنت وإعدادات Supabase.'
  return 'تعذر تحميل بيانات المتاجر. قد لا يكون مخطط المرحلة الثانية مطبقًا على بيئة Supabase المتصلة.'
}

const statusLabels: Record<StoreApplication['status'], string> = {
  pending: 'قيد المراجعة',
  approved: 'تم اعتماد المتجر',
  suspended: 'موقوف — تواصل مع الإدارة',
}

export function SellerCenter({ user, onSignIn }: SellerCenterProps) {
  const [cities, setCities] = useState<City[]>([])
  const [stores, setStores] = useState<StoreApplication[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [cityId, setCityId] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [revision, setRevision] = useState(0)

  useEffect(() => {
    if (!supabase || !user) {
      setCities([])
      setStores([])
      setLoading(false)
      return
    }
    let active = true
    setLoading(true)
    setError('')
    void Promise.all([
      supabase.from('cities').select('id, name').eq('is_active', true).order('name'),
      supabase.from('stores').select('id, name, status, created_at').eq('owner_id', user.id).order('created_at', { ascending: false }),
    ]).then(([cityResult, storeResult]) => {
      if (!active) return
      if (cityResult.error || storeResult.error) {
        setError(requestErrorMessage(cityResult.error?.message ?? storeResult.error?.message ?? ''))
        return
      }
      const availableCities = cityResult.data ?? []
      setCities(availableCities)
      setCityId((current) => current || availableCities[0]?.id || '')
      setStores(storeResult.data ?? [])
    }).catch(() => {
      if (active) setError(requestErrorMessage('network'))
    }).finally(() => {
      if (active) setLoading(false)
    })
    return () => { active = false }
  }, [revision, user])

  const submitRequest = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || !user || submitting || !cityId) return
    setSubmitting(true)
    setError('')
    setNotice('')
    try {
      const { data, error: requestError } = await supabase.from('stores').insert({
        owner_id: user.id,
        city_id: cityId,
        name: name.trim(),
        description: description.trim(),
      }).select('id, name, status, created_at').single()
      if (requestError) throw requestError
      setStores((current) => [data, ...current])
      setName('')
      setDescription('')
      setNotice('وصل طلب إنشاء المتجر إلى قاعدة البيانات. لا يصبح المتجر ظاهرًا للزبائن قبل اعتماده.')
    } catch (requestError) {
      const message = requestError as { message?: string }
      setError(requestErrorMessage(message.message ?? ''))
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <section className="seller-center" id="seller" aria-labelledby="seller-center-title">
      <div className="seller-center-intro">
        <span className="eyebrow">أصحاب المتاجر</span>
        <h2 id="seller-center-title">خلّي حارتك تعرف شغلك.</h2>
        <p>قدّم بيانات متجرك للمراجعة. سيبقى المتجر مخفيًا عن الزبائن حتى توافق عليه الإدارة.</p>
        <span className="seller-mark" aria-hidden="true">✿</span>
      </div>
      <div className="seller-center-body">
        {!supabase ? <div className="seller-state"><h3>ربط Supabase غير مهيأ</h3><p>أضف إعدادات بيئة التطوير قبل إرسال طلب متجر.</p></div>
          : !user ? <div className="seller-state"><h3>سجّل دخولك للبدء</h3><p>يحتاج طلب المتجر إلى حساب موثق.</p><button className="primary-button" type="button" onClick={onSignIn}>تسجيل الدخول</button></div>
            : <>
              <div className="seller-form-heading"><h3>متجرك على شامنا</h3><button type="button" onClick={() => setRevision((value) => value + 1)} disabled={loading} aria-label="تحديث حالة المتاجر">تحديث</button></div>
              {loading && <p className="seller-inline-status" role="status">جارٍ تحميل حالة المتجر…</p>}
              {error && <p className="seller-inline-error" role="alert">{error}</p>}
              {notice && <p className="seller-inline-success" role="status">{notice}</p>}
              {stores.map((store) => <article className="seller-application" key={store.id}><div><strong>{store.name}</strong><small>طلب بتاريخ {new Date(store.created_at).toLocaleDateString('ar-SY')}</small></div><span className={`store-status status-${store.status}`}>{statusLabels[store.status]}</span></article>)}
              {stores.length > 0 ? <p className="seller-form-note">يوجد طلب أو متجر مرتبط بحسابك. لن ننشئ طلبًا مكررًا؛ انتظر مراجعة الإدارة أو تواصل معها بشأن الحالة الظاهرة.</p> : cities.length === 0 && !loading ? <p className="seller-inline-status">لا توجد مناطق مفعّلة في قاعدة البيانات بعد.</p> : <form className="seller-request-form" onSubmit={submitRequest}>
                <label>اسم المتجر<input value={name} onChange={(event) => setName(event.target.value)} required minLength={2} maxLength={120} /></label>
                <label>منطقة المتجر<select value={cityId} onChange={(event) => setCityId(event.target.value)} required>{cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}</select></label>
                <label>نبذة عن المتجر<textarea value={description} onChange={(event) => setDescription(event.target.value)} maxLength={2000} rows={3} /></label>
                <button className="primary-button" type="submit" disabled={submitting || loading}>{submitting ? 'جارٍ إرسال الطلب…' : 'إرسال طلب إنشاء متجر'}</button>
                <p className="seller-form-note">إرسال الطلب لا يمنحك صلاحية بائع تلقائيًا؛ الإدارة تراجع الطلب أولًا.</p>
              </form>}
            </>}
      </div>
    </section>
  )
}
