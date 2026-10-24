import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type AuthDialogProps = { onClose: () => void }

function authErrorMessage(cause: unknown) {
  const error = cause as { code?: string; message?: string }
  const reason = `${error.code ?? ''} ${error.message ?? ''}`.toLowerCase()

  if (reason.includes('rate limit') || reason.includes('rate_limit') || reason.includes('email rate')) {
    return 'وصلنا إلى حد إرسال رسائل البريد مؤقتًا. لن نعيد الإرسال تلقائيًا؛ انتظر قليلًا وافحص الوارد والرسائل غير المرغوب فيها قبل المحاولة مجددًا.'
  }
  if (reason.includes('email_not_confirmed') || reason.includes('email not confirmed')) {
    return 'هذا البريد يحتاج إلى تأكيد. افتح رسالة التأكيد التي وصلتك سابقًا، ثم حاول تسجيل الدخول.'
  }
  if (reason.includes('redirect') && (reason.includes('url') || reason.includes('uri'))) {
    return 'رابط العودة غير مسموح في إعدادات Supabase. أضف عنوان الموقع المحلي إلى قائمة Redirect URLs ثم حاول يدويًا.'
  }
  if (reason.includes('invalid login credentials') || reason.includes('invalid_credentials')) {
    return 'البريد الإلكتروني أو كلمة المرور غير صحيحة. تحقق منهما وحاول مرة أخرى.'
  }
  if (reason.includes('password') && (reason.includes('weak') || reason.includes('length') || reason.includes('least'))) {
    return 'كلمة المرور لا تحقق شروط الأمان. استخدم كلمة مرور أطول وأقوى.'
  }
  if (reason.includes('fetch') || reason.includes('network')) {
    return 'تعذر الاتصال بخدمة الحسابات. تحقق من الإنترنت ثم حاول لاحقًا.'
  }
  return 'تعذر إكمال العملية. تحقق من البيانات وحاول لاحقًا.'
}

export function AuthDialog({ onClose }: AuthDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup' | 'recover'>('signin')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setError('')
    setMessage('')
    if (!supabase) {
      setError('تسجيل الدخول يحتاج إعداد اتصال Supabase أولاً.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'recover') {
        const { error: recoveryError } = await supabase.auth.resetPasswordForEmail(email.trim(), {
          redirectTo: window.location.origin,
        })
        if (recoveryError) throw recoveryError
        setMessage('إذا كان البريد مسجلاً، ستصل رسالة استعادة. افحص الوارد والرسائل غير المرغوب فيها، ثم افتح الرابط من هذا الجهاز. لم نرسل رسالة إضافية.')
      } else if (mode === 'signin') {
        const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (authError) throw authError
        setMessage('أهلاً بعودتك إلى شامنا.')
      } else {
        const { data, error: authError } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        })
        if (authError) throw authError
        if (!data.user) {
          setError('لم نتلقَّ تأكيدًا من خدمة الحسابات، لذلك لم نعتبر التسجيل ناجحًا. حاول لاحقًا أو راجع إعدادات الاتصال.')
        } else if (data.user.identities?.length === 0) {
          setError('قد يكون لهذا البريد حساب مسبقًا. جرّب تسجيل الدخول بدل إنشاء حساب جديد.')
        } else if (data.session) {
          setMessage('تم إنشاء الحساب وتسجيل الدخول.')
        } else {
          setMessage('استُقبل طلب إنشاء الحساب. إذا كان تأكيد البريد مفعّلًا، استخدم الرسالة الموجودة في بريدك ثم سجّل الدخول. لم نطلب رسالة أخرى.')
        }
      }
    } catch (cause) {
      setError(authErrorMessage(cause))
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="dialog-heading">
          <div><span className="eyebrow">أهلاً فيك</span><h2 id="auth-title">{mode === 'signin' ? 'فوت على حسابك' : mode === 'signup' ? 'حساب جديد بشامنا' : 'استعادة كلمة المرور'}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق">×</button>
        </div>
        {!supabase && <div className="setup-note">الواجهة تعمل بالعرض التجريبي. لإتاحة الحسابات، أضف إعدادات Supabase في ملف البيئة المحلي بعد مراجعة المخطط.</div>}
        <form onSubmit={submit} className="form-stack">
          {mode === 'signup' && <label>الاسم<input required minLength={2} maxLength={100} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}
          <label>البريد الإلكتروني<input required type="email" autoComplete="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          {mode !== 'recover' && <label>كلمة المرور<input required type="password" minLength={8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} dir="ltr" value={password} onChange={(event) => setPassword(event.target.value)} /></label>}
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="form-submit" disabled={busy || !supabase}>{busy ? 'لحظة…' : mode === 'signin' ? 'تسجيل الدخول' : mode === 'signup' ? 'إنشاء الحساب' : 'إرسال رابط الاستعادة'}</button>
        </form>
        {mode === 'signin' && <button className="text-button mode-switch" onClick={() => { setMode('recover'); setError(''); setMessage('') }}>نسيت كلمة المرور؟</button>}
        <button className="text-button mode-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage('') }}>
          {mode === 'signin' ? 'ما عندك حساب؟ أنشئ حساباً جديداً' : mode === 'signup' ? 'عندك حساب؟ سجّل دخولك' : 'العودة إلى تسجيل الدخول'}
        </button>
      </section>
    </div>
  )
}
