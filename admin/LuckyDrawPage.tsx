import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Confetti } from '@/components/Confetti'
import { Toast } from '@/components/Toast'
import { useApp } from '@/context/AppContext'
import { api } from '@/lib/api'
import { compressImageToWebP } from '@/lib/imageHelper'
import type { Participant, Prize, CompetitionType } from '@/types'
import {
  Sparkles,
  Trophy,
  RotateCcw,
  Gift,
  Plus,
  ChevronDown,
  Check,
  CheckCircle2,
  X,
  Upload,
  Loader2,
  Ticket,
  Users,
  ShieldCheck,
  AlertCircle,
  ArrowRight,
  Award,
} from 'lucide-react'

type Phase = 'ready' | 'spinning' | 'verifying' | 'reveal' | 'done'

export function LuckyDrawPage() {
  const { data, getPrize, confirmWinner, addPrize, refreshData } = useApp()
  const location = useLocation()
  const navigate = useNavigate()

  // 1. Competition selection: 'Mega' | 'Normal' (default to Mega or query param)
  const queryComp = new URLSearchParams(location.search).get('competition') as CompetitionType | null
  const [competitionType, setCompetitionType] = useState<CompetitionType>(
    queryComp === 'Normal' ? 'Normal' : 'Mega'
  )

  // Query gift ID if navigated from gifts page
  const queryGiftId = useMemo(() => {
    return new URLSearchParams(location.search).get('giftId')
  }, [location.search])

  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(queryGiftId)
  const [showPrizeSelector, setShowPrizeSelector] = useState(false)
  const [showAddPrizeModal, setShowAddPrizeModal] = useState(false)

  // Dynamic participant pool loaded from DATABASE according to eligibility rules
  const [eligiblePool, setEligiblePool] = useState<Participant[]>([])
  const [isLoadingPool, setIsLoadingPool] = useState(true)
  const [poolError, setPoolError] = useState('')

  // Temporary / Preview Winner (CRITICAL: NEVER saved to DB until admin clicks CONFIRM)
  const [previewWinner, setPreviewWinner] = useState<Participant | null>(null)
  const [confirmedWinnerInfo, setConfirmedWinnerInfo] = useState<{
    winner: Participant
    prize: Prize
    competitionType: CompetitionType
  } | null>(null)

  // Cloudinary state for adding gift on the fly
  const [newGift, setNewGift] = useState({
    name: '',
    value: '',
    description: '',
    image: '',
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState('')

  // Load Competition-specific gifts from database
  const competitionGifts = useMemo(() => {
    return (data.prizes || []).filter((p) => {
      if (competitionType === 'Mega') {
        return p.competitionType === 'Mega'
      } else {
        return p.competitionType === 'Normal' || !p.competitionType
      }
    })
  }, [data.prizes, competitionType])

  // Determine active prize
  const activePrize: Prize = useMemo(() => {
    if (selectedPrizeId) {
      const found = competitionGifts.find((p) => p.id === selectedPrizeId)
      if (found) return found
    }
    // Prefer the first unawarded/available gift
    const available = competitionGifts.find((p) => p.status !== 'Awarded')
    if (available) return available

    if (competitionGifts.length > 0) {
      return competitionGifts[0]
    }
    return {
      id: `default-${competitionType.toLowerCase()}-gift`,
      name: `${competitionType} Grand Bumper Prize`,
      value: '',
      description: `Official ${competitionType} Competition Prize`,
      image: '',
      assignedDrawId: null,
      status: 'Available',
      competitionType,
    }
  }, [selectedPrizeId, competitionGifts, competitionType])

  // Fetch dynamic eligible participant pool from DATABASE on competition switch
  const fetchEligibleParticipants = async (comp: CompetitionType) => {
    setIsLoadingPool(true)
    setPoolError('')
    try {
      const res = await api.getEligibleParticipants(comp)
      if (res && res.ok && Array.isArray(res.participants)) {
        // Enforce strict phone-level block for Mega winners, and couponId exclusion for Normal winners
        const knownWinners = data.winners || []
        const participantsList = data.participants || []
        const partMap = new Map(participantsList.map((p) => [p.id, p]))

        const megaWonCoupons = new Set<string>()
        const megaWonPhones = new Set<string>()
        const normalWonCoupons = new Set<string>()

        knownWinners.forEach((w) => {
          const cId = (w.couponId || (w as any).participantCouponId || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
          const p = partMap.get(w.participantId)
          const phone = (p?.phone || (w as any).phone || '').replace(/\D/g, '').slice(-10)

          if (w.competitionType === 'Mega') {
            if (cId) megaWonCoupons.add(cId)
            if (w.participantId) megaWonCoupons.add(w.participantId)
            if (phone) megaWonPhones.add(phone)
          } else {
            if (cId) normalWonCoupons.add(cId)
            if (w.participantId) normalWonCoupons.add(w.participantId)
          }
        })

        const sanitized = res.participants.filter((p) => {
          const c = (p.couponId || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
          const phone = (p.phone || '').replace(/\D/g, '').slice(-10)
          if (!c) return false

          // 1. SUPREME RULE: Once a phone number has won Mega, it is BLOCKED from BOTH Mega AND Normal
          if (phone && megaWonPhones.has(phone)) return false

          if (comp === 'Mega') {
            // Mega: Specific coupon cannot win Mega again
            if (megaWonCoupons.has(c) || (p.id && megaWonCoupons.has(p.id))) return false
          } else {
            // Normal: Coupon that won Mega or Normal cannot win Normal again
            if (megaWonCoupons.has(c) || normalWonCoupons.has(c) || (p.id && normalWonCoupons.has(p.id))) return false
          }
          return true
        })
        setEligiblePool(sanitized)
      } else {
        // Fallback to strict frontend matrix calculation using database data
        computeFallbackPool(comp)
      }
    } catch {
      computeFallbackPool(comp)
    } finally {
      setIsLoadingPool(false)
    }
  }

  // Exact Competition Eligibility Matrix:
  // - Never won: Mega ✅, Normal ✅
  // - Won Normal: Mega ✅ (Normal winners can enter Mega with other coupons), Normal ❌ (That coupon cannot win Normal twice)
  // - Won Mega: Mega ❌, Normal ❌ (PHONE NUMBER BLOCKED from both competitions forever)
  const computeFallbackPool = (comp: CompetitionType) => {
    const winners = data.winners || []
    const prizes = data.prizes || []
    const draws = data.draws || []
    const allParticipants: Participant[] = data.participants || []
    const partMap = new Map(allParticipants.map((p) => [p.id, p]))

    const prizeMap = new Map(prizes.map((p) => [p.id, p]))
    const drawMap = new Map(draws.map((d) => [d.id, d]))

    const megaWinnerCoupons = new Set<string>()
    const megaWinnerPhones = new Set<string>()
    const normalWinnerCoupons = new Set<string>()

    winners.forEach((w) => {
      const prize = prizeMap.get(w.prizeId)
      const draw = drawMap.get(w.drawId)
      const compType: CompetitionType =
        w.competitionType ||
        (draw as any)?.competitionType ||
        prize?.competitionType ||
        'Normal'

      const cId = (w.couponId || (w as any).participantCouponId || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
      const p = partMap.get(w.participantId)
      const phone = (p?.phone || (w as any).phone || '').replace(/\D/g, '').slice(-10)

      if (compType === 'Mega') {
        if (w.participantId) megaWinnerCoupons.add(w.participantId)
        if (cId) megaWinnerCoupons.add(cId)
        if (phone) megaWinnerPhones.add(phone)
      } else {
        if (w.participantId) normalWinnerCoupons.add(w.participantId)
        if (cId) normalWinnerCoupons.add(cId)
      }
    })

    const participants = allParticipants.filter(
      (p: Participant) => p.status === 'Active' && p.eligibility !== 'Ineligible'
    )

    let filtered: Participant[] = []
    if (comp === 'Mega') {
      filtered = participants.filter((p) => {
        const phone = (p.phone || '').replace(/\D/g, '').slice(-10)
        const c = (p.couponId || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        if (phone && megaWinnerPhones.has(phone)) return false
        if (megaWinnerCoupons.has(p.id) || (c && megaWinnerCoupons.has(c))) return false
        return true
      })
    } else {
      filtered = participants.filter((p) => {
        const phone = (p.phone || '').replace(/\D/g, '').slice(-10)
        const c = (p.couponId || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        if (phone && megaWinnerPhones.has(phone)) return false
        if (megaWinnerCoupons.has(p.id) || (c && megaWinnerCoupons.has(c))) return false
        if (normalWinnerCoupons.has(p.id) || (c && normalWinnerCoupons.has(c))) return false
        return true
      })
    }

    setEligiblePool(filtered)
  }

  // Re-fetch pool whenever competitionType changes or app data refreshes
  useEffect(() => {
    fetchEligibleParticipants(competitionType)
    setSelectedPrizeId(null)
    resetSpin()
  }, [competitionType])

  // Wheel animation states
  const [phase, setPhase] = useState<Phase>('ready')
  const [display, setDisplay] = useState<Participant | null>(null)
  const [progress, setProgress] = useState(0)
  const [showConfirmModal, setShowConfirmModal] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [toast, setToast] = useState('')
  const [confirmError, setConfirmError] = useState('')
  const [flash, setFlash] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  useEffect(() => {
    if (phase === 'ready' && eligiblePool.length > 0 && !display) {
      setDisplay(eligiblePool[0])
    }
  }, [eligiblePool, phase, display])

  const pickRandomEligible = () => {
    if (eligiblePool.length === 0) return null
    return eligiblePool[Math.floor(Math.random() * eligiblePool.length)]
  }

  // START SPIN (Preview result only - NOT SAVED TO DATABASE)
  const startDraw = () => {
    if (!eligiblePool.length || phase === 'spinning' || phase === 'verifying') return
    const chosen = pickRandomEligible()
    if (!chosen) return

    setPreviewWinner(chosen)
    setPhase('spinning')
    setProgress(0)
    setShowConfirmModal(false)
    setConfirmError('')

    const duration = 4000
    const start = Date.now()
    let delay = 50

    const tick = () => {
      const elapsed = Date.now() - start
      setProgress(Math.min(100, (elapsed / duration) * 100))
      const idx = Math.floor(Math.random() * eligiblePool.length)
      setDisplay(eligiblePool[idx])

      if (elapsed < duration - 1200) {
        delay = Math.min(160, delay + 3)
        timers.current.push(window.setTimeout(tick, delay))
      } else if (elapsed < duration) {
        timers.current.push(window.setTimeout(tick, 220))
      } else {
        setDisplay(chosen)
        setPhase('verifying')
        timers.current.push(
          window.setTimeout(() => {
            setFlash(true)
            setPhase('reveal')
            timers.current.push(
              window.setTimeout(() => {
                setFlash(false)
                setPhase('done')
                setShowConfirmModal(true)
              }, 700)
            )
          }, 1400)
        )
      }
    }
    tick()
  }

  // CANCEL / RESTART DRAW: Clears temporary result without writing anything to DB
  const resetSpin = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    setShowConfirmModal(false)
    setPhase('ready')
    setPreviewWinner(null)
    setProgress(0)
    setConfirmError('')
  }

  // CONFIRM WINNER: ONLY now does the system validate on backend and persist to DB
  const handleConfirmWinner = async () => {
    if (!previewWinner || !activePrize) return
    setIsConfirming(true)
    setConfirmError('')

    try {
      const matchingDraw = (data.draws || []).find(
        (d) => (d.prizeId === activePrize.id || d.status === 'Upcoming') && d.competitionType === competitionType
      )
      const drawIdToUse = matchingDraw ? matchingDraw.id : `draw-${Date.now()}`

      const res = await confirmWinner(
        previewWinner.id,
        drawIdToUse,
        activePrize.id,
        competitionType
      )

      if (res.ok) {
        setShowConfirmModal(false)
        setToast(`Winner "${previewWinner.name}" permanently confirmed & saved for ${competitionType} Draw!`)
        // Refresh pool immediately from database to remove winner
        fetchEligibleParticipants(competitionType)
        await refreshData().catch(() => {})
        setTimeout(() => {
          navigate('/admin/winners')
        }, 400)
      } else {
        setConfirmError(res.error || 'Backend validation rejected this winner.')
      }
    } catch (err: any) {
      setConfirmError(err.message || 'Error saving winner to database.')
    } finally {
      setIsConfirming(false)
    }
  }

  // Cloudinary image upload for new gift with in-browser WebP compression
  const handleGiftImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadSuccess('')

    let webpDataUrl = ''
    try {
      const { blob, dataUrl } = await compressImageToWebP(file, 1200, 0.82)
      webpDataUrl = dataUrl

      const formData = new FormData()
      formData.append('file', blob, `${file.name.replace(/\.[^/.]+$/, '')}.webp`)

      const token = typeof localStorage !== 'undefined' ? localStorage.getItem('admin_jwt_token') : ''
      const headers: Record<string, string> = {}
      if (token) headers['Authorization'] = `Bearer ${token}`

      const res = await fetch('/api/upload', {
        method: 'POST',
        headers,
        body: formData,
      })
      const json = await res.json()
      if (json.ok && json.url) {
        setNewGift((prev) => ({ ...prev, image: json.url }))
        setUploadSuccess('Compressed & uploaded to Cloudinary WebP!')
        setTimeout(() => setUploadSuccess(''), 3000)
      } else {
        throw new Error(json.error || 'Upload error')
      }
    } catch {
      if (webpDataUrl) {
        setNewGift((prev) => ({ ...prev, image: webpDataUrl }))
        setUploadSuccess('Compressed to WebP')
        setTimeout(() => setUploadSuccess(''), 3000)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleSaveNewGift = (e: React.FormEvent) => {
    e.preventDefault()
    if (!newGift.name.trim()) return

    const newId = addPrize({
      name: newGift.name.trim(),
      value: newGift.value.trim() || '₹0',
      description: newGift.description.trim() || `${competitionType} Competition Prize`,
      image: newGift.image || '',
      assignedDrawId: null,
      status: 'Available',
      competitionType,
    })

    setSelectedPrizeId(newId)
    setShowAddPrizeModal(false)
    setToast(`${competitionType} Gift "${newGift.name}" added to Live Stage!`)
    setNewGift({
      name: '',
      value: '',
      description: '',
      image: '',
    })
  }

  return (
    <div className="relative w-full max-w-6xl mx-auto p-2 sm:p-4 font-sans font-normal text-[#292524] space-y-4">
      <Confetti active={phase === 'reveal' || phase === 'done'} />
      {flash && <div className="pointer-events-none absolute inset-0 z-20 bg-white animate-[flash_0.6s_ease]" />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      {/* ─────────────────────────────────────────────────────────────
          1. TOP BAR: COMPETITION SELECTOR & ELIGIBILITY BAR
      ─────────────────────────────────────────────────────────────── */}
      <div className="w-full flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 border border-[#E8E3D8] bg-white p-2.5 rounded-[8px] shadow-2xs">
        {/* Competition Switcher */}
        <div className="flex items-center gap-1.5 p-1 bg-[#FAF8F5] rounded-[6px] border border-[#E8E3D8] shrink-0">
          <button
            type="button"
            onClick={() => {
              if (phase === 'spinning' || phase === 'verifying') return
              setCompetitionType('Mega')
            }}
            className={`py-2 px-3.5 rounded-[4px] text-xs font-bold tracking-wider uppercase transition flex items-center gap-2 cursor-pointer ${
              competitionType === 'Mega'
                ? 'bg-gradient-to-r from-amber-600 to-amber-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white'
            }`}
          >
            <Trophy size={14} className={competitionType === 'Mega' ? 'text-amber-200' : 'text-stone-400'} />
            <span>MEGA COMPETITION</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (phase === 'spinning' || phase === 'verifying') return
              setCompetitionType('Normal')
            }}
            className={`py-2 px-3.5 rounded-[4px] text-xs font-bold tracking-wider uppercase transition flex items-center gap-2 cursor-pointer ${
              competitionType === 'Normal'
                ? 'bg-gradient-to-r from-cyan-600 to-cyan-700 text-white shadow-xs'
                : 'text-stone-600 hover:text-stone-900 hover:bg-white'
            }`}
          >
            <Gift size={14} className={competitionType === 'Normal' ? 'text-cyan-200' : 'text-stone-400'} />
            <span>NORMAL COMPETITION</span>
          </button>
        </div>

        {/* Dynamic Eligibility Rule Banner */}
        <div className="flex-1 px-3 py-2 rounded-[6px] bg-[#FAF8F5] border border-[#E8E3D8] text-[11px] text-stone-600 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className={`h-2.5 w-2.5 rounded-full shrink-0 ${
                competitionType === 'Mega' ? 'bg-amber-500 animate-pulse' : 'bg-cyan-500 animate-pulse'
              }`}
            />
            <span>
              {competitionType === 'Mega' ? (
                <>
                  <strong className="text-stone-900 font-semibold">Mega Eligibility:</strong> Open to all participants, including Normal winners. Previous Mega winners excluded.
                </>
              ) : (
                <>
                  <strong className="text-stone-900 font-semibold">Normal Eligibility:</strong> Only participants who have never won any draw (Mega or Normal) can enter.
                </>
              )}
            </span>
          </div>
          <Link
            to={competitionType === 'Mega' ? '/admin/mega-competition' : '/admin/normal-competition'}
            className="text-[#9A7B4F] hover:underline font-semibold shrink-0 ml-3"
          >
            Manage Gifts →
          </Link>
        </div>

        {/* Live Pool Count Badge */}
        <div className="flex items-center gap-2 text-xs text-stone-700 px-3.5 py-2 rounded-[6px] bg-[#FAF8F5] border border-[#E8E3D8] shrink-0 font-medium">
          <Users size={14} className="text-stone-500" />
          {isLoadingPool ? (
            <span className="flex items-center gap-1 text-[11px] text-stone-400">
              <Loader2 size={12} className="animate-spin" /> Loading pool...
            </span>
          ) : (
            <span>
              <strong className="text-stone-900 font-bold">{eligiblePool.length.toLocaleString()}</strong> eligible
            </span>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. TWO-COLUMN SPLIT STAGE (LEFT: GIFT | RIGHT: DRAW & SPINNER)
      ─────────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* LEFT COLUMN: ACTIVE GIFT SHOWCASE (lg:col-span-5) */}
        <div className="lg:col-span-5 border border-[#E8E3D8] bg-white p-5 rounded-[12px] shadow-sm flex flex-col justify-between space-y-4">
          <div>
            {/* Gift Card Header */}
            <div className="flex items-center justify-between pb-3 mb-2">
              <div
                className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-bold uppercase tracking-wider rounded-full shadow-xs text-white ${
                  competitionType === 'Mega'
                    ? 'bg-gradient-to-r from-amber-500 to-orange-500'
                    : 'bg-gradient-to-r from-cyan-600 to-teal-600'
                }`}
              >
                {competitionType === 'Mega' ? <Trophy size={13} /> : <Gift size={13} />}
                <span>{competitionType} GIFT</span>
              </div>

              {activePrize.value && (
                <div className="bg-[#FAF8F5] border border-[#E8E3D8] px-3 py-1 text-xs font-mono font-bold text-stone-900 rounded-full shadow-2xs flex items-center gap-1.5">
                  <Users size={12} className="text-stone-400" />
                  <span>{activePrize.value}</span>
                </div>
              )}
            </div>

            {/* Prize Image Showcase */}
            <div className="relative w-full h-56 sm:h-64 overflow-hidden rounded-[10px] border border-[#E8E3D8] bg-[#FAF8F5] flex items-center justify-center p-2 group">
              {activePrize.image ? (
                <img
                  src={activePrize.image}
                  alt={activePrize.name}
                  className="w-full h-full object-cover rounded-[8px] drop-shadow-sm transition-transform duration-500 group-hover:scale-105"
                />
              ) : (
                <div className="flex flex-col items-center justify-center text-center p-4 space-y-2">
                  <div
                    className={`h-16 w-16 rounded-full flex items-center justify-center border shadow-xs ${
                      competitionType === 'Mega'
                        ? 'bg-amber-100/80 border-amber-300 text-amber-700'
                        : 'bg-cyan-100/80 border-cyan-300 text-cyan-700'
                    }`}
                  >
                    {competitionType === 'Mega' ? <Trophy size={32} /> : <Gift size={32} />}
                  </div>
                  <span className="text-[11px] font-medium text-stone-500">
                    No image uploaded
                  </span>
                </div>
              )}

              {/* Gradient overlay label at bottom of photo if brand exists */}
              {activePrize.name && (
                <div className="absolute bottom-3 left-3 bg-black/70 backdrop-blur-xs text-white px-2.5 py-1 rounded-[6px] text-[10px] font-medium flex items-center gap-1.5">
                  <Award size={12} className="text-amber-400" />
                  <span>{activePrize.name}</span>
                </div>
              )}
            </div>

            {/* Gift Title & Description */}
            <div className="mt-3.5 text-left">
              <h2 className="text-xl sm:text-2xl font-extrabold text-stone-900 tracking-tight">
                {activePrize.name}
              </h2>
              <p className="mt-0.5 text-xs text-stone-500 font-normal">
                {activePrize.description || 'Drive Your Dreams'}
              </p>

              {/* 4 Feature Tags */}
              <div className="mt-3.5 grid grid-cols-2 gap-2 text-[11px] text-stone-700">
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-[#FAF8F5] border border-[#E8E3D8]">
                  <span>🌿</span>
                  <span className="font-medium truncate">Premium Luxury</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-[#FAF8F5] border border-[#E8E3D8]">
                  <span>⏱</span>
                  <span className="font-medium truncate">High Performance</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-[#FAF8F5] border border-[#E8E3D8]">
                  <span>🍃</span>
                  <span className="font-medium truncate">Ultimate Comfort</span>
                </div>
                <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-[6px] bg-[#FAF8F5] border border-[#E8E3D8]">
                  <span>🏆</span>
                  <span className="font-medium truncate">A Symbol of Success</span>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Gift Selector Actions */}
          <div className="pt-2 border-t border-[#F2EFE9] flex items-center gap-2">
            <button
              onClick={() => setShowPrizeSelector(true)}
              className="flex-1 inline-flex items-center justify-center gap-1.5 border border-[#E8E3D8] bg-[#FAF8F5] hover:bg-stone-100 py-2.5 px-3 text-xs font-semibold text-stone-800 rounded-[8px] transition cursor-pointer"
            >
              <Gift size={14} className={competitionType === 'Mega' ? 'text-amber-600' : 'text-cyan-600'} />
              <span>Select {competitionType} Gift</span>
              <ChevronDown size={13} className="text-stone-400 ml-auto" />
            </button>
            <button
              onClick={() => setShowAddPrizeModal(true)}
              className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-white hover:bg-[#FAF8F5] py-2.5 px-3.5 text-xs font-semibold text-stone-700 rounded-[8px] transition cursor-pointer shadow-2xs"
              title={`Add a new ${competitionType} gift with photo`}
            >
              <Plus size={14} />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: LIVE ROLLER & ACTION STAGE (lg:col-span-7) */}
        <div className="lg:col-span-7 border border-[#E8E3D8] bg-white p-5 sm:p-6 rounded-[12px] shadow-sm flex flex-col justify-between space-y-4">
          {/* Stage Header */}
          <div className="flex items-center justify-between border-b border-[#E8E3D8] pb-3">
            <div className="flex items-center gap-2">
              <span className={`h-2.5 w-2.5 rounded-full ${
                phase === 'spinning' ? 'bg-amber-500 animate-ping' : phase === 'reveal' ? 'bg-emerald-500' : 'bg-emerald-600'
              }`} />
              <span className="text-xs font-bold uppercase tracking-wider text-stone-800">
                {phase === 'spinning' ? 'Spinning Live Draw' : phase === 'verifying' ? 'Verifying Result' : phase === 'reveal' ? 'Winner Preview' : 'Live Draw Stage Ready'}
              </span>
            </div>

            <div className="text-xs text-stone-500 font-mono">
              Stage: <strong className="text-stone-800">{competitionType} Competition</strong>
            </div>
          </div>

          {/* Central Live Roller: 3D Golden Lottery Drum on Top + Overlaid Winner Details Below */}
          <div className="relative rounded-[12px] overflow-hidden border border-[#E8E3D8] bg-gradient-to-b from-[#FAF8F5] to-white shadow-inner flex flex-col items-center">
            {/* 3D Golden Lottery Drum Visual */}
            <div className="relative w-full h-44 sm:h-52 overflow-hidden bg-stone-900 flex items-center justify-center">
              <img
                src="/lottery_drum.jpg"
                alt="Golden Raffle Lottery Drum"
                className={`w-full h-full object-cover transition-transform duration-700 ${
                  phase === 'spinning' ? 'scale-110 brightness-110 saturate-120' : 'scale-100'
                }`}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent pointer-events-none" />

              {/* Spinning Overlay Indicator */}
              {phase === 'spinning' && (
                <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/40 backdrop-blur-2xs text-white space-y-2">
                  <Sparkles size={32} className="animate-spin text-amber-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-amber-200">
                    Spinning Golden Drum...
                  </span>
                </div>
              )}
            </div>

            {/* Overlaid Card: Coupon Badge + Entrant Name + Phone + Winner Tag */}
            <div className="w-full p-5 sm:p-6 flex flex-col items-center justify-center text-center space-y-2 bg-white">
              {display ? (
                <>
                  <div className="inline-flex items-center gap-1.5 font-mono text-xs font-bold px-3 py-1 rounded-full bg-[#fdf5eb] border border-[#f0d4b0] text-[#c0731b] shadow-2xs">
                    <Ticket size={13} className="text-[#c0731b]" />
                    <span>{display.couponId || `ENTRANT #${display.id}`}</span>
                  </div>

                  <h3 className="text-2xl sm:text-3xl font-extrabold text-stone-900 tracking-tight truncate max-w-[420px] pt-1">
                    {display.name}
                  </h3>

                  <p className="font-mono text-xs sm:text-sm text-stone-500 font-medium">
                    {display.phone.slice(0, 5)}•••••
                  </p>

                  <div className="inline-flex items-center gap-1.5 mt-2 px-3 py-1 rounded-full bg-[#fdf8f0] border border-[#ebdcc4] text-[11px] font-semibold text-[#966b2d]">
                    <Gift size={13} className="text-[#c0731b]" />
                    <span>Congratulations! You're the {competitionType} Gift winner!</span>
                  </div>
                </>
              ) : (
                <p className="text-xs text-stone-400 font-light py-4">
                  {isLoadingPool ? 'Loading eligible pool...' : `No eligible participants in ${competitionType} pool`}
                </p>
              )}

              {phase === 'spinning' && (
                <div className="w-full max-w-md bg-[#E8E3D8] h-2 rounded-full overflow-hidden mt-3">
                  <div
                    className="h-full transition-all duration-75 bg-gradient-to-r from-amber-500 to-orange-500"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}

              {phase === 'verifying' && (
                <div className="flex items-center gap-2 text-xs text-stone-700 font-medium pt-2">
                  <Loader2 size={14} className="animate-spin text-orange-600" />
                  <span>Validating participant against database...</span>
                </div>
              )}
            </div>
          </div>

          {/* Bottom Action Area */}
          <div className="space-y-3 pt-1">
            {phase === 'ready' && (
              <button
                onClick={startDraw}
                disabled={eligiblePool.length === 0 || isLoadingPool}
                className="w-full py-4 px-6 text-sm font-bold text-white uppercase tracking-wider rounded-xl shadow-lg transition active:scale-[0.99] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2 bg-gradient-to-r from-[#f36b00] to-[#e05300] hover:from-[#e05300] hover:to-[#c74500] shadow-orange-500/25"
              >
                <Sparkles size={18} />
                <span>START {competitionType.toUpperCase()} SPIN →</span>
              </button>
            )}

            {(phase === 'spinning' || phase === 'verifying') && (
              <button
                disabled
                className="w-full border border-[#E8E3D8] bg-stone-100 py-4 text-sm font-semibold text-stone-500 uppercase tracking-wider rounded-xl flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Loader2 size={18} className="animate-spin text-orange-500" />
                <span>Spinning {competitionType} Draw...</span>
              </button>
            )}

            {(phase === 'reveal' || phase === 'done') && (
              <div className="flex items-center gap-2.5">
                <button
                  onClick={() => setShowConfirmModal(true)}
                  className="flex-1 bg-gradient-to-r from-[#1E1B18] to-[#2d2823] hover:from-stone-800 hover:to-stone-900 text-white py-4 px-6 text-xs sm:text-sm font-bold uppercase tracking-wider rounded-xl transition cursor-pointer flex items-center justify-center gap-2 shadow-md"
                >
                  <Check size={18} className="text-emerald-400" />
                  <span>REVIEW & CONFIRM WINNER →</span>
                </button>

                <button
                  onClick={resetSpin}
                  className="border border-[#E8E3D8] bg-white hover:bg-stone-50 text-stone-700 px-5 py-4 rounded-xl text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-2xs"
                  title="Cancel & Restart Draw"
                >
                  <RotateCcw size={15} />
                  <span>Redraw</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          CONFIRM WINNER MODAL (LUXURY FLORAL CARD DESIGN)
          IMPORTANT: Winner is ONLY saved to database when CONFIRM is clicked
      ─────────────────────────────────────────────────────────────── */}
      {showConfirmModal && previewWinner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 overflow-y-auto animate-fade-in">
          <div className="relative w-full max-w-lg my-auto rounded-[28px] overflow-hidden shadow-2xl p-7 sm:p-9 border border-[#e8dfc8] bg-[#fdfbf7] text-center">
            {/* Floral frame background asset */}
            <div
              className="absolute inset-0 bg-cover bg-center pointer-events-none opacity-85"
              style={{ backgroundImage: "url('/floral_winner_frame.jpg')" }}
            />
            {/* Subtle ivory overlay to ensure crystal clear readability */}
            <div className="absolute inset-0 bg-[#fdfbf7]/80 pointer-events-none" />

            {/* Close button */}
            <button
              onClick={resetSpin}
              disabled={isConfirming}
              className="absolute top-5 right-5 z-20 text-stone-400 hover:text-stone-700 p-1.5 rounded-full hover:bg-black/5 transition cursor-pointer"
            >
              <X size={20} />
            </button>

            {/* Modal Body */}
            <div className="relative z-10 space-y-3 pt-2">
              {/* Golden Trophy Icon in Laurel Wreath */}
              <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-amber-50/90 border border-amber-300/70 text-amber-700 shadow-md">
                <Trophy size={32} className="text-[#c28d28] drop-shadow-xs" />
              </div>

              {/* Provisional Badge */}
              <div className="pt-1">
                <div className="inline-block border border-[#c4a05a]/80 bg-[#faf6ed] text-[#8c6b2d] font-bold text-[10px] sm:text-[11px] tracking-[0.16em] uppercase px-4 py-1 rounded-full shadow-2xs">
                  PROVISIONAL {competitionType.toUpperCase()} WINNER
                </div>
                <p className="text-[11px] text-stone-500 font-normal mt-1.5">
                  Spin result is not saved until you click Confirm Winner below.
                </p>
              </div>

              {/* Big Winner Name in Serif */}
              <h2 className="font-serif text-3xl sm:text-4xl font-bold text-[#143622] tracking-tight pt-1">
                {previewWinner.name}
              </h2>

              {/* Decorative Floral Accent / Leaf Divider */}
              <div className="flex items-center justify-center gap-2 text-[#4a6b52] opacity-75 my-1">
                <span className="h-px w-10 bg-[#4a6b52]/30" />
                <span className="text-xs">🌿</span>
                <span className="h-px w-10 bg-[#4a6b52]/30" />
              </div>

              {/* Winner Phone */}
              <p className="font-mono text-sm text-stone-700 font-medium">
                {previewWinner.phone}
              </p>

              {/* Coupon Pill */}
              {previewWinner.couponId && (
                <div className="inline-flex items-center gap-1.5 border border-[#b2cfb8] bg-[#f0f7f2] px-4 py-1.5 rounded-full font-mono text-xs font-bold text-[#1c4028] shadow-2xs">
                  <Ticket size={14} className="text-[#3b734c]" />
                  <span>Coupon: {previewWinner.couponId}</span>
                </div>
              )}

              {/* Inset Gift Card */}
              <div className="mt-4 border border-[#d2e3d5] bg-[#f2f8f3] p-3 rounded-2xl flex items-center gap-3.5 text-left shadow-2xs">
                {activePrize.image ? (
                  <img
                    src={activePrize.image}
                    alt={activePrize.name}
                    className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl object-cover border border-[#d2e3d5] shrink-0 shadow-2xs"
                  />
                ) : (
                  <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl bg-amber-100 border border-amber-300 text-amber-700 flex items-center justify-center shrink-0">
                    <Trophy size={24} />
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-[10px] font-semibold text-stone-500 uppercase tracking-wider">
                      {competitionType} GIFT
                    </p>
                    {activePrize.value && (
                      <span className="text-[10px] font-mono font-bold text-stone-800 bg-white/80 px-2 py-0.5 rounded-md border border-[#d2e3d5]">
                        {activePrize.value}
                      </span>
                    )}
                  </div>
                  <p className="text-sm sm:text-base font-bold text-stone-900 truncate">
                    {activePrize.name}
                  </p>
                  <p className="text-[11px] text-stone-500 truncate">
                    {activePrize.description || 'Luxury Drive, Bigger Dreams'}
                  </p>
                </div>
              </div>

              {confirmError && (
                <div className="border border-red-200 bg-red-50 p-2.5 rounded-xl text-xs text-red-700 text-left flex items-start gap-1.5">
                  <AlertCircle size={14} className="shrink-0 mt-0.5" />
                  <span>{confirmError}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <button
                  onClick={handleConfirmWinner}
                  disabled={isConfirming}
                  className="w-full bg-gradient-to-r from-[#1e4a31] to-[#143622] hover:from-[#173d28] hover:to-[#0f2a1a] text-white py-3.5 px-6 rounded-2xl font-bold text-xs sm:text-sm tracking-wide shadow-lg transition active:scale-[0.99] flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  {isConfirming ? (
                    <>
                      <Loader2 size={16} className="animate-spin" />
                      <span>Validating & Saving to Database...</span>
                    </>
                  ) : (
                    <>
                      <Check size={18} />
                      <span>CONFIRM WINNER (SAVE TO DB) →</span>
                    </>
                  )}
                </button>

                <button
                  onClick={resetSpin}
                  disabled={isConfirming}
                  className="w-full border border-[#b2cfb8] bg-white/70 hover:bg-[#eef5ee] text-[#1e4a31] py-2.5 px-6 rounded-2xl text-xs font-semibold transition active:scale-[0.99] flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  <X size={14} />
                  <span>Cancel / Respin Without Saving</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* SELECT GIFT MODAL (Filtered strictly by selected competitionType) */}
      {showPrizeSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto border border-[#E8E3D8] bg-white p-5 rounded-[6px] shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E3D8] pb-3">
              <div className="flex items-center gap-2">
                <span
                  className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-[3px] ${
                    competitionType === 'Mega' ? 'bg-amber-100 text-amber-900' : 'bg-cyan-100 text-cyan-900'
                  }`}
                >
                  {competitionType}
                </span>
                <h3 className="text-sm font-normal text-stone-900">Select {competitionType} Gift</h3>
              </div>
              <button
                onClick={() => setShowPrizeSelector(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#F2EFE9] border border-[#E8E3D8] rounded-[4px]">
              {competitionGifts.map((p) => {
                const isSelected = p.id === activePrize.id
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPrizeId(p.id)
                      setShowPrizeSelector(false)
                      setToast(`Active gift set to "${p.name}"!`)
                    }}
                    className={`w-full p-2.5 flex items-center gap-3 text-left transition cursor-pointer ${
                      isSelected ? 'bg-[#FAF8F5]' : 'hover:bg-stone-50'
                    }`}
                  >
                    {p.image ? (
                      <img
                        src={p.image}
                        alt={p.name}
                        className="w-10 h-10 rounded-[3px] object-cover border border-[#E8E3D8] shrink-0"
                      />
                    ) : (
                      <div
                        className={`w-10 h-10 rounded-[3px] border flex items-center justify-center shrink-0 ${
                          competitionType === 'Mega'
                            ? 'bg-amber-50 border-amber-200 text-amber-700'
                            : 'bg-cyan-50 border-cyan-200 text-cyan-700'
                        }`}
                      >
                        {competitionType === 'Mega' ? <Trophy size={16} /> : <Gift size={16} />}
                      </div>
                    )}
                    <div className="flex-1 truncate">
                      <div className="flex items-center gap-2">
                        <p className="text-xs font-medium text-stone-900 truncate">{p.name}</p>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded-[2px] font-bold uppercase ${
                            p.status === 'Awarded'
                              ? 'bg-amber-100 text-amber-800 border border-amber-200'
                              : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          }`}
                        >
                          {p.status || 'Available'}
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 font-light">{p.value || 'Bumper Prize'}</p>
                    </div>
                    {isSelected && <Check size={14} className="text-[#9A7B4F] shrink-0" />}
                  </button>
                )
              })}

              {competitionGifts.length === 0 && (
                <div className="p-6 text-center text-xs text-stone-400">
                  No {competitionType} gifts found in database. Add one below!
                </div>
              )}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  setShowPrizeSelector(false)
                  setShowAddPrizeModal(true)
                }}
                className="text-xs text-[#9A7B4F] hover:underline font-normal"
              >
                + Upload New {competitionType} Gift
              </button>
              <button
                onClick={() => setShowPrizeSelector(false)}
                className="border border-[#E8E3D8] bg-white px-3.5 py-1.5 text-xs text-stone-700 rounded-[4px] cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ADD NEW GIFT MODAL (Saves with exact competitionType) */}
      {showAddPrizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto border border-[#E8E3D8] bg-white p-5 rounded-[6px] shadow-lg">
            <div className="flex items-center justify-between border-b border-[#E8E3D8] pb-3">
              <h3 className="text-sm font-normal text-stone-900">
                Add New {competitionType} Gift (Dynamic DB)
              </h3>
              <button
                onClick={() => setShowAddPrizeModal(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleSaveNewGift} className="mt-4 space-y-3.5 text-xs font-light">
              <div>
                <label className="block text-xs font-normal text-stone-600">Gift Name *</label>
                <input
                  required
                  placeholder={
                    competitionType === 'Mega'
                      ? 'e.g. Maruti Suzuki Swift Car, Bumper Gold 10 Sovereign'
                      : 'e.g. Smart 4K TV, Refrigerator, Smartphone'
                  }
                  value={newGift.name}
                  onChange={(e) => setNewGift({ ...newGift, name: e.target.value })}
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-stone-600">Description</label>
                <input
                  placeholder="e.g. Official festival gift"
                  value={newGift.description}
                  onChange={(e) => setNewGift({ ...newGift, description: e.target.value })}
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-stone-600">Value</label>
                <input
                  placeholder="e.g. ₹50,000"
                  value={newGift.value}
                  onChange={(e) => setNewGift({ ...newGift, value: e.target.value })}
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                />
              </div>

              {/* Upload image */}
              <div>
                <label className="block text-xs font-normal text-stone-600 mb-1">Prize Photo</label>
                <div className="border border-dashed border-[#E8E3D8] bg-[#FAF8F5] p-3 text-center rounded-[6px]">
                  <input
                    type="file"
                    id="stage-prize-upload"
                    accept="image/*"
                    className="hidden"
                    onChange={handleGiftImageUpload}
                    disabled={isUploading}
                  />

                  {isUploading ? (
                    <div className="flex flex-col items-center justify-center py-2 space-y-1">
                      <Loader2 size={16} className="animate-spin text-[#9A7B4F]" />
                      <p className="text-[11px] text-stone-600">Uploading photo...</p>
                    </div>
                  ) : newGift.image ? (
                    <div className="flex items-center gap-3">
                      <img
                        src={newGift.image}
                        alt="Preview"
                        className="w-16 h-12 rounded-[3px] object-cover border border-[#E8E3D8]"
                      />
                      <div className="flex-1 text-left">
                        {uploadSuccess && (
                          <p className="text-[10px] text-emerald-700 font-normal flex items-center gap-1">
                            <CheckCircle2 size={11} /> {uploadSuccess}
                          </p>
                        )}
                        <label
                          htmlFor="stage-prize-upload"
                          className="inline-block mt-1 text-[11px] text-[#9A7B4F] hover:underline cursor-pointer"
                        >
                          Change Photo
                        </label>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="stage-prize-upload" className="cursor-pointer block py-2">
                      <Upload size={16} className="mx-auto text-stone-400" />
                      <p className="mt-1 text-[11px] text-stone-700">Click to upload photo</p>
                    </label>
                  )}
                </div>
              </div>

              <div className="pt-2 flex gap-2 border-t border-[#E8E3D8]">
                <button
                  type="button"
                  onClick={() => setShowAddPrizeModal(false)}
                  className="flex-1 border border-[#E8E3D8] py-2 text-xs text-stone-700 rounded-[4px] hover:bg-[#FAF8F5]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!newGift.name.trim() || isUploading}
                  className="flex-1 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 text-white py-2 text-xs rounded-[4px] disabled:opacity-50"
                >
                  Save {competitionType} Gift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
