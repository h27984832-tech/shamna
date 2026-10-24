type ErrorDetails = { code?: unknown; message?: unknown }

export function userFacingError(cause: unknown, fallback: string): string {
  const details = cause && typeof cause === 'object' ? cause as ErrorDetails : {}
  const code = typeof details.code === 'string' ? details.code.toLowerCase() : ''
  const message = typeof details.message === 'string' ? details.message.toLowerCase() : ''
  const reason = `${code} ${message}`

  if (reason.includes('product unavailable') || reason.includes('stock changed')) {
    return 'تغيّر توفر أحد المنتجات أو مخزونه. حدّث السلة وتحقق من الكمية قبل المحاولة مجددًا.'
  }
  if (reason.includes('delivery unavailable') || reason.includes('delivery area is unavailable')) {
    return 'لا توصيل إلى المنطقة المختارة من متجر واحد أو أكثر. اختر منطقة أخرى أو عدّل السلة.'
  }
  if (reason.includes('address not found')) {
    return 'تعذر العثور على عنوان التوصيل. أعد إدخاله ثم حاول مجددًا.'
  }
  if (reason.includes('authentication required') || code === '28000') {
    return 'انتهت جلسة الحساب. سجّل الدخول مجددًا ثم أعد المحاولة.'
  }
  if (reason.includes('rate limit') || reason.includes('rate_limit') || reason.includes('email rate')) {
    return 'وصلنا إلى حد المحاولات مؤقتًا. انتظر قليلًا ثم أعد المحاولة يدويًا.'
  }
  if (code === '42501' || reason.includes('row-level security') || reason.includes('permission denied') || reason.includes('not allowed')) {
    return 'لا تسمح صلاحية هذا الحساب بهذه العملية. تحقق من دور الحساب أو تواصل مع الإدارة.'
  }
  if (code === '23505' || reason.includes('duplicate key') || reason.includes('already exists')) {
    return 'هذه البيانات موجودة مسبقًا. راجع القيم ثم حاول مرة أخرى.'
  }
  if (reason.includes('fetch') || reason.includes('network') || reason.includes('timeout')) {
    return 'تعذر الاتصال بالخدمة. تحقق من الإنترنت ثم حاول مجددًا.'
  }
  if (code.startsWith('22') || code.startsWith('23') || code === '22023') {
    return 'بعض البيانات غير صالحة أو تغيّرت. راجع المدخلات وحاول مجددًا.'
  }
  return fallback
}
