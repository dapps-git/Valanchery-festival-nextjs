import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Ticket,
  Camera,
  ArrowRight,
  ShieldCheck,
  RotateCcw,
  User,
  ChevronDown,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { isValidIndianPhone } from '../lib/format'
import { Confetti } from './Confetti'
import { QrScannerModal } from './QrScannerModal'
import { extractCouponId, formatCouponDisplay } from '../lib/tokenHelper'

export function HomeRegisterSection() {
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

  // Auto-fill from URL query params
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const rawParam =
      params.get('coupon') ||
      params.get('token') ||
      params.get('id') ||
      params.get('c') ||
      params.get('code')

    const extracted = extractCouponId(rawParam)
    if (extracted) {
      setForm((f) => ({ ...f, couponId: extracted }))
      checkToken(extracted, true)
    }
  }, [])

  const checkToken = (tokenInput: string, immediate = false) => {
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current)
    }

    const clean = extractCouponId(tokenInput) || tokenInput.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase()
    if (!clean) {
      setTokenStatus({ status: 'Idle', message: '' })
      return
    }
    if (clean.length < 5 || clean.length > 16) {
      setTokenStatus({
        status: 'Invalid',
        message: 'Please enter a valid coupon code.',
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
            message: 'Valid Festival Coupon! Ready for entry.',
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

  const handleCouponChange = (val: string) => {
    const extracted = extractCouponId(val)
    const cleaned = extracted || val.replace(/[^A-Za-z0-9]/g, '').slice(0, 16).toUpperCase()
    setForm((f) => ({ ...f, couponId: cleaned }))
    checkToken(cleaned, false)
  }

  const handleScanSuccess = (scannedToken: string) => {
    setForm((f) => ({ ...f, couponId: scannedToken }))
    checkToken(scannedToken, true)
  }

  const clearCoupon = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    lastValidatedTokenRef.current = ''
    setForm((f) => ({ ...f, couponId: '' }))
    setTokenStatus({ status: 'Idle', message: '' })
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

    // 1. Coupon ID validation
    if (!form.couponId.trim()) {
      next.couponId = 'Coupon code is required'
    } else {
      const cleanToken = extractCouponId(form.couponId) || form.couponId.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase()
      if (cleanToken.length < 5 || cleanToken.length > 16) {
        next.couponId = 'Please enter a valid coupon code.'
      } else {
        // Skip redundant check if already validated as Valid
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

    // 2. Name validation
    if (!form.name.trim()) {
      next.name = 'Full name is required'
    }

    // 3. Phone validation
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
          setTokenStatus({ status: 'Invalid', message: result.error })
        } else {
          setFormError(result.error)
        }
        isSubmittingRef.current = false
        setIsSubmitting(false)
        return
      }

      setSuccessId(result.id || 'OK')
      setRegisteredCoupon(cleanToken)
      setRegisteredName(userName)
      setConfetti(true)
      setTimeout(() => setConfetti(false), 5000)
    } catch {
      setFormError('Failed to register. Please check your internet connection.')
    } finally {
      isSubmittingRef.current = false
      setIsSubmitting(false)
    }
  }

  return (
    <section
      id="register"
      className="scroll-mt-16 sm:scroll-mt-20 relative py-10 sm:py-14 px-3.5 sm:px-6 flex flex-col justify-center items-center font-sans"
    >
      <Confetti active={confetti} />

      {/* QR Scanner Modal */}
      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      {/* Card Wrapper - Clean Focused Registration Card */}
      <div className="relative z-10 w-full max-w-lg mx-auto shadow-2xl shadow-cyan-950/5 border border-cyan-100 bg-white overflow-hidden rounded-2xl p-6 sm:p-8">
        <div className="flex flex-col justify-center">
          {/* Centered Heading with standard alignment & subtitle */}
          <div className="mb-6 text-center space-y-1">
            <span className="inline-block px-3 py-1 bg-cyan-50 text-[#0891b2] text-[11px] font-bold uppercase tracking-widest rounded-full border border-cyan-100">
              Official Entry
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 tracking-tight font-sans">
              Register Your Coupon
            </h2>
            <p className="text-xs text-slate-500 font-normal">
              Enter your coupon code and phone to participate in the lucky draw
            </p>
          </div>

          {successId ? (
            /* Success State */
            <div className="text-center space-y-4 py-2">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-cyan-50 text-[#0891b2] border border-cyan-200 shadow-xs">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h3 className="text-lg font-black text-[#192231]">
                  Registration Confirmed!
                </h3>
                <p className="text-xs text-slate-600 mt-1">
                  You are officially entered into the Valanchery Festival Lucky Draw pool.
                </p>
              </div>

              <div className="border border-cyan-100 bg-cyan-50/40 rounded-xl p-4 text-left space-y-2 text-xs">
                {registeredName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Participant Name:</span>
                    <span className="font-bold text-slate-900">{registeredName}</span>
                  </div>
                )}
                {registeredCoupon && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Coupon Code:</span>
                    <span className="font-mono font-bold text-[#0891b2]">🎫 {registeredCoupon}</span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Status:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1">
                    <ShieldCheck size={14} /> Active in Raffle Pool
                  </span>
                </div>
              </div>

              <div className="pt-2">
                <button
                  type="button"
                  onClick={resetForm}
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#06b6d4] to-[#0891b2] hover:from-[#0891b2] hover:to-[#0e7490] text-white px-6 py-2.5 rounded-xl text-xs font-extrabold shadow-md transition cursor-pointer"
                >
                  <RotateCcw size={13} /> Register Another Coupon
                </button>
              </div>
            </div>
          ) : (
            /* Main Form */
            <form onSubmit={submit} className="space-y-4">
              {formError && (
                <div className="border border-red-200 bg-red-50 p-3 rounded-lg text-xs text-red-700 font-medium">
                  {formError}
                </div>
              )}

              {/* 1. Coupon Code Section */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 text-left">
                  Coupon ID *
                </label>
                {/* Dynamic Token Display based on verification status */}
                {form.couponId ? (
                  <div>
                    {/* Valid Token State */}
                    {tokenStatus.status === 'Valid' && (
                      <div className="flex items-center justify-between rounded-lg border border-emerald-600/30 bg-emerald-50 px-3.5 py-2.5">
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
                          className="text-[11px] text-slate-500 hover:text-slate-800 underline font-medium cursor-pointer"
                        >
                          Change
                        </button>
                      </div>
                    )}

                    {/* ALREADY USED State */}
                    {tokenStatus.status === 'Used' && (
                      <div className="rounded-lg border border-red-400 bg-red-50 p-2.5 text-left">
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-2">
                            <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                            <div>
                              <p className="font-mono text-xs font-bold tracking-wider text-red-900">
                                {formatCouponDisplay(form.couponId)}
                              </p>
                              <p className="text-[10px] font-bold text-red-700 mt-0.5">COUPON ALREADY REDEEMED</p>
                              <p className="text-[10px] text-red-600 leading-tight mt-0.5">
                                {tokenStatus.message || 'This coupon has already been redeemed and is no longer valid.'}
                              </p>
                            </div>
                          </div>
                          <button
                            type="button"
                            onClick={clearCoupon}
                            className="text-[11px] text-red-700 underline font-bold cursor-pointer shrink-0 ml-2"
                          >
                            Change
                          </button>
                        </div>
                      </div>
                    )}

                    {/* INVALID Token State */}
                    {tokenStatus.status === 'Invalid' && (
                      <div className="space-y-1">
                        <div className="relative">
                          <input
                            type="text"
                            value={form.couponId}
                            onChange={(e) => handleCouponChange(e.target.value)}
                            placeholder=""
                            className="w-full rounded-lg border border-red-300 bg-white px-3.5 py-2.5 font-mono text-sm font-bold text-slate-900 outline-none focus:border-red-500"
                          />
                          <button
                            type="button"
                            onClick={clearCoupon}
                            className="absolute right-2.5 top-2.5 text-[10px] font-bold text-slate-400 hover:text-slate-700 cursor-pointer"
                          >
                            CLEAR
                          </button>
                        </div>
                        <p className="text-[11px] text-red-600 font-medium">{tokenStatus.message}</p>
                      </div>
                    )}

                    {/* Idle State */}
                    {tokenStatus.status === 'Idle' && (
                      <input
                        type="text"
                        value={form.couponId}
                        onChange={(e) => handleCouponChange(e.target.value)}
                        placeholder="e.g. VSF-1234-5678"
                        className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm font-bold text-slate-900 outline-none focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-500/20 transition"
                      />
                    )}
                  </div>
                ) : (
                  <div className="relative flex items-center">
                    <input
                      type="text"
                      value={form.couponId}
                      onChange={(e) => handleCouponChange(e.target.value)}
                      placeholder="Enter 13-digit coupon code"
                      className="w-full rounded-xl border border-slate-200 bg-white px-4 py-3 font-mono text-sm font-semibold text-slate-900 outline-none focus:border-[#0891b2] focus:ring-2 focus:ring-cyan-500/20 pr-28 transition"
                    />
                    {isValidatingToken ? (
                      <Loader2 size={16} className="animate-spin text-cyan-600 absolute right-3" />
                    ) : (
                      <button
                        type="button"
                        onClick={() => setIsScannerOpen(true)}
                        className="absolute right-1.5 flex items-center gap-1.5 rounded-lg bg-cyan-50 hover:bg-cyan-100 text-[#0891b2] px-3 py-2 text-xs font-bold transition cursor-pointer border border-cyan-200"
                      >
                        <Camera size={13} /> Scan QR
                      </button>
                    )}
                  </div>
                )}

                {errors.couponId && !form.couponId && (
                  <p className="text-[11px] text-red-600 font-medium">{errors.couponId}</p>
                )}
              </div>

              {/* 2. Full Name */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 text-left">
                  Full Name *
                </label>
                <div
                  className={`flex rounded-xl border overflow-hidden transition ${
                    errors.name ? 'border-red-400 bg-red-50/50' : 'border-slate-200 focus-within:border-[#0891b2] focus-within:ring-2 focus-within:ring-cyan-500/20'
                  }`}
                >
                  <span className="bg-slate-50 px-3.5 py-2.5 text-slate-400 border-r border-slate-200 flex items-center justify-center">
                    <User size={16} />
                  </span>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => set('name', e.target.value)}
                    placeholder="Enter your full name"
                    className="w-full px-4 py-3 text-sm font-medium text-slate-900 outline-none bg-white placeholder:text-slate-400"
                  />
                </div>
                {errors.name && <p className="text-[11px] text-red-600 font-medium">{errors.name}</p>}
              </div>

              {/* 3. Mobile Number */}
              <div className="space-y-1.5">
                <label className="block text-xs font-bold text-slate-800 text-left">
                  Mobile Number *
                </label>
                <div
                  className={`flex rounded-xl border overflow-hidden transition ${
                    errors.phone ? 'border-red-400 bg-red-50/50' : 'border-slate-200 focus-within:border-[#0891b2] focus-within:ring-2 focus-within:ring-cyan-500/20'
                  }`}
                >
                  <span className="bg-slate-50 px-3.5 py-2.5 text-xs font-semibold text-slate-700 border-r border-slate-200 flex items-center gap-1">
                    +91 <ChevronDown size={13} className="text-slate-400" />
                  </span>
                  <input
                    type="tel"
                    inputMode="numeric"
                    maxLength={10}
                    value={form.phone}
                    onChange={(e) => set('phone', e.target.value.replace(/\D/g, '').slice(0, 10))}
                    placeholder="10-digit mobile number"
                    className="w-full px-4 py-3 text-sm font-medium text-slate-900 outline-none bg-white placeholder:text-slate-400"
                  />
                </div>
                {errors.phone && <p className="text-[11px] text-red-600 font-medium">{errors.phone}</p>}
                <p className="text-[11px] text-slate-400 text-left pt-0.5">
                  Winners will be contacted directly on this mobile number.
                </p>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-[#06b6d4] to-[#0891b2] hover:from-[#0891b2] hover:to-[#0e7490] text-white py-3.5 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wider shadow-lg shadow-cyan-500/25 transition active:scale-98 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Verifying & Entering...</span>
                    </>
                  ) : (
                    <>
                      <span>CONFIRM & ENTER DRAW</span>
                      <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </div>

              <div className="flex items-center justify-center gap-1.5 text-xs text-slate-500 font-medium pt-1">
                <ShieldCheck size={14} className="text-cyan-600" />
                <span>Safe and Secured · Official KVVES Portal</span>
              </div>
            </form>
          )}
        </div>
      </div>
    </section>
  )
}
