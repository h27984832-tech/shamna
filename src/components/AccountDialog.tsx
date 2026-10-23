import { useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { supabase } from '../lib/supabase'

type AccountDialogProps = {
  user: User | null
  onClose: () => void
  onAuthenticated: () => void
}

function authMessage(code: string, message: string) {
  const reason = `${code} ${message}`.toLowerCase()
  if (reason.includes('rate limit') || reason.includes('rate_limit') || reason.includes('email rate')) {
    return 'وصلنا إلى حد إرسال رسائل البريد مؤقتًا. لن نعيد الإرسال تلقائيًا؛ انتظر قبل محاولة التسجيل مجددًا، وتحقق من صندوق الوارد والرسائل غير المرغوب فيها.'
  }
  if (reason.includes('email_not_confirmed') || reason.includes('email not confirmed')) {
    return 'هذا البريد يحتاج إلى تأكيد. افحص رسالة التأكيد السابقة، ثم عُد لتسجيل الدخول.'
  }
  if (reason.includes('invalid login credentials') || reason.includes('invalid_credentials')) {
    return 'البريد أو كلمة المرور غير صحيحة. تحقق منهما وحاول مرة أخرى.'
  }
  if (reason.includes('password') && (reason.includes('at least') || reason.includes('weak'))) {
    return 'اختر كلمة مرور أقوى، لا تقل عن 8 أحرف.'
  }
  if (reason.includes('fetch') || reason.includes('network')) {
    return 'تعذر الاتصال بخدمة الحسابات. تحقق من الإنترنت وإعدادات Supabase.'
  }
  return 'تعذر إكمال العملية. تحقق من البيانات وإعدادات المصادقة، ثم حاول لاحقًا.'
}

export function AccountDialog({ user, onClose, onAuthenticated }: AccountDialogProps) {
  const [isSignUp, setIsSignUp] = useState(false)
  const [displayName, setDisplayName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [message, setMessage] = useState('')
  const [isError, setIsError] = useState(false)

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!supabase || busy) return
    setBusy(true)
    setMessage('')
    setIsError(false)

    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
          options: { data: { display_name: displayName.trim() } },
        })
        if (error) throw error
        if (data.session) {
          setMessage('تم إنشاء الحساب وتسجيل الدخول.')
          onAuthenticated()
        } else if (data.user) {
          setMessage('تم إنشاء طلب الحساب. إذا كان تأكيد البريد مفعّلًا، افتح رسالة التأكيد ثم ارجع لتسجيل الدخول. لم نرسل رسالة إضافية.')
          setIsSignUp(false)
        } else {
          setMessage('لم يصل تأكيد من خدمة الحسابات. تحقق من إعدادات Supabase قبل المحاولة مرة أخرى.')
          setIsError(true)
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password })
        if (error) throw error
        setMessage('تم تسجيل الدخول.')
        onAuthenticated()
      }
    } catch (error) {
      const authError = error as { code?: string; message?: string }
      setMessage(authMessage(authError.code ?? '', authError.message ?? ''))
      setIsError(true)
    } finally {
      setBusy(false)
    }
  }

  const signOut = async () => {
    if (!supabase || busy) return
    setBusy(true)
    try {
      const { error } = await supabase.auth.signOut()
      if (error) throw error
      setMessage('تم تسجيل الخروج.')
      onClose()
    } catch (error) {
      const authError = error as { code?: string; message?: string }
      setMessage(authMessage(authError.code ?? '', authError.message ?? ''))
      setIsError(true)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="account-overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="account-dialog" role="dialog" aria-modal="true" aria-labelledby="account-title">
        <button className="account-close" type="button" onClick={onClose} aria-label="إغلاق نافذة الحساب">×</button>
        <span className="eyebrow">أهلًا في شامنا</span>
        <h2 id="account-title">{user ? 'حسابك' : isSignUp ? 'إنشاء حساب جديد' : 'تسجيل الدخول'}</h2>

        {!supabase ? (
          <div className="auth-config-note" role="status">
            <strong>ربط الحسابات غير مهيأ على هذا الجهاز.</strong>
            <p>أضف رابط Supabase ومفتاح الواجهة العامة إلى ملف البيئة المحلي وفق README. لا تضع مفتاحًا سريًا هنا.</p>
          </div>
        ) : user ? (
          <div className="signed-in-card">
            <p>تم تسجيل الدخول باسم:</p><strong>{user.email}</strong>
            <button className="primary-button auth-submit" type="button" onClick={signOut} disabled={busy}>{busy ? 'جارٍ تسجيل الخروج…' : 'تسجيل الخروج'}</button>
          </div>
        ) : (
          <form className="account-form" onSubmit={submit}>
            {isSignUp && <label>الاسم الظاهر<input autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} required maxLength={80} /></label>}
            <label>البريد الإلكتروني<input type="email" autoComplete="email" value={email} onChange={(event) => setEmail(event.target.value)} required /></label>
            <label>كلمة المرور<input type="password" autoComplete={isSignUp ? 'new-password' : 'current-password'} value={password} onChange={(event) => setPassword(event.target.value)} required minLength={isSignUp ? 8 : 1} /></label>
            <button className="primary-button auth-submit" type="submit" disabled={busy}>{busy ? 'لحظة من فضلك…' : isSignUp ? 'إنشاء الحساب' : 'تسجيل الدخول'}</button>
            <button className="auth-mode-toggle" type="button" onClick={() => { setIsSignUp((value) => !value); setMessage('') }}>{isSignUp ? 'لديك حساب؟ سجّل الدخول' : 'ما عندك حساب؟ أنشئ حسابًا جديدًا'}</button>
          </form>
        )}

        {message && <p className={`auth-message ${isError ? 'error' : ''}`} role={isError ? 'alert' : 'status'}>{message}</p>}
        <p className="auth-safety-note">لن نعرض أو نحفظ كلمة مرورك في شامنا.</p>
      </section>
    </div>
  )
}
