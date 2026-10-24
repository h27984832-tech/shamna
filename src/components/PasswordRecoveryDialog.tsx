import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type PasswordRecoveryDialogProps = { onClose: () => void }

export function PasswordRecoveryDialog({ onClose }: PasswordRecoveryDialogProps) {
  const [password, setPassword] = useState('')
  const [confirmation, setConfirmation] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [saved, setSaved] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    if (!supabase) {
      setError('تعذر الاتصال بخدمة الحسابات. أعد فتح رابط الاستعادة بعد التأكد من إعداد الموقع.')
      return
    }
    if (password !== confirmation) {
      setError('كلمتا المرور غير متطابقتين.')
      return
    }

    setBusy(true)
    try {
      const { error: updateError } = await supabase.auth.updateUser({ password })
      if (updateError) throw updateError
      setSaved(true)
    } catch (cause) {
      const reason = String((cause as { code?: string; message?: string }).code ?? (cause as { message?: string }).message ?? '').toLowerCase()
      if (reason.includes('expired') || reason.includes('invalid') || reason.includes('session')) {
        setError('رابط الاستعادة غير صالح أو انتهت صلاحيته. اطلب رابطًا جديدًا من صفحة تسجيل الدخول.')
      } else if (reason.includes('weak') || reason.includes('password') || reason.includes('length')) {
        setError('كلمة المرور لا تحقق شروط الأمان. استخدم كلمة مرور أطول وأقوى.')
      } else if (reason.includes('rate limit') || reason.includes('rate_limit')) {
        setError('وصلنا إلى حد المحاولات مؤقتًا. انتظر قليلًا ثم أعد المحاولة يدويًا.')
      } else {
        setError('تعذر تحديث كلمة المرور. تأكد من صلاحية رابط الاستعادة وحاول مجددًا.')
      }
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="recovery-title">
        <div className="dialog-heading">
          <div><span className="eyebrow">حساب شامنا</span><h2 id="recovery-title">تعيين كلمة مرور جديدة</h2></div>
          <button className="icon-button" type="button" onClick={onClose} aria-label="إغلاق">×</button>
        </div>
        {saved ? <>
          <p className="form-success" role="status">تم تحديث كلمة المرور. يمكنك الآن استخدام كلمة المرور الجديدة لتسجيل الدخول.</p>
          <button className="form-submit" type="button" onClick={onClose}>متابعة</button>
        </> : <form className="form-stack" onSubmit={(event) => { void submit(event) }}>
          <p className="muted-copy">اختر كلمة مرور جديدة لا تقل عن 8 أحرف.</p>
          <label>كلمة المرور الجديدة<input required type="password" minLength={8} autoComplete="new-password" dir="ltr" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          <label>تأكيد كلمة المرور<input required type="password" minLength={8} autoComplete="new-password" dir="ltr" value={confirmation} onChange={(event) => setConfirmation(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="form-submit" disabled={busy}>{busy ? 'جارٍ تحديث كلمة المرور…' : 'حفظ كلمة المرور الجديدة'}</button>
        </form>}
      </section>
    </div>
  )
}
