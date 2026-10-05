import { useEffect, useRef, useState } from 'react'
import { Link } from '../../components/Link'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Ticket,
  Camera,
  ArrowRight,
  Home,
  ShieldAlert,
  ShieldCheck,
  User,
  Phone,
  RotateCcw,
  ChevronDown,
  Info,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { isValidIndianPhone } from '../../lib/format'
import { Confetti } from '../../components/Confetti'
import { QrScannerModal } from '../../components/QrScannerModal'
import { extractCouponId, formatCouponDisplay } from '../../lib/tokenHelper'
import { PublicNavbar } from '../../components/PublicNavbar'

export function RegisterPage() {
  const { registerParticipant, validateCouponAsync } = useApp()

  const [form, setForm] = useState({
    name: '',
    phone: '',
    couponId: '',
  })
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [successId, setSuccessId] = useState<string | null>(null)
  const [registeredCoupon, setRegisteredCoupon] = useState<string | null>(null)
  const [registeredName, setRegisteredName] = useState<string | null>(null)
  const [confetti, setConfetti] = useState(false)
  const [isScannerOpen, setIsScannerOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isSubmittingRef = useRef(false)

  // Live Token validation state
  const [isValidatingToken, setIsValidatingToken] = useState(false)
  const [tokenStatus, setTokenStatus] = useState<{
    status: 'Idle' | 'Valid' | 'Used' | 'Invalid'
    message: string
  }>({ status: 'Idle', message: '' })

  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null)
  const latestRequestIdRef = useRef<number>(0)
  const lastValidatedTokenRef = useRef<string>('')

  // Live Token Validator function (Async server check)
  const checkToken = (tokenInput: string, immediate = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const clean = (extractCouponId(tokenInput) || tokenInput.replace(/[^A-Za-z0-9]/g, '')).slice(0, 13).toUpperCase()
    if (!clean) {
      setTokenStatus({ status: 'Idle', message: '' })
      return
    }

    // If not yet 13 characters:
    if (clean.length !== 13) {
      // ONLY show the length error if explicitly triggered by blur, Enter, or submit
      if (immediate) {
        setTokenStatus({
          status: 'Invalid',
          message: 'Please enter a valid 13-character coupon code.',
        })
      }
      return
    }

    const runValidation = async () => {
      const currentReqId = ++latestRequestIdRef.current
      setIsValidatingToken(true)
      try {
        const result = await validateCouponAsync(clean)
        if (currentReqId !== latestRequestIdRef.current) return

        if (result.valid && result.status === 'Unused') {
          lastValidatedTokenRef.current = clean
          setTokenStatus({
            status: 'Valid',
            message: 'Valid Festival Coupon! Ready for registration.',
          })
          setErrors((prev) => ({ ...prev, couponId: '' }))
        } else if (result.status === 'Used') {
          setTokenStatus({
            status: 'Used',
            message: result.message || 'This coupon has already been used and is no longer valid.',
          })
        } else {
          setTokenStatus({
            status: 'Invalid',
            message: result.message || 'Coupon not found. Please check the 13-character code.',
          })
        }
      } catch {
        if (currentReqId === latestRequestIdRef.current) {
          setTokenStatus({ status: 'Invalid', message: 'Could not verify coupon. Please try again.' })
        }
      } finally {
        if (currentReqId === latestRequestIdRef.current) {
          setIsValidatingToken(false)
        }
      }
    }

    if (immediate) {
      runValidation()
    } else {
      debounceTimerRef.current = setTimeout(runValidation, 300)
    }
  }

  // Auto-fill and validate coupon from URL query params
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const rawParam =
      params.get('coupon') ||
      params.get('token') ||
      params.get('id') ||
      params.get('c') ||
      params.get('code') ||
      window.location.search

    const extracted = extractCouponId(rawParam)
    if (extracted) {
      const capped = extracted.slice(0, 13).toUpperCase()
      setForm((f) => ({ ...f, couponId: capped }))
      checkToken(capped, true)
    }
  }, [])

  const handleCouponChange = (val: string) => {
    const extracted = extractCouponId(val)
    const cleaned = (extracted || val.replace(/[^A-Za-z0-9]/g, '')).slice(0, 13).toUpperCase()
    setForm((f) => ({ ...f, couponId: cleaned }))
    // While user is actively typing, stay in Idle state (never show premature error)
    setTokenStatus({ status: 'Idle', message: '' })
    if (errors.couponId) {
      setErrors((prev) => ({ ...prev, couponId: '' }))
    }
    // Only auto-validate in background when they complete the full 13 characters
    if (cleaned.length === 13) {
      checkToken(cleaned, false)
    }
  }

  const handleCouponBlur = () => {
    const clean = (extractCouponId(form.couponId) || form.couponId.replace(/[^A-Za-z0-9]/g, '')).slice(0, 13).toUpperCase()
    if (!clean) {
      setTokenStatus({ status: 'Idle', message: '' })
      return
    }
    if (clean.length < 13) {
      setTokenStatus({
        status: 'Invalid',
        message: 'Please enter a valid 13-character coupon code.',
      })
      return
    }
    checkToken(clean, true)
  }

  const handleCouponKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      const clean = (extractCouponId(form.couponId) || form.couponId.replace(/[^A-Za-z0-9]/g, '')).slice(0, 13).toUpperCase()
      if (!clean) return
      if (clean.length < 13) {
        setTokenStatus({
          status: 'Invalid',
          message: 'Please enter a valid 13-character coupon code.',
        })
        return
      }
      checkToken(clean, true)
    }
  }

  const handleScanSuccess = (scannedToken: string) => {
    const clean = (extractCouponId(scannedToken) || scannedToken.replace(/[^A-Za-z0-9]/g, '')).slice(0, 13).toUpperCase()
    setForm((f) => ({ ...f, couponId: clean }))
    checkToken(clean, true)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?coupon=${encodeURIComponent(clean)}`)
    }
  }

  const clearCoupon = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    lastValidatedTokenRef.current = ''
    setForm((f) => ({ ...f, couponId: '' }))
    setTokenStatus({ status: 'Idle', message: '' })
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', window.location.pathname)
    }
  }

  const [formError, setFormError] = useState('')

  const set = (key: string, value: string) => {
    setForm((f) => ({ ...f, [key]: value }))
    setFormError('')
    if (errors[key]) {
      setErrors((prev) => ({ ...prev, [key]: '' }))
    }
  }

  const resetForm = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    lastValidatedTokenRef.current = ''
    setSuccessId(null)
    setRegisteredCoupon(null)
    setRegisteredName(null)
    setForm({ name: '', phone: '', couponId: '' })
    setTokenStatus({ status: 'Idle', message: '' })
    setErrors({})
    setFormError('')
    isSubmittingRef.current = false
    setIsSubmitting(false)
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmittingRef.current || isSubmitting) return
    isSubmittingRef.current = true
    setIsSubmitting(true)
    setFormError('')

    const next: Record<string, string> = {}

    // 1. Coupon ID is strictly required
    if (!form.couponId.trim()) {
      next.couponId = 'Coupon code is required'
    } else {
      const cleanToken = (extractCouponId(form.couponId) || form.couponId.replace(/[^A-Za-z0-9]/g, '')).slice(0, 13).toUpperCase()
      if (cleanToken.length !== 13) {
        next.couponId = 'Please enter a valid 13-character coupon code.'
        setTokenStatus({
          status: 'Invalid',
          message: 'Please enter a valid 13-character coupon code.',
        })
      } else {
        if (tokenStatus.status === 'Valid' && lastValidatedTokenRef.current === cleanToken) {
          // already verified
        } else {
          const check = await validateCouponAsync(cleanToken)
          if (!check.valid) {
            next.couponId = check.message
            setTokenStatus({
              status: check.status === 'Used' ? 'Used' : 'Invalid',
              message: check.message,
            })
          }
        }
      }
    }

    // 2. Name is required
    if (!form.name.trim()) {
      next.name = 'Full name is required'
    }

    // 3. Phone is strictly required
    if (!form.phone.trim()) {
      next.phone = 'Mobile number is required'
    } else if (!isValidIndianPhone(form.phone)) {
      next.phone = 'Enter valid 10-digit mobile number'
    }

    setErrors(next)
    if (Object.keys(next).length) {
      isSubmittingRef.current = false
      setIsSubmitting(false)
      return
    }

    try {
      const cleanToken = (extractCouponId(form.couponId) || form.couponId.replace(/[^A-Za-z0-9]/g, '')).slice(0, 13).toUpperCase()
      const userName = form.name.trim()
      const result = await registerParticipant({
        name: userName,
        phone: form.phone.trim(),
        address: 'Valanchery',
        location: 'Valanchery',
        couponId: cleanToken,
      })

      if (!result.ok) {
        if (result.error.toLowerCase().includes('coupon')) {
          setErrors({ couponId: result.error })
          setTokenStatus({
            status: result.error.toLowerCase().includes('already') ? 'Used' : 'Invalid',
            message: result.error,
          })
        } else {
          setFormError(result.error)
        }
        return
      }

      // Success
      setSuccessId(result.id)
      setRegisteredCoupon(cleanToken)
      setRegisteredName(userName)
      setConfetti(true)
    } catch {
      setFormError('Registration failed. Please try again.')
    } finally {
      setIsSubmitting(false)
      isSubmittingRef.current = false
    }
  }

  return (
    <div className="h-screen h-[100dvh] max-h-[100dvh] w-full bg-gradient-to-b from-[#e0f7fa] via-[#e6f9fc] to-[#d8f3f8] text-slate-900 flex flex-col justify-between overflow-hidden select-none relative font-['Montserrat',sans-serif]">
      <Confetti active={confetti} />

      {/* Decorative ambient background accents */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden z-0">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-cyan-200/35 rounded-full blur-3xl -z-10" />
        <div className="absolute top-16 right-[12%] w-2.5 h-2.5 bg-pink-400 rotate-45 rounded-2xs opacity-75" />
        <div className="absolute top-24 right-[8%] w-2 h-2 bg-amber-400 rotate-12 rounded-2xs opacity-80" />
        <div className="absolute bottom-28 left-[10%] w-2.5 h-2.5 bg-cyan-400 rotate-45 rounded-2xs opacity-75" />
      </div>

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* 1. Fixed Festival Navbar */}
      <PublicNavbar active="register" />

      {/* Main Single-Screen Form Container: fits within mobile screen without scrolling */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-3 pt-14 pb-1 sm:pt-16 sm:pb-2 w-full max-w-[420px] mx-auto overflow-hidden">
        {/* Compact Card with reduced border radius */}
        <div className="w-full bg-white rounded-xl sm:rounded-2xl shadow-xl shadow-cyan-900/10 border border-white/90 p-4 sm:p-5 relative">
          {successId ? (
            /* Success State */
            <div className="text-center space-y-3 py-1">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
                <CheckCircle2 size={28} />
              </div>

              <div>
                <h2 className="text-lg sm:text-xl font-bold text-slate-900">
                  Registration Confirmed!
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">
                  You are officially entered into the Lucky Draw pool.
                </p>
              </div>

              <div className="border border-cyan-100 bg-cyan-50/50 rounded-lg p-3 text-left space-y-2 text-xs">
                {registeredName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Name:</span>
                    <span className="font-bold text-slate-900">{registeredName}</span>
                  </div>
                )}
                {registeredCoupon && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Coupon Code:</span>
                    <span className="font-mono font-bold text-[#0097b2] inline-flex items-center gap-1.5">
                      <Ticket size={13} className="text-[#0097b2] shrink-0" />
                      <span>{registeredCoupon}</span>
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Draw Status:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                    <ShieldCheck size={13} /> Active in Lucky Draw Pool
                  </span>
                </div>
              </div>

              <div className="pt-1 flex flex-col sm:flex-row items-center gap-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 bg-[#0097b2] hover:bg-[#0284c7] text-white py-2 px-3 rounded-lg text-xs font-bold uppercase tracking-wider shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <RotateCcw size={13} />
                  <span>Register Another</span>
                </button>

                <Link
                  to="/"
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 py-2 px-3 rounded-lg text-xs font-semibold transition active:scale-95 cursor-pointer"
                >
                  <Home size={13} />
                  <span>Back to Home</span>
                </Link>
              </div>
            </div>
          ) : (
            /* Input Form: Header with Logo only, no redundant text */
            <div>
              {/* Header with Centered Logo only */}
              <div className="flex justify-center mb-3">
                <img
                  src="/valanchery-shopping-festival-logo.png"
                  alt="Valanchery Shopping Festival - Season 2"
                  className="h-11 sm:h-12 w-auto object-contain"
                />
              </div>

              {formError && (
                <div className="mb-2.5 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-center gap-1.5">
                  <XCircle size={14} className="shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={submit} className="space-y-2.5 sm:space-y-3">
                {/* 1. Coupon ID Field */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-bold text-slate-700">
                      Coupon ID <span className="text-cyan-500">*</span>
                    </label>
                    {form.couponId && tokenStatus.status !== 'Valid' && tokenStatus.status !== 'Used' && (
                      <span className="text-[10px] font-mono text-slate-400">
                        {form.couponId.length}/13
                      </span>
                    )}
                  </div>

                  {form.couponId && tokenStatus.status === 'Valid' ? (
                    <div className="flex items-center justify-between rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-mono text-xs font-bold tracking-wider text-emerald-900">
                            {formatCouponDisplay(form.couponId)}
                          </p>
                          <p className="text-[10px] font-bold text-emerald-700">VALID COUPON · READY FOR ENTRY</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearCoupon}
                        className="text-xs text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                      >
                        Change
                      </button>
                    </div>
                  ) : form.couponId && tokenStatus.status === 'Used' ? (
                    <div className="rounded-lg border border-red-300 bg-red-50 p-2.5 text-left">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-1.5">
                          <XCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-mono text-xs font-bold tracking-wider text-red-900">
                              {formatCouponDisplay(form.couponId)}
                            </p>
                            <p className="text-[10px] font-bold text-red-700 mt-0.5">INVALID · COUPON ALREADY USED</p>
                            <p className="text-[10px] text-red-600 leading-tight">
                              {tokenStatus.message || 'This coupon has already been redeemed and is no longer valid.'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={clearCoupon}
                          className="text-xs text-red-700 hover:text-red-900 underline font-semibold shrink-0 ml-2 cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  ) : (
                    /* Default Interactive Input Container with Scan QR button */
                    <div>
                      <div className={`relative flex items-center border ${
                        (tokenStatus.status === 'Invalid' && tokenStatus.message) || errors.couponId
                          ? 'border-red-400 bg-red-50/20 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100'
                          : 'border-cyan-200/90 hover:border-cyan-300 focus-within:border-[#0097b2] focus-within:ring-2 focus-within:ring-cyan-100 bg-white'
                      } rounded-lg p-1 transition`}>
                        <Ticket size={16} className={`${(tokenStatus.status === 'Invalid' && tokenStatus.message) || errors.couponId ? 'text-red-400' : 'text-slate-400'} ml-2 shrink-0`} />
                        <input
                          type="text"
                          value={form.couponId}
                          maxLength={13}
                          onChange={(e) => handleCouponChange(e.target.value)}
                          onPaste={(e) => {
                            const pasted = e.clipboardData?.getData('text') || ''
                            const extracted = extractCouponId(pasted)
                            if (extracted) {
                              e.preventDefault()
                              handleCouponChange(extracted)
                            }
                          }}
                          onBlur={handleCouponBlur}
                          onKeyDown={handleCouponKeyDown}
                          placeholder="Enter 13-digit coupon code"
                          className="w-full px-2 py-1 text-xs font-mono tracking-wider text-slate-800 placeholder:text-slate-400 outline-none uppercase bg-transparent"
                        />
                        {isValidatingToken && (
                          <div className="mr-1.5">
                            <Loader2 size={13} className="animate-spin text-[#0097b2]" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsScannerOpen(true)}
                          className="inline-flex items-center gap-1 bg-[#e0f7fc] hover:bg-[#cbf1f9] text-[#0097b2] px-2.5 py-1.5 rounded-md text-[11px] font-bold transition whitespace-nowrap shrink-0 cursor-pointer border border-cyan-100"
                        >
                          <Camera size={12} />
                          <span>Scan QR</span>
                        </button>
                      </div>

                      {((tokenStatus.status === 'Invalid' && tokenStatus.message) || errors.couponId) && (
                        <p className="mt-1 text-[11px] font-medium text-red-600 flex items-center gap-1">
                          <ShieldAlert size={12} className="shrink-0" />
                          <span>{tokenStatus.message || errors.couponId}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Full Name Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Full Name <span className="text-cyan-500">*</span>
                  </label>
                  <div className="flex items-center border border-cyan-200/90 hover:border-cyan-300 focus-within:border-[#0097b2] focus-within:ring-2 focus-within:ring-cyan-100 rounded-lg bg-white px-2.5 py-2 transition">
                    <User size={16} className="text-slate-400 shrink-0 mr-2" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full text-xs text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
                    />
                  </div>
                  {errors.name && <p className="mt-0.5 text-[10px] font-medium text-red-600">{errors.name}</p>}
                </div>

                {/* 3. Mobile Number Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    Mobile Number <span className="text-cyan-500">*</span>
                  </label>
                  <div className="flex items-center border border-cyan-200/90 hover:border-cyan-300 focus-within:border-[#0097b2] focus-within:ring-2 focus-within:ring-cyan-100 rounded-lg bg-white overflow-hidden transition">
                    <div className="px-2.5 py-2 text-slate-700 font-bold text-xs border-r border-slate-100 flex items-center gap-0.5 select-none shrink-0 bg-transparent">
                      <span>+91</span>
                      <ChevronDown size={13} className="text-slate-400" />
                    </div>
                    <Phone size={15} className="text-slate-400 ml-2.5 shrink-0" />
                    <input
                      type="tel"
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                        set('phone', digits)
                      }}
                      placeholder="10-digit mobile number"
                      className="w-full px-2 py-2 text-xs font-mono tracking-wider text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
                    />
                  </div>
                  {errors.phone && <p className="mt-0.5 text-[10px] font-medium text-red-600">{errors.phone}</p>}
                  
                  <p className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
                    <Info size={11} className="text-[#0097b2] shrink-0" />
                    <span>Winners will be contacted directly on this mobile number.</span>
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-1.5">
                  <button
                    type="submit"
                    disabled={tokenStatus.status === 'Used' || tokenStatus.status === 'Invalid' || isSubmitting}
                    className="w-full flex items-center justify-center gap-1.5 rounded-lg bg-gradient-to-r from-[#0097b2] via-[#0284c7] to-[#0ea5e9] hover:opacity-95 text-white py-2.5 sm:py-3 text-xs sm:text-[13px] font-bold tracking-wider uppercase transition shadow-md shadow-cyan-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-white" />
                        <span>CONFIRMING...</span>
                      </>
                    ) : (
                      <>
                        <span>CONFIRM & ENTER DRAW</span>
                        <ArrowRight size={14} />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Footer Trust Note */}
              <div className="mt-3 text-center">
                <div className="inline-flex items-center justify-center gap-1 text-[11px] font-medium text-[#0097b2]">
                  <ShieldCheck size={13} className="text-[#0097b2]" />
                  <span>Safe and Secured • Official KVVES Portal</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 shrink-0 py-1.5 text-center text-[10px] text-slate-400">
        © 2026 Valanchery Shopping Festival
      </footer>
    </div>
  )
}
