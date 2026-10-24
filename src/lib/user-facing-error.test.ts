import { describe, expect, it } from 'vitest'
import { userFacingError } from './user-facing-error'

describe('userFacingError', () => {
  it('explains an inventory change without exposing the database message', () => {
    expect(userFacingError({ code: '22023', message: 'product unavailable or stock changed' }, 'تعذر إتمام الطلب.'))
      .toContain('تغيّر توفر أحد المنتجات')
  })

  it('explains unsupported delivery areas', () => {
    expect(userFacingError({ message: 'delivery unavailable for this area' }, 'تعذر إتمام الطلب.'))
      .toContain('لا توصيل إلى المنطقة المختارة')
  })

  it('does not leak row-level security or SQL details', () => {
    const message = userFacingError({ code: '42501', message: 'permission denied for table private_records' }, 'تعذر حفظ البيانات.')
    expect(message).toContain('لا تسمح صلاحية هذا الحساب')
    expect(message).not.toContain('private_records')
  })

  it('asks users to wait after a rate limit without retrying', () => {
    expect(userFacingError({ code: 'over_email_send_rate_limit' }, 'تعذر الإرسال.'))
      .toContain('انتظر قليلًا')
  })

  it('uses a safe fallback for unrecognized backend errors', () => {
    const message = userFacingError({ code: 'XX000', message: 'internal server detail' }, 'تعذر حفظ البيانات.')
    expect(message).toBe('تعذر حفظ البيانات.')
    expect(message).not.toContain('internal server detail')
  })
})
