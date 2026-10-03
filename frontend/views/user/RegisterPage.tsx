import { useEffect, useRef, useState } from 'react'
import { Link } from '../../components/Link'
import {
  Check,
  CheckCircle2,
  XCircle,
  Loader2,
  Ticket,
  Camera,
  ArrowRight,
  Home,
  ShieldAlert,
} from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { isValidIndianPhone } from '../../lib/format'
import { Confetti } from '../../components/Confetti'
import { QrScannerModal } from '../../components/QrScannerModal'
import { extractCouponId, formatCouponDisplay } from '../../lib/tokenHelper'
import { PublicNavbar } from '../../components/PublicNavbar'
import bgWebp from '../../assets/bg.webp'
import mobileWebp from '../../assets/mobile.webp'

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

  // Live Token Validator function (Debounced + Async server check)
  const checkToken = (tokenInput: string, immediate = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const clean = extractCouponId(tokenInput) || tokenInput.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase()
    if (!clean) {
      setTokenStatus({ status: 'Idle', message: '' })
      return
    }
    if (clean.length !== 13) {
      setTokenStatus({
        status: 'Invalid',
        message: 'Please enter a valid 13-character coupon code.',
      })
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
        } else if (result.status === 'Used') {
          setTokenStatus({
            status: 'Used',
            message: result.message || 'This coupon has already been used and is no longer valid.',
          })
        } else {
          setTokenStatus({
            status: 'Invalid',
            message: result.message || 'Invalid coupon code.',
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
      debounceTimerRef.current = setTimeout(runValidation, 350)
    }
  }

  // Auto-fill and validate coupon from URL query params (e.g. ?coupon=7492018401)
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
      setForm((f) => ({ ...f, couponId: extracted }))
      checkToken(extracted, true)
    }
  }, [])

  const handleCouponChange = (val: string) => {
    const extracted = extractCouponId(val)
    const cleaned = extracted || val.replace(/[^A-Za-z0-9]/g, '').slice(0, 16).toUpperCase()
    setForm((f) => ({ ...f, couponId: cleaned }))
    checkToken(cleaned, false)
  }

  const handleScanSuccess = (scannedToken: string) => {
    setForm((f) => ({ ...f, couponId: scannedToken }))
    checkToken(scannedToken, true)
    if (typeof window !== 'undefined') {
      window.history.replaceState(null, '', `?coupon=${encodeURIComponent(scannedToken)}`)
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
      const cleanToken = extractCouponId(form.couponId) || form.couponId.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase()
      if (cleanToken.length < 8 || cleanToken.length > 16) {
        next.couponId = 'Please enter a valid 13-character coupon code.'
      } else {
        // Skip redundant network check if already validated as Valid
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
      const cleanToken = extractCouponId(form.couponId) || form.couponId.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase()
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
    <div className="min-h-screen min-h-[100dvh] w-full text-slate-900 flex flex-col justify-between overflow-x-hidden select-none relative">
      {/* Background Image: Mobile Portrait (<640px) */}
      <div
        className="absolute inset-0 bg-cover bg-center sm:hidden z-0"
        style={{
          backgroundImage: `url(${mobileWebp})`,
        }}
      />
      {/* Background Image: Desktop / Tablet (>=640px) */}
      <div
        className="absolute inset-0 bg-cover bg-center lg:bg-[length:100%_100%] hidden sm:block z-0"
        style={{
          backgroundImage: `url(${bgWebp})`,
        }}
      />
      <Confetti active={confetti} />

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* 1. Fixed Festival Navbar */}
      <PublicNavbar active="register" />

      {/* Single-Screen Light-Theme Registration Form Container */}
      <main className="relative z-10 flex-1 flex flex-col justify-center items-center px-3 pt-16 pb-12 sm:py-16 sm:px-4 max-w-[375px] sm:max-w-[400px] mx-auto w-full">
        {/* Card Wrapper - Sharp, Compact, Luxury, Flat */}
        <div className="w-full border border-[#c28e18]/40 bg-white p-5 sm:p-6 shadow-2xl rounded-sm">
          {/* Card Header */}
          <div className="text-center mb-4">
            <h1 className="text-sm sm:text-base font-bold text-[#140d10] tracking-normal">
              Register Your Pass
            </h1>
          </div>

          {/* Form */}
          <form onSubmit={submit} className="space-y-3">
            {/* 1. Coupon / Token ID Section */}
            <div className="rounded-none border border-[#d4a017]/40 bg-[#fdfbf7] p-2.5">
              <div className="flex items-center justify-between mb-1.5">
                <label className="flex items-center gap-1 text-[11px] font-semibold tracking-wide text-[#7a1426] uppercase">
                  <Ticket size={13} className="text-[#c28e18]" /> Coupon Token ID *
                </label>
                {!form.couponId && (
                  <button
                    type="button"
                    onClick={() => setIsScannerOpen(true)}
                    className="flex items-center gap-1 rounded-none bg-[#c28e18] px-2 py-0.5 text-[10px] font-bold text-white transition hover:bg-[#a67912]"
                  >
                    <Camera size={11} /> Scan QR
                  </button>
                )}
              </div>

              {/* Dynamic Token Display based on verification status */}
              {form.couponId ? (
                <div>
                  {/* Valid Token State */}
                  {tokenStatus.status === 'Valid' && (
                    <div className="flex items-center justify-between rounded-none border border-emerald-600/30 bg-emerald-50 px-2.5 py-1.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={15} className="text-emerald-600 shrink-0" />
                        <div>
                          <p className="font-mono text-xs font-bold tracking-wider text-emerald-900">
                            {formatCouponDisplay(form.couponId)}
                          </p>
                          <p className="text-[9px] font-bold text-emerald-700">VALID COUPON · READY FOR ENTRY</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearCoupon}
                        className="text-[10px] text-slate-500 hover:text-slate-800 underline font-medium"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {/* ALREADY USED State */}
                  {tokenStatus.status === 'Used' && (
                    <div className="rounded-none border border-red-500/40 bg-red-50 px-2.5 py-2 text-left">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-1.5">
                          <XCircle size={15} className="text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-mono text-xs font-bold tracking-wider text-red-900">
                              {formatCouponDisplay(form.couponId)}
                            </p>
                            <p className="text-[10px] font-bold text-red-700 mt-0.5">INVALID · COUPON ALREADY USED</p>
                            <p className="text-[10px] text-red-600 leading-tight mt-0.5">
                              {tokenStatus.message || 'This coupon has already been redeemed and is no longer valid.'}
                            </p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={clearCoupon}
                          className="text-[10px] text-red-700 hover:text-red-900 underline font-semibold shrink-0 ml-2"
                        >
                          Change
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Invalid Token State */}
                  {tokenStatus.status === 'Invalid' && (
                    <div className="flex items-center justify-between rounded-none border border-red-500/40 bg-red-50 px-2.5 py-1.5">
                      <div className="flex items-center gap-1.5">
                        <ShieldAlert size={15} className="text-red-600 shrink-0" />
                        <div>
                          <p className="font-mono text-xs font-bold text-red-900">{form.couponId}</p>
                          <p className="text-[9px] text-red-700">{tokenStatus.message || 'Invalid coupon token'}</p>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={clearCoupon}
                        className="text-[10px] text-red-700 underline font-medium"
                      >
                        Change
                      </button>
                    </div>
                  )}

                  {/* Validating Spinner */}
                  {isValidatingToken && (
                    <div className="flex items-center gap-2 py-1 text-xs text-slate-600">
                      <Loader2 size={13} className="animate-spin text-[#c28e18]" />
                      <span className="text-[10px]">Verifying coupon...</span>
                    </div>
                  )}
                </div>
              ) : (
                /* Manual Input */
                <div className="relative">
                  <input
                    type="text"
                    value={form.couponId}
                    onChange={(e) => handleCouponChange(e.target.value)}
                    placeholder="Enter coupon code (e.g. A1D3S123F89K2)"
                    className="w-full rounded-none border border-slate-300 bg-white px-2.5 py-1.5 text-base sm:text-xs font-mono tracking-wider text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#c28e18]"
                  />
                  {isValidatingToken && (
                    <div className="absolute right-2 top-1/2 -translate-y-1/2">
                      <Loader2 size={13} className="animate-spin text-[#c28e18]" />
                    </div>
                  )}
                </div>
              )}

              {errors.couponId && !form.couponId && (
                <p className="mt-1 text-[10px] font-medium text-red-600">{errors.couponId}</p>
              )}
            </div>

            {/* 2. Full Name / Username Section */}
            <div className="rounded-none border border-slate-200 bg-white p-2.5">
              <label className="block text-[10px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Full Name / Username *
              </label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => set('name', e.target.value)}
                placeholder="Enter your full name"
                className="w-full rounded-none border border-slate-300 bg-white px-2.5 py-1.5 text-base sm:text-xs text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#c28e18]"
              />
              {errors.name && <p className="mt-1 text-[10px] font-medium text-red-600">{errors.name}</p>}
            </div>

            {/* 3. Phone Number Section */}
            <div className="rounded-none border border-slate-200 bg-white p-2.5">
              <label className="block text-[10px] font-semibold text-slate-700 uppercase tracking-wide mb-1">
                Phone Number *
              </label>
              <div className="relative">
                <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                  +91
                </span>
                <input
                  type="tel"
                  maxLength={10}
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value.replace(/\D/g, ''))}
                  placeholder="Phone number"
                  className="w-full rounded-none border border-slate-300 bg-white pl-10 pr-2.5 py-1.5 text-base sm:text-xs font-mono text-slate-900 placeholder-slate-400 outline-none transition focus:border-[#c28e18]"
                />
              </div>
              {errors.phone && <p className="mt-1 text-[10px] font-medium text-red-600">{errors.phone}</p>}
            </div>

            {formError && (
              <div className="rounded-none border border-red-500/40 bg-red-50 p-2 text-center">
                <p className="text-xs font-semibold text-red-700">{formError}</p>
              </div>
            )}

            {/* Submit Button */}
            <div className="pt-0.5">
              <button
                type="submit"
                disabled={tokenStatus.status === 'Used' || tokenStatus.status === 'Invalid' || isSubmitting}
                className="w-full flex items-center justify-center gap-2 rounded-none bg-[#720e1e] hover:bg-[#891326] py-2.5 text-xs font-bold tracking-wider text-white transition disabled:opacity-45 disabled:cursor-not-allowed active:scale-[0.99]"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 size={14} className="animate-spin text-white" />
                    <span>REGISTERING...</span>
                  </>
                ) : (
                  <>
                    <span>REGISTER PASS NOW</span>
                    <ArrowRight size={13} />
                  </>
                )}
              </button>
            </div>
          </form>
        </div>
      </main>

      {/* Success Modal with direct button to Home page */}
      {successId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs">
          <div className="w-full max-w-sm rounded-2xl border border-[#d4a017]/40 bg-white p-5 text-center text-slate-900 shadow-2xl animate-fade-up">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <Check size={20} />
            </div>
            <h3 className="font-display text-lg font-bold text-slate-900 mt-2">
              Registration Successful!
            </h3>
            <p className="text-xs text-slate-600 mt-0.5">
              You are officially registered for the Valanchery Festival Lucky Draw.
            </p>

            <div className="my-3 rounded-xl border border-slate-200 bg-slate-50 p-3 text-left">
              {registeredName && (
                <div>
                  <p className="text-[9px] tracking-widest text-slate-500 uppercase font-semibold">PARTICIPANT NAME</p>
                  <p className="text-xs font-semibold text-slate-900">{registeredName}</p>
                </div>
              )}
              {registeredCoupon && (
                <div className={`${registeredName ? 'border-t border-slate-200 pt-1.5 mt-1.5' : ''}`}>
                  <p className="text-[9px] tracking-widest text-slate-500 uppercase font-semibold">COUPON CODE</p>
                  <p className="font-mono text-xs font-bold text-[#7a1426]">{formatCouponDisplay(registeredCoupon)}</p>
                </div>
              )}
            </div>

            <div className="flex gap-2">
              <Link
                to="/"
                className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-[#720e1e] bg-[#720e1e] py-2 text-xs font-bold text-white transition hover:bg-[#891326]"
              >
                <Home size={13} /> GO TO HOME
              </Link>
              <button
                onClick={resetForm}
                className="flex-1 flex items-center justify-center gap-1 rounded-xl border border-slate-300 bg-white py-2 text-xs font-semibold text-slate-700 transition hover:bg-slate-50"
              >
                + REGISTER ANOTHER
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Elegant Bottom Footer */}
      <footer className="relative z-10 shrink-0 py-3 sm:py-4 text-center text-[10px] sm:text-xs font-medium text-slate-500">
        © 2026 Valanchery Festival. All rights reserved. Official Lucky Draw Portal · Valanchery
      </footer>
    </div>
  )
}
