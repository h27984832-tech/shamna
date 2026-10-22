import { useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from '../lib/supabase'

type AuthDialogProps = { onClose: () => void }

export function AuthDialog({ onClose }: AuthDialogProps) {
  const [mode, setMode] = useState<'signin' | 'signup'>('signin')
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
      if (mode === 'signin') {
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
        setMessage(data.session
          ? 'تم إنشاء حسابك.'
          : 'تم إنشاء الحساب. راجع بريدك لتأكيد التسجيل إذا كان التأكيد مفعّلاً.')
      }
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'تعذر إكمال الطلب. حاول مرة أخرى.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="overlay" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose() }}>
      <section className="dialog auth-dialog" role="dialog" aria-modal="true" aria-labelledby="auth-title">
        <div className="dialog-heading">
          <div><span className="eyebrow">أهلاً فيك</span><h2 id="auth-title">{mode === 'signin' ? 'فوت على حسابك' : 'حساب جديد بشامنا'}</h2></div>
          <button className="icon-button" onClick={onClose} aria-label="إغلاق">×</button>
        </div>
        {!supabase && <div className="setup-note">الواجهة تعمل بالعرض التجريبي. لإتاحة الحسابات، أضف إعدادات Supabase في ملف البيئة المحلي بعد مراجعة المخطط.</div>}
        <form onSubmit={submit} className="form-stack">
          {mode === 'signup' && <label>الاسم<input required minLength={2} maxLength={100} autoComplete="name" value={displayName} onChange={(event) => setDisplayName(event.target.value)} /></label>}
          <label>البريد الإلكتروني<input required type="email" autoComplete="email" dir="ltr" value={email} onChange={(event) => setEmail(event.target.value)} /></label>
          <label>كلمة المرور<input required type="password" minLength={8} autoComplete={mode === 'signin' ? 'current-password' : 'new-password'} dir="ltr" value={password} onChange={(event) => setPassword(event.target.value)} /></label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {message && <p className="form-success" role="status">{message}</p>}
          <button className="form-submit" disabled={busy || !supabase}>{busy ? 'لحظة…' : mode === 'signin' ? 'تسجيل الدخول' : 'إنشاء الحساب'}</button>
        </form>
        <button className="text-button mode-switch" onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setError(''); setMessage('') }}>
          {mode === 'signin' ? 'ما عندك حساب؟ أنشئ حساباً جديداً' : 'عندك حساب؟ سجّل دخولك'}
        </button>
      </section>
    </div>
  )
}
