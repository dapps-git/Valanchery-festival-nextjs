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
  RotateCw,
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
  Crown,
  User,
} from 'lucide-react'

// Helper to create an SVG arc path for a pie slice
function getSlicePath(cx: number, cy: number, r: number, startAngleDeg: number, endAngleDeg: number) {
  const startRad = ((startAngleDeg - 90) * Math.PI) / 180
  const endRad = ((endAngleDeg - 90) * Math.PI) / 180

  const x1 = cx + r * Math.cos(startRad)
  const y1 = cy + r * Math.sin(startRad)
  const x2 = cx + r * Math.cos(endRad)
  const y2 = cy + r * Math.sin(endRad)

  return `M ${cx} ${cy} L ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2} Z`
}

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
  const [uploadError, setUploadError] = useState('')

  // Real festival coupon seed list (from actual 3000 printed database coupons)
  const REAL_COUPON_SEEDS = [
    'B774097RXFA81',
    '438539ZRRJ09P',
    '763M6F371M9PR',
    '4H0411M71ZLX4',
    '8B0M32Q3J27W0',
    '1H1Y9BH41M204',
  ]

  // Circular Wheel State
  const [wheelRotation, setWheelRotation] = useState(0)
  const [wheelSlices, setWheelSlices] = useState<string[]>(REAL_COUPON_SEEDS)
  const [isSpinningWheel, setIsSpinningWheel] = useState(false)

  // Update wheel slices with real coupons from eligible participants or database coupons
  useEffect(() => {
    // 1. If eligible participants exist, use their real coupon IDs
    if (eligiblePool.length > 0) {
      const sample = eligiblePool.slice(0, 6).map((p) => (p.couponId || p.id).toUpperCase())
      const filled = [...sample]
      let idx = 0
      while (filled.length < 6) {
        filled.push(REAL_COUPON_SEEDS[idx % REAL_COUPON_SEEDS.length])
        idx++
      }
      setWheelSlices(filled)
      return
    }

    // 2. If coupons are loaded in data, use real coupon codes
    if (Array.isArray(data.coupons) && data.coupons.length >= 6) {
      const sample = data.coupons.slice(0, 6).map((c) => String(c.id || c.serialNo).toUpperCase())
      setWheelSlices(sample)
      return
    }

    // 3. Otherwise fetch real batch coupons from API directory
    api.getDirectoryCoupons(new URLSearchParams({ limit: '12' }))
      .then((res) => {
        if (res && res.ok && Array.isArray(res.coupons) && res.coupons.length > 0) {
          const codes = res.coupons.slice(0, 6).map((c) => String(c.id || c.serialNo).toUpperCase())
          let idx = 0
          while (codes.length < 6) {
            codes.push(REAL_COUPON_SEEDS[idx % REAL_COUPON_SEEDS.length])
            idx++
          }
          setWheelSlices(codes)
        }
      })
      .catch(() => {})
  }, [eligiblePool, data.coupons])

  // Set of prize IDs that have already been awarded or confirmed in winners
  const wonPrizeIds = useMemo(() => {
    return new Set(
      (data.winners || [])
        .filter((w) => w.status === 'Confirmed' || !w.status)
        .map((w) => w.prizeId)
        .filter(Boolean)
    )
  }, [data.winners])

  // Load Competition-specific gifts from database that have NOT been announced/awarded yet
  const competitionGifts = useMemo(() => {
    return (data.prizes || []).filter((p) => {
      const matchesType =
        competitionType === 'Mega'
          ? p.competitionType === 'Mega'
          : p.competitionType === 'Normal' || !p.competitionType
      if (!matchesType) return false

      // Once a prize is announced / awarded, remove it from the gift listing when taking spinning
      if (p.status === 'Awarded') return false
      if (wonPrizeIds.has(p.id)) return false

      return true
    })
  }, [data.prizes, competitionType, wonPrizeIds])

  // Determine active prize
  const activePrize: Prize = useMemo(() => {
    if (selectedPrizeId) {
      const found = competitionGifts.find((p) => p.id === selectedPrizeId)
      if (found) return found
    }
    // Prefer the first unawarded/available gift
    if (competitionGifts.length > 0) {
      return competitionGifts[0]
    }
    return {
      id: `default-${competitionType.toLowerCase()}-gift`,
      name: `${competitionType} Grand Bumper Prize`,
      value: '',
      description: `All ${competitionType} Competition Gifts have been announced & awarded!`,
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
        // Enforce couponId exclusion against local winners
        const knownWinners = data.winners || []

        const megaWonCoupons = new Set<string>()
        const normalWonCoupons = new Set<string>()

        knownWinners.forEach((w) => {
          const cId = (w.couponId || (w as any).participantCouponId || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()

          if (w.competitionType === 'Mega') {
            if (cId) megaWonCoupons.add(cId)
            if (w.participantId) megaWonCoupons.add(w.participantId)
          } else {
            if (cId) normalWonCoupons.add(cId)
            if (w.participantId) normalWonCoupons.add(w.participantId)
          }
        })

        const sanitized = res.participants.filter((p) => {
          const c = (p.couponId || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
          if (!c) return false

          if (comp === 'Mega') {
            // Mega: Specific coupon cannot win Mega again (same phone numbers CAN participate with other coupons!)
            if (megaWonCoupons.has(c) || (p.id && megaWonCoupons.has(p.id))) return false
          } else {
            // Normal: Coupon that won Mega or Normal cannot win Normal again (same phone numbers CAN participate with other coupons!)
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
  // - Won Mega: Mega ❌ (That coupon cannot win Mega twice), Normal ❌ (That coupon cannot enter Normal)
  // - Participants with same phone number CAN participate with other coupons in both Mega and Normal! Validated strictly by couponId.
  const computeFallbackPool = (comp: CompetitionType) => {
    const winners = data.winners || []
    const prizes = data.prizes || []
    const draws = data.draws || []
    const allParticipants: Participant[] = data.participants || []

    const prizeMap = new Map(prizes.map((p) => [p.id, p]))
    const drawMap = new Map(draws.map((d) => [d.id, d]))

    const megaWinnerCoupons = new Set<string>()
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

      if (compType === 'Mega') {
        if (w.participantId) megaWinnerCoupons.add(w.participantId)
        if (cId) megaWinnerCoupons.add(cId)
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
        const c = (p.couponId || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        if (megaWinnerCoupons.has(p.id) || (c && megaWinnerCoupons.has(c))) return false
        return true
      })
    } else {
      filtered = participants.filter((p) => {
        const c = (p.couponId || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase()
        // In Normal: same phone numbers can participate with other coupons! Only exclude won coupons.
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
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      const buffer = new Uint32Array(1)
      window.crypto.getRandomValues(buffer)
      const index = buffer[0] % eligiblePool.length
      return eligiblePool[index]
    }
    return eligiblePool[Math.floor(Math.random() * eligiblePool.length)]
  }

  // START SPIN (Preview result only - NOT SAVED TO DATABASE)
  const startDraw = () => {
    if (!eligiblePool.length || phase === 'spinning' || phase === 'verifying' || isSpinningWheel) return
    if (competitionGifts.length === 0) {
      setToast(`All ${competitionType} gifts have already been announced and awarded!`)
      return
    }
    const chosen = pickRandomEligible()
    if (!chosen) return

    const winningCoupon = (chosen.couponId || chosen.id).toUpperCase()

    // Pick target slice index (0 to 5)
    const targetSlice = Math.floor(Math.random() * 6)

    // Fill 6 slices with the winning coupon placed at targetSlice
    const otherParticipants = eligiblePool.filter((p) => p.id !== chosen.id)
    const newSlices: string[] = []
    let otherIdx = 0
    for (let i = 0; i < 6; i++) {
      if (i === targetSlice) {
        newSlices.push(winningCoupon)
      } else {
        const other = otherParticipants[otherIdx % Math.max(1, otherParticipants.length)]
        newSlices.push(other ? (other.couponId || other.id).toUpperCase() : REAL_COUPON_SEEDS[i % REAL_COUPON_SEEDS.length])
        otherIdx++
      }
    }
    setWheelSlices(newSlices)

    // Calculate clockwise rotation to land targetSlice under the top pointer
    // Slice 0 center is at 0° (top). Slice i center is at (i * 60)° clockwise.
    const fullSpins = 6 + Math.floor(Math.random() * 3) // 6 to 8 full spins
    const targetModulo = (360 - ((targetSlice * 60) % 360)) % 360
    const currentModulo = ((wheelRotation % 360) + 360) % 360
    let delta = (targetModulo - currentModulo + 360) % 360
    if (delta === 0) delta = 360
    const finalRotation = wheelRotation + fullSpins * 360 + delta

    setPreviewWinner(chosen)
    setDisplay(chosen)
    setPhase('spinning')
    setIsSpinningWheel(true)
    setProgress(0)
    setShowConfirmModal(false)
    setConfirmError('')

    // Set wheel rotation to trigger smooth CSS animation
    setWheelRotation(finalRotation)

    // 4.2 seconds spin duration
    timers.current.push(
      window.setTimeout(() => {
        setIsSpinningWheel(false)
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
          }, 600)
        )
      }, 4200)
    )
  }

  // CANCEL / RESTART DRAW: Clears temporary result without writing anything to DB
  const resetSpin = () => {
    timers.current.forEach((id) => window.clearTimeout(id))
    setShowConfirmModal(false)
    setPhase('ready')
    setIsSpinningWheel(false)
    setPreviewWinner(null)
    setDisplay(null)
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
        setToast(`Winner "${previewWinner.name}" permanently confirmed & saved! Prize "${activePrize.name}" is announced and removed from spinning stage.`)
        setSelectedPrizeId(null)
        resetSpin()
        // Refresh pool immediately from database to remove winner
        fetchEligibleParticipants(competitionType)
        await refreshData().catch(() => {})
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
    } catch (err: any) {
      setUploadError(err.message || 'Image upload failed. Please verify Cloudinary configuration.')
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
    <div className="relative w-full max-w-5xl mx-auto p-4 sm:p-5 font-sans font-normal text-[#292524] space-y-6 sm:space-y-8 pt-3 sm:pt-6">
      <Confetti active={phase === 'reveal' || phase === 'done'} />
      {flash && <div className="pointer-events-none absolute inset-0 z-20 bg-white animate-[flash_0.6s_ease]" />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      {/* ─────────────────────────────────────────────────────────────
          1. TOP CONTROLS BAR (Matches Exact Layout in Screenshot)
      ─────────────────────────────────────────────────────────────── */}
      <div className="w-full flex flex-wrap items-center justify-between gap-3">
        {/* Left: Competition Switchers */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => {
              if (phase === 'spinning' || phase === 'verifying') return
              setCompetitionType('Mega')
            }}
            className={`py-2 px-5 text-xs font-bold tracking-wider uppercase transition flex items-center gap-2 cursor-pointer rounded-[2px] ${
              competitionType === 'Mega'
                ? 'bg-[#a25912] text-white'
                : 'bg-white border border-[#dedede] text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Trophy size={14} className={competitionType === 'Mega' ? 'text-amber-200' : 'text-stone-500'} />
            <span>MEGA COMPETITION</span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (phase === 'spinning' || phase === 'verifying') return
              setCompetitionType('Normal')
            }}
            className={`py-2 px-5 text-xs font-bold tracking-wider uppercase transition flex items-center gap-2 cursor-pointer rounded-[2px] ${
              competitionType === 'Normal'
                ? 'bg-[#a25912] text-white'
                : 'bg-white border border-[#dedede] text-stone-700 hover:bg-stone-50'
            }`}
          >
            <Gift size={14} className={competitionType === 'Normal' ? 'text-amber-200' : 'text-stone-500'} />
            <span>NORMAL COMPETITION</span>
          </button>
        </div>

        {/* Right: Gift Dropdown + New + Eligible Count */}
        <div className="flex items-center gap-2.5">
          <button
            onClick={() => setShowPrizeSelector(true)}
            className="inline-flex items-center gap-2 border border-[#dedede] bg-white hover:bg-stone-50 py-2 px-4 text-xs font-bold text-stone-800 rounded-[2px] transition cursor-pointer"
          >
            <Gift size={14} className="text-[#a25912]" />
            <span className="max-w-[140px] truncate">
              {competitionGifts.length > 0 ? activePrize.name : `All ${competitionType} Gifts Awarded`}
            </span>
            <ChevronDown size={13} className="text-stone-400 shrink-0" />
          </button>

          <button
            onClick={() => setShowAddPrizeModal(true)}
            className="inline-flex items-center gap-1 border border-[#dedede] bg-white hover:bg-stone-50 py-2 px-4 text-xs font-bold text-stone-800 rounded-[2px] transition cursor-pointer"
            title={`Add a new ${competitionType} gift with photo`}
          >
            <Plus size={14} />
            <span>New</span>
          </button>

          <div className="flex items-center gap-2 text-xs text-stone-800 px-4 py-2 rounded-[2px] bg-white border border-[#dedede] font-bold">
            <Users size={14} className="text-stone-600" />
            {isLoadingPool ? (
              <span className="flex items-center gap-1 text-[11px] text-stone-400 font-normal">
                <Loader2 size={12} className="animate-spin" /> Loading...
              </span>
            ) : (
              <span>
                <strong className="text-stone-900 font-bold">{eligiblePool.length}</strong> eligible
              </span>
            )}
          </div>
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          2. SPINNER (CENTERED WITH BALANCED VERTICAL SPACING)
      ─────────────────────────────────────────────────────────────── */}
      <div className="relative flex flex-col items-center justify-center my-4 sm:my-8 w-full">
        {/* Top Fixed Teardrop Pointer */}
        <div className="absolute -top-3.5 sm:-top-4 left-1/2 -translate-x-1/2 z-30 pointer-events-none">
          <svg width="30" height="40" viewBox="0 0 28 38" fill="none" className="drop-shadow-md">
            <path
              d="M14 36 C13 32 3 19 3 14 A11 11 0 1 1 25 14 C25 19 15 32 14 36 Z"
              fill="#3D2314"
              stroke="#D4AF67"
              strokeWidth="1.5"
            />
            <circle cx="14" cy="14" r="4" fill="#E8D4B0" />
          </svg>
        </div>

        {/* Rotating Wheel Container */}
        <div
          className="relative w-[290px] h-[290px] sm:w-[370px] sm:h-[370px] md:w-[410px] md:h-[410px] rounded-full overflow-hidden"
          style={{
            boxShadow:
              '0 14px 40px -8px rgba(160, 115, 55, 0.32), 0 0 0 8px #FAF5ED, 0 0 0 10px #DFCBB0',
          }}
        >
          <svg
            viewBox="0 0 400 400"
            className="w-full h-full"
            style={{
              transform: `rotate(${wheelRotation}deg)`,
              transition: isSpinningWheel
                ? 'transform 4.2s cubic-bezier(0.12, 0.88, 0.25, 1)'
                : 'none',
            }}
          >
            <defs>
              {/* Metallic Gold Ring Gradient */}
              <linearGradient id="goldRing" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#D4AF67" />
                <stop offset="35%" stopColor="#F9E4B7" />
                <stop offset="70%" stopColor="#B68940" />
                <stop offset="100%" stopColor="#8F6423" />
              </linearGradient>
            </defs>

            {/* 6 Wheel Slices */}
            {Array.from({ length: 6 }, (_, i) => {
              const startAngle = i * 60 - 30
              const endAngle = i * 60 + 30
              const path = getSlicePath(200, 200, 192, startAngle, endAngle)
              const sliceColor = i % 2 === 0 ? '#F2E4D2' : '#FAF3E8'
              const couponCode = wheelSlices[i] || REAL_COUPON_SEEDS[i % REAL_COUPON_SEEDS.length]

              return (
                <g key={i}>
                  <path d={path} fill={sliceColor} stroke="#E2D4BE" strokeWidth="1.5" />
                  {/* Real Coupon Code Text - Narrower outer ring band */}
                  <g transform={`rotate(${i * 60}, 200, 200)`}>
                    <text
                      x="200"
                      y="52"
                      textAnchor="middle"
                      fill="#3D2314"
                      fontSize="11.5"
                      fontWeight="700"
                      fontFamily="monospace"
                      letterSpacing="0.05em"
                    >
                      {couponCode}
                    </text>
                  </g>
                </g>
              )
            })}

            {/* Outer Golden Rim */}
            <circle
              cx="200"
              cy="200"
              r="193"
              fill="none"
              stroke="url(#goldRing)"
              strokeWidth="14"
            />
          </svg>
        </div>

        {/* Center Fixed Hub (Enlarged Inner Circle with Expanded Prize Showcase) */}
        <div className="absolute z-20 w-[165px] h-[165px] sm:w-[205px] sm:h-[205px] md:w-[225px] md:h-[225px] rounded-full bg-[#FFFDF9] border-2 border-[#DFCBB0] shadow-md flex items-center justify-center p-3 text-center pointer-events-none">
          {activePrize.image && activePrize.image !== '/kvves-logo-round.png' ? (
            <img
              src={activePrize.image}
              alt={activePrize.name}
              className="max-w-[125px] max-h-[95px] sm:max-w-[155px] sm:max-h-[115px] md:max-w-[170px] md:max-h-[125px] w-auto h-auto object-contain drop-shadow-sm transition-transform"
            />
          ) : (
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-[#FAF1E3] flex items-center justify-center text-[#9E6F28]">
              {competitionType === 'Mega' ? <Trophy size={36} /> : <Gift size={36} />}
            </div>
          )}
        </div>
      </div>

      {/* ─────────────────────────────────────────────────────────────
          3. BOTTOM BUTTON
      ─────────────────────────────────────────────────────────────── */}
      <div className="flex flex-col items-center justify-center w-full pt-2 sm:pt-4">
        {phase === 'reveal' || phase === 'done' ? (
          <div className="flex items-center gap-3 w-full max-w-md">
            <button
              onClick={() => setShowConfirmModal(true)}
              className="flex-1 bg-[#a25912] hover:bg-[#8d4c11] text-white py-3 px-8 text-sm font-bold uppercase tracking-wider rounded-[2px] transition cursor-pointer flex items-center justify-center gap-2 shadow-sm"
            >
              <Check size={18} className="text-white" />
              <span>CONFIRM WINNER →</span>
            </button>
            <button
              onClick={resetSpin}
              className="border border-[#dedede] bg-white hover:bg-stone-50 text-stone-700 px-6 py-3 rounded-[2px] text-xs font-semibold cursor-pointer transition flex items-center gap-1.5 shadow-2xs"
              title="Cancel & Restart Draw"
            >
              <RotateCcw size={15} />
              <span>Redraw</span>
            </button>
          </div>
        ) : (
          <button
            onClick={startDraw}
            disabled={eligiblePool.length === 0 || isLoadingPool || competitionGifts.length === 0 || isSpinningWheel}
            className="bg-[#a25912] hover:bg-[#8d4c11] text-white py-3 px-10 rounded-[2px] shadow-sm transition duration-200 cursor-pointer flex items-center justify-center gap-3 font-bold text-sm tracking-wide active:scale-[0.99] disabled:opacity-40 disabled:cursor-not-allowed mx-auto w-full max-w-xs"
          >
            <RotateCw size={17} className={isSpinningWheel ? 'animate-spin' : ''} />
            <span>
              {competitionGifts.length === 0
                ? `All ${competitionType} Gifts Awarded`
                : isSpinningWheel
                ? `Spinning ${competitionType} Wheel...`
                : `Start ${competitionType} Spin →`}
            </span>
          </button>
        )}
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
                <h3 className="text-sm font-normal text-stone-900">
                  Select {competitionType} Gift ({competitionGifts.length} Remaining)
                </h3>
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
                        <span className="text-[9px] px-1.5 py-0.2 rounded-[2px] font-bold uppercase bg-emerald-50 text-emerald-800 border border-emerald-200">
                          Available
                        </span>
                      </div>
                      <p className="text-[11px] text-stone-400 font-light">{p.value || 'Festival Prize'}</p>
                    </div>
                    {isSelected && <Check size={14} className="text-[#9A7B4F] shrink-0" />}
                  </button>
                )
              })}

              {competitionGifts.length === 0 && (
                <div className="p-6 text-center text-xs text-stone-500 space-y-1">
                  <p className="font-semibold text-stone-800">All {competitionType} gifts have already been announced and awarded!</p>
                  <p className="text-[11px] text-stone-400">No unawarded gifts remaining for {competitionType} Competition.</p>
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
