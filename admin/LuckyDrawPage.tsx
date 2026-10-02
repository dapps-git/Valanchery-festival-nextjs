import { useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Confetti } from '@/components/Confetti'
import { Toast } from '@/components/Toast'
import { useApp } from '@/context/AppContext'

import type { Participant, Prize } from '@/types'
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
} from 'lucide-react'

type Phase = 'ready' | 'spinning' | 'verifying' | 'reveal' | 'done'

export function LuckyDrawPage() {
  const { data, getPrize, confirmWinner, addPrize } = useApp()
  const location = useLocation()

  // Gift Selection from query param or first available prize
  const queryGiftId = useMemo(() => {
    return new URLSearchParams(location.search).get('giftId')
  }, [location.search])

  const [selectedPrizeId, setSelectedPrizeId] = useState<string | null>(queryGiftId)
  const [showPrizeSelector, setShowPrizeSelector] = useState(false)
  const [showAddPrizeModal, setShowAddPrizeModal] = useState(false)

  // Cloudinary state for adding gift on the fly
  const [newGift, setNewGift] = useState({
    name: '',
    value: '',
    description: '',
    image: '',
  })
  const [isUploading, setIsUploading] = useState(false)
  const [uploadSuccess, setUploadSuccess] = useState('')

  // Determine active prize (fallback to first available prize or preset)
  const activePrize: Prize = useMemo(() => {
    if (selectedPrizeId) {
      const found = getPrize(selectedPrizeId)
      if (found) return found
    }
    if (data.prizes && data.prizes.length > 0) {
      return data.prizes[0]
    }
    return {
      id: 'default-gift',
      name: 'Festival Grand Prize',
      value: '',
      description: '',
      image: '',
      assignedDrawId: null,
      status: 'Available',
    }
  }, [selectedPrizeId, data.prizes, getPrize])

  // Active pool of all registered active entrants
  const pool = useMemo(() => {
    return (data.participants || []).filter((p) => p.status === 'Active')
  }, [data.participants])

  const [phase, setPhase] = useState<Phase>('ready')
  const [display, setDisplay] = useState<Participant | null>(pool[0] ?? null)
  const [winner, setWinner] = useState<Participant | null>(null)
  const [confirmedWinnerInfo, setConfirmedWinnerInfo] = useState<{
    winner: Participant
    prize: Prize
  } | null>(null)
  const [progress, setProgress] = useState(0)
  const [showModal, setShowModal] = useState(false)
  const [isConfirming, setIsConfirming] = useState(false)
  const [toast, setToast] = useState('')
  const [flash, setFlash] = useState(false)
  const timers = useRef<number[]>([])

  useEffect(() => {
    return () => {
      timers.current.forEach((id) => window.clearTimeout(id))
    }
  }, [])

  useEffect(() => {
    if (phase === 'ready' && pool.length > 0 && !display) {
      setDisplay(pool[0])
    }
  }, [pool, phase, display])

  const pickWinner = () => {
    if (pool.length === 0) return null
    return pool[Math.floor(Math.random() * pool.length)]
  }

  const startDraw = () => {
    if (!pool.length || phase === 'spinning' || phase === 'verifying') return
    const chosen = pickWinner()
    if (!chosen) return

    setWinner(chosen)
    setPhase('spinning')
    setProgress(0)
    setShowModal(false)

    const duration = 4000
    const start = Date.now()
    let delay = 50

    const tick = () => {
      const elapsed = Date.now() - start
      setProgress(Math.min(100, (elapsed / duration) * 100))
      const idx = Math.floor(Math.random() * pool.length)
      setDisplay(pool[idx])

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
                setShowModal(true)
              }, 700),
            )
          }, 1400),
        )
      }
    }
    tick()
  }

  const resetSpin = () => {
    setShowModal(false)
    setPhase('ready')
    setWinner(null)
    setProgress(0)
  }

  const handleConfirmWinner = async () => {
    if (!winner || !activePrize) return
    setIsConfirming(true)
    try {
      const matchingDraw = (data.draws || []).find((d) => d.prizeId === activePrize.id || d.status === 'Open' || d.status === 'Upcoming')
      const drawIdToUse = matchingDraw ? matchingDraw.id : (activePrize.assignedDrawId || 'live-draw')
      const res = await confirmWinner(winner.id, drawIdToUse, activePrize.id)
      if (res.ok) {
        setConfirmedWinnerInfo({
          winner,
          prize: activePrize,
        })
        setShowModal(false)
        setToast(`Winner "${winner.name}" confirmed & recorded for ${activePrize.name}!`)
      } else {
        setToast(res.error || 'Failed to record winner')
      }
    } finally {
      setIsConfirming(false)
    }
  }

  // Cloudinary image upload for new gift
  const handleGiftImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setIsUploading(true)
    setUploadSuccess('')

    try {
      const formData = new FormData()
      formData.append('file', file)

      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      })
      const json = await res.json()
      if (json.ok && json.url) {
        setNewGift((prev) => ({ ...prev, image: json.url }))
        setUploadSuccess('Uploaded to Cloudinary!')
        setTimeout(() => setUploadSuccess(''), 3000)
      } else {
        throw new Error(json.error || 'Upload error')
      }
    } catch {
      const reader = new FileReader()
      reader.onload = (evt) => {
        const resUrl = evt.target?.result as string
        if (resUrl) {
          setNewGift((prev) => ({ ...prev, image: resUrl }))
          setUploadSuccess('Image loaded')
          setTimeout(() => setUploadSuccess(''), 3000)
        }
      }
      reader.readAsDataURL(file)
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
      description: newGift.description.trim() || 'Valanchery Festival Prize',
      image: newGift.image,
      assignedDrawId: null,
      status: 'Available',
    })

    setSelectedPrizeId(newId)
    setShowAddPrizeModal(false)
    setToast(`Gift "${newGift.name}" added to Live Stage!`)
    setNewGift({
      name: '',
      value: '',
      description: '',
      image: '',
    })
  }

  return (
    <div className="relative min-h-[calc(100vh-140px)] flex flex-col items-center justify-center p-2 sm:p-4 font-sans font-normal text-[#292524]">
      <Confetti active={phase === 'reveal' || phase === 'done'} />
      {flash && <div className="pointer-events-none absolute inset-0 z-20 bg-white animate-[flash_0.6s_ease]" />}
      {toast && <Toast message={toast} onDone={() => setToast('')} />}

      {/* Main Luxury Stage Card */}
      <div className="relative z-10 w-full max-w-[480px] border border-[#E8E3D8] bg-white p-6 sm:p-8 rounded-[6px] shadow-sm text-center space-y-5">
        {/* Stage Header */}
        <div className="space-y-1.5 border-b border-[#E8E3D8] pb-4">
          <div className="inline-flex items-center gap-1.5 border border-[#E8E3D8] bg-[#FAF8F5] px-3.5 py-1 text-xs font-medium text-stone-800 rounded-[4px]">
            <Sparkles size={13} className="text-[#9A7B4F]" />
            <span>Festival Live Draw</span>
          </div>

          <div className="flex items-center justify-center gap-2 pt-1 text-xs text-stone-600 font-normal">
            <Users size={13} className="text-stone-500" />
            <span><strong className="text-stone-900 font-semibold">{pool.length.toLocaleString()}</strong> active entrants in pool</span>
          </div>
        </div>

        {/* Active Gift Display */}
        <div className="space-y-3">
          <div className="relative w-full h-44 sm:h-52 overflow-hidden rounded-[6px] border border-[#E8E3D8] bg-[#FAF8F5]">
            <img
              src={activePrize.image}
              alt={activePrize.name}
              className="w-full h-full object-cover"
            />
            {activePrize.value && (
              <div className="absolute top-2.5 right-2.5 bg-white/95 backdrop-blur-xs border border-[#E8E3D8] px-2.5 py-0.5 text-xs font-mono font-medium text-stone-900 rounded-[4px] shadow-2xs">
                {activePrize.value}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-medium text-stone-900 tracking-tight">
              {activePrize.name}
            </h2>
            {activePrize.description && (
              <p className="mt-0.5 text-xs text-stone-500 font-normal line-clamp-1">
                {activePrize.description}
              </p>
            )}
          </div>

          {/* Gift Switcher Button */}
          <div className="flex items-center justify-center gap-2 pt-1">
            <button
              onClick={() => setShowPrizeSelector(true)}
              className="inline-flex items-center gap-1.5 border border-[#E8E3D8] bg-[#FAF8F5] hover:bg-stone-100 px-3 py-1.5 text-xs font-normal text-stone-700 rounded-[4px] transition cursor-pointer"
            >
              <Gift size={12} className="text-[#9A7B4F]" />
              <span>Select Different Gift</span>
              <ChevronDown size={11} className="text-stone-400" />
            </button>
            <button
              onClick={() => setShowAddPrizeModal(true)}
              className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-white hover:bg-[#FAF8F5] px-2.5 py-1.5 text-xs text-stone-600 rounded-[4px] transition cursor-pointer"
              title="Add a new gift with Cloudinary photo"
            >
              <Plus size={12} />
              <span>New</span>
            </button>
          </div>
        </div>

        {/* Live Roller / Entrant Slot */}
        <div className="border border-[#E8E3D8] bg-[#FAF8F5] p-4 rounded-[6px] space-y-1.5 min-h-[90px] flex flex-col items-center justify-center">
          {display ? (
            <>
              <div className="inline-flex items-center gap-1 font-mono text-xs font-normal text-stone-500">
                <Ticket size={12} className="text-[#9A7B4F]" />
                <span>{display.couponId || `ENTRANT #${display.id}`}</span>
              </div>
              <p className="text-base sm:text-lg font-normal text-stone-900 truncate max-w-[340px]">
                {display.name}
              </p>
              <p className="font-mono text-xs text-stone-500 font-light">
                {display.phone.slice(0, 5)}•••••
              </p>
            </>
          ) : (
            <p className="text-xs text-stone-400 font-light">No entrants registered in live pool yet</p>
          )}

          {phase === 'spinning' && (
            <div className="w-full bg-[#E8E3D8] h-1 rounded-full overflow-hidden mt-2">
              <div
                className="bg-[#9A7B4F] h-full transition-all duration-75"
                style={{ width: `${progress}%` }}
              />
            </div>
          )}

          {phase === 'verifying' && (
            <div className="flex items-center gap-1.5 text-xs text-[#9A7B4F] font-normal pt-1">
              <Loader2 size={13} className="animate-spin" />
              <span>Validating winner...</span>
            </div>
          )}
        </div>

        {/* Trigger Action */}
        <div className="pt-2">
          {phase === 'ready' && (
            <button
              onClick={startDraw}
              disabled={pool.length === 0}
              className="w-full border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 py-3 px-5 text-xs sm:text-sm font-normal text-white uppercase tracking-wider rounded-[6px] shadow-2xs transition active:scale-[0.99] disabled:opacity-40 cursor-pointer flex items-center justify-center gap-2"
            >
              <Sparkles size={14} className="text-[#C2A676]" />
              <span>Spin & Pick Winner</span>
            </button>
          )}

          {(phase === 'spinning' || phase === 'verifying') && (
            <button
              disabled
              className="w-full border border-[#E8E3D8] bg-stone-100 py-3 text-xs sm:text-sm font-normal text-stone-500 uppercase tracking-wider rounded-[6px] flex items-center justify-center gap-2 cursor-not-allowed"
            >
              <Loader2 size={14} className="animate-spin text-[#9A7B4F]" />
              <span>Spinning Stage...</span>
            </button>
          )}

          {(phase === 'reveal' || phase === 'done') && (
            <button
              onClick={() => setShowModal(true)}
              className="w-full border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 py-3 text-xs sm:text-sm font-normal text-white uppercase tracking-wider rounded-[6px] transition cursor-pointer flex items-center justify-center gap-2"
            >
              <Trophy size={14} className="text-[#C2A676]" />
              <span>View Winner Announcement</span>
            </button>
          )}
        </div>
      </div>

      {/* Confirmed Winner Toast Banner */}
      {confirmedWinnerInfo && (
        <div className="mt-4 border border-[#E8E3D8] bg-white p-3.5 rounded-[6px] shadow-2xs max-w-[460px] w-full flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 size={15} className="text-emerald-700" />
            <span className="font-normal text-stone-800">
              {confirmedWinnerInfo.winner.name} won {confirmedWinnerInfo.prize.name}!
            </span>
          </div>
          <Link to="/admin/winners" className="text-[#9A7B4F] hover:underline font-normal">
            View History →
          </Link>
        </div>
      )}

      {/* WINNER ANNOUNCEMENT MODAL */}
      {showModal && winner && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="relative w-full max-w-sm my-auto border border-[#E8E3D8] bg-white p-6 sm:p-7 rounded-[6px] shadow-xl text-center space-y-4">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#FAF8F5] border border-[#E8E3D8] text-[#9A7B4F]">
              <Trophy size={24} />
            </div>

            <div className="space-y-1">
              <span className="text-[10px] uppercase tracking-widest text-[#9A7B4F] font-normal">
                OFFICIAL WINNER
              </span>
              <h2 className="text-xl sm:text-2xl font-normal text-stone-900 tracking-tight">
                {winner.name}
              </h2>
              <p className="font-mono text-xs text-stone-500 font-light">
                {winner.phone}
              </p>
            </div>

            {winner.couponId && (
              <div className="inline-flex items-center gap-1.5 border border-[#E8E3D8] bg-[#FAF8F5] px-3 py-1 rounded-[4px] font-mono text-xs text-stone-800">
                <Ticket size={12} className="text-[#9A7B4F]" />
                <span>Token: {winner.couponId}</span>
              </div>
            )}

            {/* Gift Awarded Box */}
            <div className="border border-[#E8E3D8] bg-[#FAF8F5] p-3 rounded-[6px] flex items-center gap-3 text-left">
              <img
                src={activePrize.image}
                alt={activePrize.name}
                className="w-12 h-12 rounded-[4px] object-cover border border-[#E8E3D8]"
              />
              <div className="flex-1 truncate">
                <p className="text-[10px] text-stone-400 uppercase">Prize Awarded</p>
                <p className="text-xs font-normal text-stone-900 truncate">{activePrize.name}</p>
                {activePrize.value && (
                  <p className="text-[11px] font-mono text-[#9A7B4F]">{activePrize.value}</p>
                )}
              </div>
            </div>

            {/* Actions */}
            <div className="pt-2 space-y-2">
              <button
                onClick={handleConfirmWinner}
                disabled={isConfirming}
                className="w-full border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 py-2.5 text-xs font-normal text-white uppercase tracking-wider rounded-[6px] shadow-2xs transition cursor-pointer disabled:opacity-50 flex items-center justify-center gap-1.5"
              >
                {isConfirming ? (
                  <>
                    <Loader2 size={13} className="animate-spin" />
                    <span>Recording Winner...</span>
                  </>
                ) : (
                  <>
                    <Check size={14} className="text-[#C2A676]" />
                    <span>Confirm & Record Winner</span>
                  </>
                )}
              </button>

              <button
                onClick={resetSpin}
                className="w-full border border-[#E8E3D8] bg-white hover:bg-[#FAF8F5] py-2 text-xs font-normal text-stone-700 rounded-[6px] transition cursor-pointer flex items-center justify-center gap-1"
              >
                <RotateCcw size={12} />
                <span>Spin Next Winner</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SELECT GIFT MODAL */}
      {showPrizeSelector && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto border border-[#E8E3D8] bg-white p-5 rounded-[6px] shadow-lg space-y-4">
            <div className="flex items-center justify-between border-b border-[#E8E3D8] pb-3">
              <h3 className="text-sm font-normal text-stone-900">Select Gift for Live Draw</h3>
              <button
                onClick={() => setShowPrizeSelector(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <div className="max-h-72 overflow-y-auto divide-y divide-[#F2EFE9] border border-[#E8E3D8] rounded-[4px]">
              {data.prizes.map((p) => {
                const isSelected = p.id === activePrize.id
                return (
                  <button
                    key={p.id}
                    onClick={() => {
                      setSelectedPrizeId(p.id)
                      setShowPrizeSelector(false)
                      setToast(`Active gift switched to ${p.name}!`)
                    }}
                    className={`w-full p-2.5 flex items-center gap-3 text-left transition cursor-pointer ${
                      isSelected ? 'bg-[#FAF8F5]' : 'hover:bg-stone-50'
                    }`}
                  >
                    <img src={p.image} alt={p.name} className="w-10 h-10 rounded-[3px] object-cover border border-[#E8E3D8]" />
                    <div className="flex-1 truncate">
                      <p className="text-xs font-normal text-stone-900 truncate">{p.name}</p>
                      <p className="text-[11px] text-stone-400 font-light">{p.value || 'Special Gift'}</p>
                    </div>
                    {isSelected && <Check size={14} className="text-[#9A7B4F] shrink-0" />}
                  </button>
                )
              })}
            </div>

            <div className="flex justify-between items-center pt-2">
              <button
                onClick={() => {
                  setShowPrizeSelector(false)
                  setShowAddPrizeModal(true)
                }}
                className="text-xs text-[#9A7B4F] hover:underline font-normal"
              >
                + Upload New Gift
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

      {/* ADD NEW GIFT MODAL (WITH CLOUDINARY UPLOAD) */}
      {showAddPrizeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="w-full max-w-md my-auto border border-[#E8E3D8] bg-white p-5 rounded-[6px] shadow-lg">
            <div className="flex items-center justify-between border-b border-[#E8E3D8] pb-3">
              <h3 className="text-sm font-normal text-stone-900">Add New Gift (Cloudinary)</h3>
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
                  placeholder="e.g. Smart 4K TV, Refrigerator, Gold Coin"
                  value={newGift.name}
                  onChange={(e) => setNewGift({ ...newGift, name: e.target.value })}
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-stone-600">Description <span className="text-stone-400">(optional)</span></label>
                <input
                  placeholder="e.g. 55-inch OLED display"
                  value={newGift.description}
                  onChange={(e) => setNewGift({ ...newGift, description: e.target.value })}
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-stone-600">Value <span className="text-stone-400">(optional)</span></label>
                <input
                  placeholder="e.g. ₹42,000"
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
                      <p className="text-[11px] text-stone-600">Uploading to Cloudinary...</p>
                    </div>
                  ) : newGift.image ? (
                    <div className="flex items-center gap-3">
                      <img src={newGift.image} alt="Preview" className="w-16 h-12 rounded-[3px] object-cover border border-[#E8E3D8]" />
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
                      <p className="mt-1 text-[11px] text-stone-700">Click to upload photo (Cloudinary)</p>
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
                  Save & Use Gift
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}
