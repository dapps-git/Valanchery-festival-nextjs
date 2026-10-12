import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Confetti } from '@/components/Confetti'
import { useApp } from '@/context/AppContext'

import { api } from '@/lib/api'
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  KeyRound,
  X,
  CheckCircle2,
  AlertCircle,
  Loader2,
  Eye,
  EyeOff,
} from 'lucide-react'

export function AdminLoginPage() {
  const navigate = useNavigate()
  const { login, isAdmin } = useApp()

  useEffect(() => {
    if (isAdmin) {
      navigate('/admin/dashboard', { replace: true })
    }
  }, [isAdmin, navigate])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)

  // Load remembered email from localStorage on mount (never store plaintext passwords)
  useEffect(() => {
    try {
      if (typeof localStorage !== 'undefined') {
        localStorage.removeItem('admin_saved_password') // Securely purge any legacy plaintext password
        const savedEmail = localStorage.getItem('admin_saved_email')
        if (savedEmail) setEmail(savedEmail)
      }
    } catch {}
  }, [])

  // Forgot Password State
  const [showForgotModal, setShowForgotModal] = useState(false)
  const [forgotStep, setForgotStep] = useState<1 | 2 | 3>(1)
  const [forgotEmail, setForgotEmail] = useState('')
  const [forgotOtp, setForgotOtp] = useState('')
  const [forgotToken, setForgotToken] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [forgotLoading, setForgotLoading] = useState(false)
  const [forgotError, setForgotError] = useState('')
  const [forgotSuccessMessage, setForgotSuccessMessage] = useState('')

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const ok = await login(email, password)
      if (!ok) {
        setError('Invalid admin credentials. Please check your email and password.')
        setLoading(false)
        return
      }

      // Store remembered email in localStorage on successful login (never store plaintext passwords)
      try {
        if (typeof localStorage !== 'undefined') {
          localStorage.setItem('admin_saved_email', email.trim().toLowerCase())
          localStorage.removeItem('admin_saved_password')
        }
      } catch {}

      setSuccess(true)
      setTimeout(() => {
        navigate('/admin/dashboard', { replace: true })
      }, 400)
    } catch {
      setError('Login failed. Please check your connection and try again.')
      setLoading(false)
    }
  }

  const openForgotModal = () => {
    setForgotEmail('')  // always start blank — user types the OTP email
    setForgotOtp('')
    setForgotToken('')
    setNewPassword('')
    setConfirmPassword('')
    setForgotError('')
    setForgotSuccessMessage('')
    setForgotStep(1)
    setShowForgotModal(true)
  }

  // Step 1: Send OTP
  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    const targetEmail = forgotEmail.trim().toLowerCase()
    if (!targetEmail) {
      setForgotError('Please enter your admin email address')
      return
    }

    // Server will validate whether this email is allowed

    setForgotLoading(true)
    try {
      const res = await api.forgotPassword(targetEmail)
      if (res.ok) {
        if (res.token) setForgotToken(res.token)
        setForgotStep(2)
        setForgotSuccessMessage(res.message || 'OTP sent. Please check your inbox & spam folder.')
      } else {
        setForgotError(res.error || 'Failed to send OTP. Please check email address.')
      }
    } catch (err: any) {
      setForgotError(err.message || 'Connection error. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  // Step 2: Verify OTP
  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    if (!forgotOtp.trim() || forgotOtp.trim().length !== 6) {
      setForgotError('Please enter the 6-digit OTP received in your email')
      return
    }

    setForgotLoading(true)
    try {
      const res = await api.verifyOtp(forgotEmail.trim(), forgotOtp.trim(), forgotToken)
      if (res.ok) {
        setForgotStep(3)
        setForgotSuccessMessage('OTP verified! Now choose your new admin password.')
      } else {
        setForgotError(res.error || 'Invalid or expired OTP code.')
      }
    } catch (err: any) {
      setForgotError(err.message || 'Verification error. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  // Step 3: Reset Password
  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setForgotError('')
    if (!newPassword.trim() || newPassword.length < 6) {
      setForgotError('Password must be at least 6 characters long')
      return
    }
    if (newPassword !== confirmPassword) {
      setForgotError('Passwords do not match. Please re-enter.')
      return
    }

    setForgotLoading(true)
    try {
      const res = await api.resetPassword(forgotEmail.trim(), forgotOtp.trim(), newPassword.trim(), forgotToken)
      if (res.ok) {
        setPassword(newPassword.trim())
        setShowForgotModal(false)
        setError('')
        alert('Password reset successfully! You can now log into the dashboard with your new password.')
      } else {
        setForgotError(res.error || 'Failed to update password. Please try again.')
      }
    } catch (err: any) {
      setForgotError(err.message || 'Password update failed. Please try again.')
    } finally {
      setForgotLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen min-h-[100dvh] w-full flex flex-col justify-between overflow-hidden select-none text-[#292524] font-sans font-normal bg-[#FAF8F5]">
      <Confetti active={success} />
      {success && <div className="pointer-events-none absolute inset-0 bg-white/40 animate-[flash_0.8s_ease] z-40" />}

      {/* Spacer where header was */}
      <div className="h-6" />

      {/* Center Login Box */}
      <main className="relative z-10 flex-1 flex items-center justify-center px-4 py-8">
        <div className="w-full max-w-[390px]">
          {/* Beige & White Card with subtle border and small radius */}
          <div className="bg-white border border-[#E8E3D8] p-7 sm:p-9 shadow-sm rounded-[6px]">
            {/* Header */}
            <div className="text-center space-y-1.5">
              <h1 className="text-2xl sm:text-[26px] font-medium text-stone-900 tracking-tight">
                Lucky Draw 2026
              </h1>
              <p className="text-xs text-stone-500 font-normal">
                Admin Authentication
              </p>
            </div>

            {/* Form */}
            <form onSubmit={submit} className="mt-6 space-y-4">
              {/* Admin Email */}
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-stone-700">
                  Admin Email
                </label>
                <div className="flex rounded-[6px] border border-[#E8E3D8] overflow-hidden focus-within:border-[#9A7B4F] transition bg-white shadow-2xs">
                  <span className="bg-[#FAF8F5] px-3.5 py-2.5 text-stone-500 border-r border-[#E8E3D8] flex items-center justify-center">
                    <Mail size={14} />
                  </span>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter admin email"
                    className="w-full px-3.5 py-2.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none font-normal bg-white"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-medium text-stone-700">
                    Password
                  </label>
                  <button
                    type="button"
                    onClick={openForgotModal}
                    className="text-[11px] font-medium text-stone-600 hover:text-stone-900 hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
                <div className="flex rounded-[6px] border border-[#E8E3D8] overflow-hidden focus-within:border-[#9A7B4F] transition bg-white shadow-2xs relative">
                  <span className="bg-[#FAF8F5] px-3.5 py-2.5 text-stone-500 border-r border-[#E8E3D8] flex items-center justify-center">
                    <Lock size={14} />
                  </span>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    className="w-full px-3.5 py-2.5 pr-10 text-xs text-stone-900 placeholder:text-stone-400 outline-none font-normal bg-white"
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition p-1 cursor-pointer"
                    title={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? <EyeOff size={15} /> : <Eye size={15} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="border border-red-200 bg-red-50 p-2.5 text-center text-xs text-red-700 rounded-[6px] font-medium">
                  {error}
                </div>
              )}

              {success && (
                <div className="border border-[#E8E3D8] bg-[#FAF8F5] p-2.5 text-center text-xs text-stone-800 flex items-center justify-center gap-1.5 rounded-[6px] font-medium">
                  <ShieldCheck size={14} className="text-[#9A7B4F]" />
                  <span>Logging in…</span>
                </div>
              )}

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading || success}
                  className="w-full flex items-center justify-center gap-2 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 py-3 text-xs font-medium tracking-wider text-white uppercase rounded-[6px] shadow-2xs transition active:scale-[0.99] disabled:opacity-50 cursor-pointer"
                >
                  <span>{loading ? 'Verifying…' : 'Access Dashboard'}</span>
                  <ArrowRight size={13} className="text-[#C2A676]" />
                </button>
              </div>
            </form>
          </div>
        </div>
      </main>

      {/* Forgot Password OTP Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-sm my-auto rounded-[6px] border border-[#E8E3D8] bg-white p-6 shadow-lg space-y-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-[#E8E3D8] pb-3">
              <div className="flex items-center gap-2 text-xs font-normal text-stone-900">
                <KeyRound size={14} className="text-[#9A7B4F]" />
                <span>Reset Admin Password</span>
              </div>
              <button
                type="button"
                onClick={() => setShowForgotModal(false)}
                className="text-stone-400 hover:text-stone-600 p-1 cursor-pointer"
              >
                <X size={15} />
              </button>
            </div>

            {/* Stepper indicator */}
            <div className="flex items-center justify-between text-[11px] text-stone-400 px-1 font-light">
              <span className={forgotStep === 1 ? 'text-stone-900 font-normal' : ''}>1. Email</span>
              <span>→</span>
              <span className={forgotStep === 2 ? 'text-stone-900 font-normal' : ''}>2. OTP Code</span>
              <span>→</span>
              <span className={forgotStep === 3 ? 'text-stone-900 font-normal' : ''}>3. New Password</span>
            </div>

            {forgotError && (
              <div className="p-2.5 rounded-[4px] bg-red-50 border border-red-200 text-red-700 text-xs flex items-start gap-1.5 font-light">
                <AlertCircle size={14} className="shrink-0 mt-0.5" />
                <span>{forgotError}</span>
              </div>
            )}

            {forgotSuccessMessage && !forgotError && (
              <div className="p-2.5 rounded-[4px] bg-[#FAF8F5] border border-[#E8E3D8] text-stone-800 text-xs flex items-start gap-1.5 font-light">
                <CheckCircle2 size={14} className="shrink-0 mt-0.5 text-[#9A7B4F]" />
                <span>{forgotSuccessMessage}</span>
              </div>
            )}

            {/* STEP 1: Enter Email */}
            {forgotStep === 1 && (
              <form onSubmit={handleSendOtp} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-normal text-stone-600 mb-1">
                    Registered Admin Email
                  </label>
                  <input
                    type="email"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                    placeholder="Enter email address"
                    className="w-full rounded-[4px] border border-[#E8E3D8] px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] transition"
                    required
                  />
                  <p className="mt-1 text-[10px] text-stone-400 font-light">
                    A 6-digit OTP verification code will be sent to the registered email.
                  </p>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 rounded-[6px] border border-[#E8E3D8] py-2 text-xs font-light text-stone-600 hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 rounded-[6px] border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 py-2 text-xs font-normal text-white transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Sending…</span>
                      </>
                    ) : (
                      <span>Send OTP Code</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 2: Enter OTP */}
            {forgotStep === 2 && (
              <form onSubmit={handleVerifyOtp} className="space-y-3.5 pt-1">
                <div>
                  <label className="block text-[11px] font-normal text-stone-600 mb-1">
                    Enter 6-Digit OTP
                  </label>
                  <input
                    type="text"
                    maxLength={6}
                    value={forgotOtp}
                    onChange={(e) => setForgotOtp(e.target.value.replace(/\D/g, ''))}
                    placeholder="123456"
                    className="w-full rounded-[4px] border border-[#E8E3D8] px-3 py-2 text-center font-mono text-base tracking-widest font-normal text-stone-900 outline-none focus:border-[#9A7B4F] transition"
                    required
                  />
                  <div className="mt-1.5 flex items-center justify-between text-[10px]">
                    <span className="text-stone-400 font-light">Sent to registered admin email</span>
                    <button
                      type="button"
                      onClick={handleSendOtp}
                      disabled={forgotLoading}
                      className="text-stone-700 hover:underline cursor-pointer font-light"
                    >
                      Resend OTP
                    </button>
                  </div>
                </div>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(1)}
                    className="flex-1 rounded-[6px] border border-[#E8E3D8] py-2 text-xs font-light text-stone-600 hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading || forgotOtp.length !== 6}
                    className="flex-1 rounded-[6px] border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 py-2 text-xs font-normal text-white transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Verifying…</span>
                      </>
                    ) : (
                      <span>Verify Code</span>
                    )}
                  </button>
                </div>
              </form>
            )}

            {/* STEP 3: Enter New Password */}
            {forgotStep === 3 && (
              <form onSubmit={handleResetPassword} className="space-y-3 pt-1">
                <div>
                  <label className="block text-[11px] font-normal text-stone-600 mb-1">
                    New Admin Password
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="At least 6 characters"
                      className="w-full rounded-[4px] border border-[#E8E3D8] px-3 py-1.5 pr-9 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition p-0.5 cursor-pointer"
                      title={showNewPassword ? 'Hide password' : 'Show password'}
                    >
                      {showNewPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-normal text-stone-600 mb-1">
                    Confirm New Password
                  </label>
                  <div className="relative">
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Re-enter password"
                      className="w-full rounded-[4px] border border-[#E8E3D8] px-3 py-1.5 pr-9 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] transition"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-2 top-1/2 -translate-y-1/2 text-stone-400 hover:text-stone-700 transition p-0.5 cursor-pointer"
                      title={showConfirmPassword ? 'Hide password' : 'Show password'}
                    >
                      {showConfirmPassword ? <EyeOff size={14} /> : <Eye size={14} />}
                    </button>
                  </div>
                </div>

                <p className="text-[10px] text-stone-400 font-light leading-normal">
                  ⚠️ Once saved, default password (<strong>Admin@2026</strong>) will be disabled permanently. Only your new password will be accepted.
                </p>

                <div className="pt-2 flex gap-2">
                  <button
                    type="button"
                    onClick={() => setForgotStep(2)}
                    className="flex-1 rounded-[6px] border border-[#E8E3D8] py-2 text-xs font-light text-stone-600 hover:bg-[#FAF8F5] cursor-pointer"
                  >
                    Back
                  </button>
                  <button
                    type="submit"
                    disabled={forgotLoading}
                    className="flex-1 rounded-[6px] border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 py-2 text-xs font-normal text-white transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
                  >
                    {forgotLoading ? (
                      <>
                        <Loader2 size={13} className="animate-spin" />
                        <span>Updating…</span>
                      </>
                    ) : (
                      <span>Save New Password</span>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="relative z-10 py-3 text-center text-[11px] text-stone-400 font-light">
        Lucky Draw 2026 Admin Portal
      </footer>
    </div>
  )
}
