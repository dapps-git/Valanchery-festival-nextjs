'use client'

import { useEffect, useRef, useState } from 'react'
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Ticket,
  Camera,
  ArrowRight,
  ShieldAlert,
  ShieldCheck,
  User,
  Phone,
  RotateCcw,
  ChevronDown,
  Info,
  Sparkles,
} from 'lucide-react'
import { useApp } from '../context/AppContext'
import { isValidIndianPhone } from '../lib/format'
import { Confetti } from './Confetti'
import { QrScannerModal } from './QrScannerModal'
import { checkDeviceRateLimit, recordDeviceRegistration } from '../lib/deviceRateLimit'
import { extractCouponId, formatCouponDisplay } from '../lib/tokenHelper'

interface RegisterCouponSectionProps {
  id?: string
  title?: string
  subtitle?: string
  compact?: boolean
  className?: string
}

export function RegisterCouponSection({
  id = 'register',
  title = 'Register Your Official Coupon',
  subtitle = 'Enter your 13-digit festival ticket number to enter the lucky draw pool',
  compact = false,
  className = '',
}: RegisterCouponSectionProps) {
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

    if (clean.length !== 13) {
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
      params.get('code')

    if (rawParam) {
      const extracted = extractCouponId(rawParam)
      if (extracted) {
        const capped = extracted.slice(0, 13).toUpperCase()
        setForm((f) => ({ ...f, couponId: capped }))
        checkToken(capped, true)
      }
    }
  }, [])

  const handleCouponChange = (val: string) => {
    const extracted = extractCouponId(val)
    const cleaned = (extracted || val.replace(/[^A-Za-z0-9]/g, '')).slice(0, 13).toUpperCase()
    setForm((f) => ({ ...f, couponId: cleaned }))
    setTokenStatus({ status: 'Idle', message: '' })
    if (errors.couponId) {
      setErrors((prev) => ({ ...prev, couponId: '' }))
    }
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
  }

  const clearCoupon = () => {
    if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current)
    lastValidatedTokenRef.current = ''
    setForm((f) => ({ ...f, couponId: '' }))
    setTokenStatus({ status: 'Idle', message: '' })
  }

  const [formError, setFormError] = useState('')

  const set = (key: string, value: string) => {
    let cleanVal = value
    if (key === 'name') {
      cleanVal = value.replace(/[^A-Za-z\s]/g, '')
    }
    setForm((f) => ({ ...f, [key]: cleanVal }))
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

    const rateCheck = checkDeviceRateLimit()
    if (rateCheck.isBlocked) {
      isSubmittingRef.current = false
      setIsSubmitting(false)
      setFormError(rateCheck.message)
      return
    }

    const errs: Record<string, string> = {}
    const userName = form.name.trim()
    const userPhone = form.phone.replace(/\D/g, '')
    const cleanToken = (extractCouponId(form.couponId) || form.couponId.replace(/[^A-Za-z0-9]/g, '')).slice(0, 13).toUpperCase()

    if (!userName) {
      errs.name = 'Please enter your full name.'
    } else if (userName.length < 2) {
      errs.name = 'Name must be at least 2 characters.'
    }

    if (!userPhone) {
      errs.phone = 'Please enter your 10-digit mobile number.'
    } else if (!isValidIndianPhone(userPhone)) {
      errs.phone = 'Please enter a valid 10-digit Indian phone number.'
    }

    if (!cleanToken) {
      errs.couponId = 'Coupon ID is required.'
    } else if (cleanToken.length !== 13) {
      errs.couponId = 'Coupon ID must be exactly 13 characters.'
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      isSubmittingRef.current = false
      setIsSubmitting(false)
      return
    }

    try {
      const verifyRes = await validateCouponAsync(cleanToken)
      if (!verifyRes.valid) {
        if (verifyRes.status === 'Used') {
          setTokenStatus({
            status: 'Used',
            message: verifyRes.message || 'This coupon has already been used and is no longer valid.',
          })
        } else {
          setTokenStatus({
            status: 'Invalid',
            message: verifyRes.message || 'Coupon not found. Please check your coupon code.',
          })
        }
        isSubmittingRef.current = false
        setIsSubmitting(false)
        return
      }

      const result = await registerParticipant({
        name: userName,
        phone: userPhone,
        couponId: cleanToken,
      })

      if (!result.ok) {
        const errorMsg = result.message || 'Registration failed.'
        if (errorMsg.toLowerCase().includes('already used') || errorMsg.toLowerCase().includes('already registered')) {
          setTokenStatus({
            status: 'Used',
            message: errorMsg,
          })
        } else {
          setFormError(errorMsg)
        }
        isSubmittingRef.current = false
        setIsSubmitting(false)
        return
      }

      recordDeviceRegistration()
      setSuccessId(result.id || 'SUCCESS')
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
    <section id={id} className={`scroll-mt-20 relative w-full ${className}`}>
      <Confetti active={confetti} />

      <QrScannerModal
        isOpen={isScannerOpen}
        onClose={() => setIsScannerOpen(false)}
        onScanSuccess={handleScanSuccess}
      />

      <div className="w-full max-w-xl mx-auto px-4 sm:px-6">
        {/* Section Header */}
        {!compact && (
          <div className="text-center space-y-2 mb-6">
            <div className="inline-flex items-center gap-1.5 bg-cyan-50 border border-cyan-200/80 px-3 py-1 rounded-full text-[11px] font-bold text-[#0284c7] uppercase tracking-wider">
              <Sparkles size={12} className="text-[#0284c7]" />
              <span>Official Lucky Draw Entry</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-slate-900 font-['Montserrat',sans-serif]">
              {title}
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 max-w-md mx-auto">
              {subtitle}
            </p>
          </div>
        )}

        {/* Card Frame */}
        <div className="w-full bg-white rounded-2xl shadow-xl shadow-cyan-950/10 border border-cyan-100 p-5 sm:p-7 relative overflow-hidden">
          {/* Subtle top cyan line */}
          <div className="absolute top-0 inset-x-0 h-1.5 bg-gradient-to-r from-cyan-500 via-[#0284c7] to-cyan-500" />

          {successId ? (
            /* Success Confirmation State */
            <div className="text-center space-y-4 py-2 animate-fade-in">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-xs">
                <CheckCircle2 size={32} />
              </div>

              <div>
                <h3 className="text-xl sm:text-2xl font-bold text-slate-900 font-['Montserrat',sans-serif]">
                  Registration Confirmed!
                </h3>
                <p className="text-xs text-slate-500 mt-1">
                  You are officially entered into the Valanchery Festival Lucky Draw pool.
                </p>
              </div>

              <div className="border border-cyan-100 bg-cyan-50/50 rounded-xl p-4 text-left space-y-2.5 text-xs">
                {registeredName && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Participant:</span>
                    <span className="font-bold text-slate-900">{registeredName}</span>
                  </div>
                )}
                {registeredCoupon && (
                  <div className="flex items-center justify-between">
                    <span className="text-slate-500 font-medium">Coupon Code:</span>
                    <span className="font-mono font-bold text-[#0097b2] inline-flex items-center gap-1.5">
                      <Ticket size={14} className="text-[#0097b2] shrink-0" />
                      <span>{formatCouponDisplay(registeredCoupon)}</span>
                    </span>
                  </div>
                )}
                <div className="flex items-center justify-between">
                  <span className="text-slate-500 font-medium">Draw Status:</span>
                  <span className="text-emerald-700 font-bold flex items-center gap-1 text-[11px]">
                    <ShieldCheck size={14} /> Active in Lucky Draw Pool
                  </span>
                </div>
              </div>

              <div className="pt-2 flex flex-col sm:flex-row items-center gap-2.5">
                <button
                  type="button"
                  onClick={resetForm}
                  className="w-full sm:flex-1 inline-flex items-center justify-center gap-2 bg-[#0097b2] hover:bg-[#0284c7] text-white py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider shadow-xs transition active:scale-95 cursor-pointer"
                >
                  <RotateCcw size={14} />
                  <span>Register Another Coupon</span>
                </button>
              </div>
            </div>
          ) : (
            /* Input Form */
            <div>
              {/* Header Logo */}
              <div className="flex justify-center mb-4">
                <img
                  src="/valanchery-shopping-festival-logo.png"
                  alt="Valanchery Shopping Festival - Season 2"
                  className="h-12 sm:h-14 w-auto object-contain"
                />
              </div>

              {formError && (
                <div className="mb-3 p-2.5 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700 flex items-center gap-2">
                  <XCircle size={15} className="shrink-0 text-red-600" />
                  <span>{formError}</span>
                </div>
              )}

              <form onSubmit={submit} className="space-y-3 sm:space-y-4">
                {/* 1. Coupon ID Field */}
                <div>
                  <div className="flex items-center justify-between mb-1.5">
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
                    <div className="flex items-center justify-between rounded-xl border border-emerald-300 bg-emerald-50 px-3.5 py-2.5">
                      <div className="flex items-center gap-2">
                        <CheckCircle2 size={18} className="text-emerald-600 shrink-0" />
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
                    <div className="rounded-xl border border-red-300 bg-red-50 p-3 text-left">
                      <div className="flex items-start justify-between">
                        <div className="flex items-start gap-2">
                          <XCircle size={16} className="text-red-600 shrink-0 mt-0.5" />
                          <div>
                            <p className="font-mono text-xs font-bold tracking-wider text-red-900">
                              {formatCouponDisplay(form.couponId)}
                            </p>
                            <p className="text-[10px] font-bold text-red-700 mt-0.5">INVALID · COUPON ALREADY USED</p>
                            <p className="text-[10px] text-red-600 leading-tight">
                              {tokenStatus.message || 'This coupon has already been redeemed.'}
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
                    <div>
                      <div className={`relative flex items-center border ${
                        (tokenStatus.status === 'Invalid' && tokenStatus.message) || errors.couponId
                          ? 'border-red-400 bg-red-50/20 focus-within:border-red-500 focus-within:ring-2 focus-within:ring-red-100'
                          : 'border-cyan-200/90 hover:border-cyan-300 focus-within:border-[#0097b2] focus-within:ring-2 focus-within:ring-cyan-100 bg-white'
                      } rounded-xl p-1 transition`}>
                        <Ticket size={17} className={`${(tokenStatus.status === 'Invalid' && tokenStatus.message) || errors.couponId ? 'text-red-400' : 'text-slate-400'} ml-2.5 shrink-0`} />
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
                          className="w-full px-2.5 py-1.5 text-xs sm:text-sm font-mono tracking-wider text-slate-800 placeholder:text-slate-400 outline-none uppercase bg-transparent"
                        />
                        {isValidatingToken && (
                          <div className="mr-2">
                            <Loader2 size={15} className="animate-spin text-[#0097b2]" />
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => setIsScannerOpen(true)}
                          className="inline-flex items-center gap-1.5 bg-[#e0f7fc] hover:bg-[#cbf1f9] text-[#0097b2] px-3 py-2 rounded-lg text-xs font-bold transition whitespace-nowrap shrink-0 cursor-pointer border border-cyan-100"
                        >
                          <Camera size={13} />
                          <span>Scan QR</span>
                        </button>
                      </div>

                      {((tokenStatus.status === 'Invalid' && tokenStatus.message) || errors.couponId) && (
                        <p className="mt-1.5 text-[11px] font-medium text-red-600 flex items-center gap-1">
                          <ShieldAlert size={12} className="shrink-0" />
                          <span>{tokenStatus.message || errors.couponId}</span>
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Full Name Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Full Name <span className="text-cyan-500">*</span>
                  </label>
                  <div className="flex items-center border border-cyan-200/90 hover:border-cyan-300 focus-within:border-[#0097b2] focus-within:ring-2 focus-within:ring-cyan-100 rounded-xl bg-white px-3 py-2.5 transition">
                    <User size={17} className="text-slate-400 shrink-0 mr-2.5" />
                    <input
                      type="text"
                      value={form.name}
                      onChange={(e) => set('name', e.target.value)}
                      placeholder="Enter your full name"
                      className="w-full text-xs sm:text-sm text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
                    />
                  </div>
                  {errors.name && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.name}</p>}
                </div>

                {/* 3. Mobile Number Field */}
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Mobile Number <span className="text-cyan-500">*</span>
                  </label>
                  <div className="flex items-center border border-cyan-200/90 hover:border-cyan-300 focus-within:border-[#0097b2] focus-within:ring-2 focus-within:ring-cyan-100 rounded-xl bg-white overflow-hidden transition">
                    <div className="px-3 py-2.5 text-slate-700 font-bold text-xs border-r border-slate-100 flex items-center gap-1 select-none shrink-0 bg-slate-50/50">
                      <span>+91</span>
                      <ChevronDown size={13} className="text-slate-400" />
                    </div>
                    <Phone size={16} className="text-slate-400 ml-3 shrink-0" />
                    <input
                      type="tel"
                      maxLength={10}
                      value={form.phone}
                      onChange={(e) => {
                        const digits = e.target.value.replace(/\D/g, '').slice(0, 10)
                        set('phone', digits)
                      }}
                      placeholder="10-digit mobile number"
                      className="w-full px-2.5 py-2.5 text-xs sm:text-sm font-mono tracking-wider text-slate-800 placeholder:text-slate-400 outline-none bg-transparent"
                    />
                  </div>
                  {errors.phone && <p className="mt-1 text-[11px] font-medium text-red-600">{errors.phone}</p>}
                  
                  <p className="text-[11px] text-slate-400 mt-1.5 flex items-center gap-1">
                    <Info size={12} className="text-[#0097b2] shrink-0" />
                    <span>Winners will be contacted directly on this mobile number.</span>
                  </p>
                </div>

                {/* Submit Button */}
                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={tokenStatus.status === 'Used' || tokenStatus.status === 'Invalid' || isSubmitting}
                    className="w-full flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#0097b2] via-[#0284c7] to-[#0ea5e9] hover:opacity-95 text-white py-3 sm:py-3.5 text-xs sm:text-sm font-bold tracking-wider uppercase transition shadow-md shadow-cyan-500/20 active:scale-[0.99] disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 size={16} className="animate-spin text-white" />
                        <span>CONFIRMING ENTRY...</span>
                      </>
                    ) : (
                      <>
                        <span>CONFIRM & ENTER LUCKY DRAW</span>
                        <ArrowRight size={16} />
                      </>
                    )}
                  </button>
                </div>
              </form>

              {/* Trust Footer */}
              <div className="mt-3.5 text-center">
                <div className="inline-flex items-center justify-center gap-1.5 text-[11px] font-medium text-[#0097b2]">
                  <ShieldCheck size={14} className="text-[#0097b2]" />
                  <span>Official KVVES Valanchery Merchant Festival Portal</span>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
