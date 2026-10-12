import React, { useState, useEffect, useRef, useCallback } from 'react'
import {
  Sparkles,
  Ticket,
  Users,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  RotateCcw,
  CheckCheck,
  Loader2,
  RefreshCw,
  Search,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Sliders,
  Database,
} from 'lucide-react'
import { api } from '../lib/api'

/* ==========================================================================
   TEMPORARY TESTING FUNCTIONALITY - START
   This component provides testing controls for generating up to 10 Lakh
   test coupons, toggling "All Used", and "Reset to Unused".
   ========================================================================== */

interface TestStats {
  totalTestCoupons: number
  totalTestParticipants: number
  unusedTestCoupons: number
  usedTestCoupons: number
}

export function TestCouponManager() {
  const [stats, setStats] = useState<TestStats>({
    totalTestCoupons: 0,
    totalTestParticipants: 0,
    unusedTestCoupons: 0,
    usedTestCoupons: 0,
  })
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [actionMessage, setActionMessage] = useState<{
    type: 'success' | 'error' | 'info'
    text: string
  } | null>(null)

  // Generation state
  const [generateCount, setGenerateCount] = useState<number>(1000)
  const [isGenerating, setIsGenerating] = useState(false)
  const [generationProgress, setGenerationProgress] = useState<{
    current: number
    total: number
    percentage: number
    status: string
    message: string
  } | null>(null)

  // Confirmation modals
  const [confirmModal, setConfirmModal] = useState<{
    isOpen: boolean
    action: 'all-used' | 'reset-unused' | null
    title: string
    description: string
  }>({
    isOpen: false,
    action: null,
    title: '',
    description: '',
  })
  const [isPerformingBulkAction, setIsPerformingBulkAction] = useState(false)

  // Inspection Table
  const [activeTab, setActiveTab] = useState<'coupons' | 'participants'>('coupons')
  const [inspectPage, setInspectPage] = useState(1)
  const [inspectStatusFilter, setInspectStatusFilter] = useState<'all' | 'Unused' | 'Used'>('all')
  const [inspectSearch, setInspectSearch] = useState('')
  const [inspectData, setInspectData] = useState<{
    items: any[]
    total: number
    totalPages: number
  }>({ items: [], total: 0, totalPages: 0 })
  const [isLoadingInspect, setIsLoadingInspect] = useState(false)

  const pollTimerRef = useRef<NodeJS.Timeout | null>(null)

  // 1. Fetch Stats from DB
  const fetchStats = useCallback(async () => {
    setIsLoadingStats(true)
    try {
      const res = await api.getTestStats()
      if (res.ok && res.stats) {
        setStats(res.stats)
      }
    } catch (err: any) {
      console.error('Failed to load test stats:', err)
    } finally {
      setIsLoadingStats(false)
    }
  }, [])

  useEffect(() => {
    fetchStats()
  }, [fetchStats])

  // 2. Poll progress if a job is running
  const startProgressPolling = useCallback(() => {
    if (pollTimerRef.current) clearInterval(pollTimerRef.current)

    pollTimerRef.current = setInterval(async () => {
      try {
        const res = await api.getTestProgress()
        if (res.ok && res.job) {
          const { status, current, total, percentage, message, error } = res.job

          if (status === 'running') {
            setIsGenerating(true)
            setGenerationProgress({ current, total, percentage, status, message })
          } else if (status === 'completed') {
            setIsGenerating(false)
            setGenerationProgress({ current, total, percentage: 100, status, message })
            clearInterval(pollTimerRef.current!)
            pollTimerRef.current = null
            fetchStats()
            setActionMessage({ type: 'success', text: message })
          } else if (status === 'failed') {
            setIsGenerating(false)
            setGenerationProgress(null)
            clearInterval(pollTimerRef.current!)
            pollTimerRef.current = null
            fetchStats()
            setActionMessage({ type: 'error', text: error || message || 'Job failed' })
          }
        }
      } catch {
        // ignore polling network errors
      }
    }, 1500)
  }, [fetchStats])

  useEffect(() => {
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current)
    }
  }, [])

  // 3. Handle Generation Trigger
  const handleStartGeneration = async () => {
    if (generateCount <= 0 || generateCount > 1000000) {
      alert('Please enter a count between 1 and 1,000,000.')
      return
    }

    setIsGenerating(true)
    setActionMessage(null)
    setGenerationProgress({
      current: 0,
      total: generateCount,
      percentage: 0,
      status: 'starting',
      message: `Initiating generation of ${generateCount.toLocaleString()} test coupons...`,
    })

    try {
      const res = await api.generateTestCoupons(generateCount)
      if (res.ok) {
        startProgressPolling()
      } else {
        setIsGenerating(false)
        setActionMessage({ type: 'error', text: res.error || 'Failed to start generation' })
      }
    } catch (err: any) {
      setIsGenerating(false)
      setActionMessage({ type: 'error', text: err.message || 'Error triggering generation' })
    }
  }

  // 4. Handle "All Used" Action
  const handleExecuteAllUsed = async () => {
    setIsPerformingBulkAction(true)
    setActionMessage(null)
    setConfirmModal({ ...confirmModal, isOpen: false })

    try {
      const res = await api.setTestCouponsAllUsed()
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: `Success: Updated ${res.updatedCount?.toLocaleString()} test coupons to USED. Database verified counts: ${res.verifiedUsed?.toLocaleString()} Used, ${res.verifiedUnused?.toLocaleString()} Unused.`,
        })
        await fetchStats()
        fetchInspectData()
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to update test coupons to Used' })
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Bulk update failed' })
    } finally {
      setIsPerformingBulkAction(false)
    }
  }

  // 5. Handle "Reset to Unused" Action
  const handleExecuteResetUnused = async () => {
    setIsPerformingBulkAction(true)
    setActionMessage(null)
    setConfirmModal({ ...confirmModal, isOpen: false })

    try {
      const res = await api.resetTestCouponsUnused()
      if (res.ok) {
        setActionMessage({
          type: 'success',
          text: `Success: Reset ${res.resetCount?.toLocaleString()} test coupons to UNUSED. Database verified counts: ${res.verifiedUnused?.toLocaleString()} Unused, ${res.verifiedUsed?.toLocaleString()} Used.`,
        })
        await fetchStats()
        fetchInspectData()
      } else {
        setActionMessage({ type: 'error', text: res.error || 'Failed to reset test coupons' })
      }
    } catch (err: any) {
      setActionMessage({ type: 'error', text: err.message || 'Bulk reset failed' })
    } finally {
      setIsPerformingBulkAction(false)
    }
  }

  // 6. Fetch Inspect Data (Paginated)
  const fetchInspectData = useCallback(async () => {
    setIsLoadingInspect(true)
    try {
      const params = new URLSearchParams({
        page: String(inspectPage),
        limit: '20',
        search: inspectSearch.trim(),
      })

      if (activeTab === 'coupons') {
        if (inspectStatusFilter !== 'all') params.append('status', inspectStatusFilter)
        const res = await api.getTestCoupons(params)
        if (res.ok && res.coupons) {
          setInspectData({
            items: res.coupons,
            total: res.total || 0,
            totalPages: res.totalPages || 0,
          })
        }
      } else {
        const res = await api.getTestParticipants(params)
        if (res.ok && res.participants) {
          setInspectData({
            items: res.participants,
            total: res.total || 0,
            totalPages: res.totalPages || 0,
          })
        }
      }
    } catch (err: any) {
      console.error('Failed to inspect test records:', err)
    } finally {
      setIsLoadingInspect(false)
    }
  }, [activeTab, inspectPage, inspectStatusFilter, inspectSearch])

  useEffect(() => {
    const t = setTimeout(fetchInspectData, 300)
    return () => clearTimeout(t)
  }, [fetchInspectData])

  return (
    <div className="space-y-6">
      {/* 1. Isolation Warning Header Banner */}
      <div className="rounded-xl border border-amber-300/60 bg-gradient-to-r from-amber-50 to-orange-50 p-4 shadow-xs">
        <div className="flex items-start gap-3">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-700 shrink-0 mt-0.5">
            <ShieldAlert size={20} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold text-amber-900 text-sm">Temporary Testing Suite (Simulation Sandbox)</h3>
              <span className="text-[10px] font-mono font-bold bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded-full uppercase tracking-wider">
                isTest: true
              </span>
            </div>
            <p className="text-xs text-amber-800/90 mt-1 leading-relaxed">
              This module operates exclusively on records with <code className="font-mono font-bold">isTest: true</code>.
              Production coupons, real customer participants, live draws, and winners are completely isolated and protected.
              Supports generating up to <strong>10,00,000 (10 Lakh)</strong> test coupons with dummy participants.
            </p>
          </div>
          <button
            type="button"
            onClick={fetchStats}
            disabled={isLoadingStats}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-amber-300 hover:bg-amber-100/50 text-amber-900 rounded-lg text-xs font-medium transition cursor-pointer"
          >
            <RefreshCw size={13} className={isLoadingStats ? 'animate-spin' : ''} />
            <span>Refresh Stats</span>
          </button>
        </div>
      </div>

      {/* 2. Notification / Result Banner */}
      {actionMessage && (
        <div
          className={`p-3 rounded-lg border text-xs flex items-center justify-between ${
            actionMessage.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : actionMessage.type === 'error'
              ? 'bg-red-50 border-red-200 text-red-800'
              : 'bg-sky-50 border-sky-200 text-sky-800'
          }`}
        >
          <div className="flex items-center gap-2">
            {actionMessage.type === 'success' ? (
              <CheckCircle2 size={16} className="text-emerald-600 shrink-0" />
            ) : actionMessage.type === 'error' ? (
              <XCircle size={16} className="text-red-600 shrink-0" />
            ) : (
              <AlertTriangle size={16} className="text-sky-600 shrink-0" />
            )}
            <span>{actionMessage.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionMessage(null)}
            className="text-stone-400 hover:text-stone-700 text-xs cursor-pointer ml-3"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* 3. Live Database Statistics KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Test Coupons</span>
            <Ticket size={16} className="text-[#C2A676]" />
          </div>
          <p className="text-2xl font-bold text-stone-900 font-mono">
            {stats.totalTestCoupons.toLocaleString()}
          </p>
          <span className="text-[10px] text-stone-400 flex items-center gap-1 mt-1">
            <Database size={10} /> Actual DB Records
          </span>
        </div>

        <div className="bg-white border border-stone-200 rounded-xl p-4 shadow-xs">
          <div className="flex items-center justify-between text-stone-500 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Test Participants</span>
            <Users size={16} className="text-cyan-600" />
          </div>
          <p className="text-2xl font-bold text-stone-900 font-mono">
            {stats.totalTestParticipants.toLocaleString()}
          </p>
          <span className="text-[10px] text-stone-400 flex items-center gap-1 mt-1">
            <CheckCircle2 size={10} className="text-cyan-600" /> Dummy Participants (Test 1..N)
          </span>
        </div>

        <div className="bg-white border border-emerald-200/80 rounded-xl p-4 shadow-xs bg-emerald-50/20">
          <div className="flex items-center justify-between text-emerald-700 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Unused (Valid)</span>
            <CheckCircle2 size={16} className="text-emerald-600" />
          </div>
          <p className="text-2xl font-bold text-emerald-800 font-mono">
            {stats.unusedTestCoupons.toLocaleString()}
          </p>
          <span className="text-[10px] text-emerald-600 font-medium mt-1 inline-block">
            Returns "Valid Coupon" on scan
          </span>
        </div>

        <div className="bg-white border border-rose-200/80 rounded-xl p-4 shadow-xs bg-rose-50/20">
          <div className="flex items-center justify-between text-rose-700 mb-1">
            <span className="text-[11px] font-medium uppercase tracking-wider">Used</span>
            <CheckCheck size={16} className="text-rose-600" />
          </div>
          <p className="text-2xl font-bold text-rose-800 font-mono">
            {stats.usedTestCoupons.toLocaleString()}
          </p>
          <span className="text-[10px] text-rose-600 font-medium mt-1 inline-block">
            Returns "Coupon Already Used" on scan
          </span>
        </div>
      </div>

      {/* 4. Action Cards Grid: Generation + Bulk Status Buttons */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Card A: Test Coupon Generator */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sparkles size={17} className="text-[#C2A676]" />
              <h4 className="font-semibold text-stone-900 text-sm">1. Generate Test Coupons & Dummy Participants</h4>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Bulk generates unique 13-character test coupon IDs and links each coupon to a dummy participant
              (<strong>Test 1, Test 2, Test 3...</strong>). All are saved directly in MongoDB in high-speed chunks.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-stone-700 mb-1">
                  Coupons to Generate (Max 10,00,000 / 10 Lakh):
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    min={1}
                    max={1000000}
                    value={generateCount}
                    onChange={(e) => setGenerateCount(Number(e.target.value))}
                    disabled={isGenerating}
                    className="flex-1 px-3 py-2 border border-stone-300 rounded-lg text-sm font-mono focus:border-[#C2A676] focus:ring-1 focus:ring-[#C2A676] outline-none"
                    placeholder="e.g. 1000000"
                  />
                  <button
                    type="button"
                    onClick={handleStartGeneration}
                    disabled={isGenerating || isPerformingBulkAction}
                    className="px-4 py-2 bg-[#1E1B18] hover:bg-[#2A2520] text-[#FAF8F5] rounded-lg text-xs font-semibold flex items-center gap-1.5 transition disabled:opacity-50 cursor-pointer shrink-0"
                  >
                    {isGenerating ? (
                      <>
                        <Loader2 size={14} className="animate-spin text-[#C2A676]" />
                        <span>Generating...</span>
                      </>
                    ) : (
                      <>
                        <Sparkles size={14} className="text-[#C2A676]" />
                        <span>Generate Coupons</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick Preset Buttons */}
              <div className="flex flex-wrap items-center gap-1.5 text-xs">
                <span className="text-[11px] text-stone-400 mr-1">Presets:</span>
                {[100, 1000, 10000, 100000, 1000000].map((num) => (
                  <button
                    key={num}
                    type="button"
                    disabled={isGenerating}
                    onClick={() => setGenerateCount(num)}
                    className={`px-2 py-1 rounded text-[11px] font-mono border transition cursor-pointer ${
                      generateCount === num
                        ? 'bg-[#C2A676]/20 border-[#C2A676] text-stone-900 font-bold'
                        : 'border-stone-200 text-stone-600 hover:bg-stone-50'
                    }`}
                  >
                    {num === 1000000 ? '10 Lakh (1M)' : num === 100000 ? '1 Lakh (100k)' : num.toLocaleString()}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Generation Progress Bar */}
          {generationProgress && (
            <div className="mt-4 pt-3 border-t border-stone-100">
              <div className="flex items-center justify-between text-xs mb-1">
                <span className="font-medium text-stone-700">{generationProgress.message}</span>
                <span className="font-mono font-bold text-stone-900">{generationProgress.percentage}%</span>
              </div>
              <div className="w-full bg-stone-100 rounded-full h-2 overflow-hidden">
                <div
                  className="bg-[#C2A676] h-2 transition-all duration-300 rounded-full"
                  style={{ width: `${generationProgress.percentage}%` }}
                />
              </div>
              <p className="text-[10px] text-stone-400 mt-1 font-mono">
                {generationProgress.current.toLocaleString()} / {generationProgress.total.toLocaleString()} records processed
              </p>
            </div>
          )}
        </div>

        {/* Card B: Testing Controls (All Used & Reset to Unused) */}
        <div className="bg-white border border-stone-200 rounded-xl p-5 shadow-xs flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Sliders size={17} className="text-amber-600" />
              <h4 className="font-semibold text-stone-900 text-sm">2. Testing Simulation Controls</h4>
            </div>
            <p className="text-xs text-stone-500 mb-4">
              Switch test coupons between <strong>UNUSED</strong> and <strong>USED</strong> in the actual database.
              When scanned, backend verification recognizes the updated status instantly.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Button 1: "All Used" */}
              <div className="p-3.5 rounded-xl border border-rose-200 bg-rose-50/40 flex flex-col justify-between">
                <div>
                  <h5 className="font-bold text-rose-900 text-xs flex items-center gap-1.5 mb-1">
                    <CheckCheck size={14} className="text-rose-600" />
                    “All Used” Button
                  </h5>
                  <p className="text-[11px] text-rose-700/80 mb-3 leading-relaxed">
                    Bulk-updates all <code className="font-mono font-bold">isTest</code> coupons from UNUSED to USED.
                    Scanning any test coupon will display <strong>“Coupon Already Used”</strong>.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPerformingBulkAction || isGenerating || stats.unusedTestCoupons === 0}
                  onClick={() =>
                    setConfirmModal({
                      isOpen: true,
                      action: 'all-used',
                      title: 'Mark All Test Coupons as USED?',
                      description: `Are you sure you want to update all ${stats.unusedTestCoupons.toLocaleString()} UNUSED test coupons to USED in the database? Real customer coupons and production records will NOT be touched.`,
                    })
                  }
                  className="w-full py-2 px-3 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isPerformingBulkAction ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <CheckCheck size={13} />
                  )}
                  <span>All Used ({stats.unusedTestCoupons.toLocaleString()})</span>
                </button>
              </div>

              {/* Button 2: "Reset to Unused" */}
              <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/40 flex flex-col justify-between">
                <div>
                  <h5 className="font-bold text-emerald-900 text-xs flex items-center gap-1.5 mb-1">
                    <RotateCcw size={14} className="text-emerald-600" />
                    “Reset to Unused” Button
                  </h5>
                  <p className="text-[11px] text-emerald-700/80 mb-3 leading-relaxed">
                    Bulk-updates all <code className="font-mono font-bold">isTest</code> coupons from USED back to UNUSED.
                    Scanning will display <strong>“Valid Coupon”</strong> and coupon becomes eligible for entry again.
                  </p>
                </div>
                <button
                  type="button"
                  disabled={isPerformingBulkAction || isGenerating || stats.usedTestCoupons === 0}
                  onClick={() =>
                    setConfirmModal({
                      isOpen: true,
                      action: 'reset-unused',
                      title: 'Reset All Test Coupons to UNUSED?',
                      description: `Are you sure you want to reset all ${stats.usedTestCoupons.toLocaleString()} USED test coupons back to UNUSED in the database? They will immediately become eligible for redemption again.`,
                    })
                  }
                  className="w-full py-2 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-xs cursor-pointer disabled:opacity-50"
                >
                  {isPerformingBulkAction ? (
                    <Loader2 size={13} className="animate-spin" />
                  ) : (
                    <RotateCcw size={13} />
                  )}
                  <span>Reset to Unused ({stats.usedTestCoupons.toLocaleString()})</span>
                </button>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-3 border-t border-stone-100 text-[11px] text-stone-500 flex items-center justify-between">
            <span>Redemption Race Condition Protection:</span>
            <span className="font-mono font-bold text-emerald-700 flex items-center gap-1">
              <CheckCircle2 size={12} /> Atomic Double-Spend Guard Active
            </span>
          </div>
        </div>
      </div>

      {/* 5. Paginated Inspection Table (Never loads 1M records at once) */}
      <div className="bg-white border border-stone-200 rounded-xl overflow-hidden shadow-xs">
        <div className="border-b border-stone-200 p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-stone-50/50">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setActiveTab('coupons')
                setInspectPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'coupons'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              Test Coupons ({stats.totalTestCoupons.toLocaleString()})
            </button>
            <button
              type="button"
              onClick={() => {
                setActiveTab('participants')
                setInspectPage(1)
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'participants'
                  ? 'bg-stone-900 text-white shadow-xs'
                  : 'bg-white border border-stone-200 text-stone-600 hover:bg-stone-100'
              }`}
            >
              Dummy Participants ({stats.totalTestParticipants.toLocaleString()})
            </button>
          </div>

          <div className="flex items-center gap-2">
            {activeTab === 'coupons' && (
              <select
                value={inspectStatusFilter}
                onChange={(e) => {
                  setInspectStatusFilter(e.target.value as any)
                  setInspectPage(1)
                }}
                className="px-2.5 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-medium text-stone-700 outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Unused">Unused Only</option>
                <option value="Used">Used Only</option>
              </select>
            )}

            <div className="relative">
              <Search size={13} className="absolute left-2.5 top-2.5 text-stone-400" />
              <input
                type="text"
                value={inspectSearch}
                onChange={(e) => {
                  setInspectSearch(e.target.value)
                  setInspectPage(1)
                }}
                placeholder={activeTab === 'coupons' ? 'Search coupon ID...' : 'Search participant name...'}
                className="pl-8 pr-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs text-stone-700 outline-none w-44 sm:w-52"
              />
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-stone-200 bg-stone-100/60 text-stone-600 font-semibold text-[11px] uppercase tracking-wider">
                {activeTab === 'coupons' ? (
                  <>
                    <th className="py-2.5 px-4">Coupon ID</th>
                    <th className="py-2.5 px-4">Serial No</th>
                    <th className="py-2.5 px-4">Status</th>
                    <th className="py-2.5 px-4">Linked Participant</th>
                    <th className="py-2.5 px-4">Created At</th>
                  </>
                ) : (
                  <>
                    <th className="py-2.5 px-4">Participant ID</th>
                    <th className="py-2.5 px-4">Name</th>
                    <th className="py-2.5 px-4">Phone</th>
                    <th className="py-2.5 px-4">Assigned Coupon ID</th>
                    <th className="py-2.5 px-4">Eligibility</th>
                  </>
                )}
              </tr>
            </thead>
            <tbody className="divide-y divide-stone-100 font-mono text-[11px]">
              {isLoadingInspect ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400">
                    <Loader2 size={18} className="animate-spin inline-block mr-2" />
                    Loading records from database...
                  </td>
                </tr>
              ) : inspectData.items.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-stone-400 font-sans">
                    No test records found in database. Use the generator above to create test coupons.
                  </td>
                </tr>
              ) : activeTab === 'coupons' ? (
                inspectData.items.map((c) => (
                  <tr key={c.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-2.5 px-4 font-bold text-stone-900">{c.id}</td>
                    <td className="py-2.5 px-4 text-stone-500">{c.serialNo || '-'}</td>
                    <td className="py-2.5 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full font-bold text-[10px] ${
                          c.status === 'Used'
                            ? 'bg-rose-100 text-rose-800'
                            : 'bg-emerald-100 text-emerald-800'
                        }`}
                      >
                        {c.status === 'Used' ? (
                          <CheckCheck size={11} />
                        ) : (
                          <CheckCircle2 size={11} />
                        )}
                        {c.status}
                      </span>
                    </td>
                    <td className="py-2.5 px-4 font-sans text-stone-600">
                      {c.usedByParticipantName || '-'}
                    </td>
                    <td className="py-2.5 px-4 text-stone-400">{c.createdAt?.slice(0, 10)}</td>
                  </tr>
                ))
              ) : (
                inspectData.items.map((p) => (
                  <tr key={p.id} className="hover:bg-stone-50/70 transition">
                    <td className="py-2.5 px-4 font-bold text-stone-900">{p.id}</td>
                    <td className="py-2.5 px-4 font-sans font-medium text-stone-800">{p.name}</td>
                    <td className="py-2.5 px-4 text-stone-500">{p.phone}</td>
                    <td className="py-2.5 px-4 text-cyan-800 font-bold">{p.couponId || '-'}</td>
                    <td className="py-2.5 px-4">
                      <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        {p.eligibility || 'Eligible'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Controls */}
        <div className="border-t border-stone-200 p-3 bg-stone-50/50 flex items-center justify-between text-xs text-stone-500">
          <span>
            Showing page <strong>{inspectPage}</strong> of <strong>{inspectData.totalPages || 1}</strong> (Total:{' '}
            {inspectData.total.toLocaleString()} records)
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={inspectPage <= 1 || isLoadingInspect}
              onClick={() => setInspectPage((p) => Math.max(1, p - 1))}
              className="p-1.5 border border-stone-300 rounded-lg hover:bg-white disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronLeft size={14} />
            </button>
            <button
              type="button"
              disabled={inspectPage >= inspectData.totalPages || isLoadingInspect}
              onClick={() => setInspectPage((p) => p + 1)}
              className="p-1.5 border border-stone-300 rounded-lg hover:bg-white disabled:opacity-40 transition cursor-pointer"
            >
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* 6. Confirmation Dialog Modal */}
      {confirmModal.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-md bg-white rounded-2xl p-6 shadow-2xl border border-stone-200">
            <div className="flex items-start gap-3 mb-4">
              <div
                className={`p-2.5 rounded-xl shrink-0 ${
                  confirmModal.action === 'all-used'
                    ? 'bg-rose-100 text-rose-700'
                    : 'bg-emerald-100 text-emerald-700'
                }`}
              >
                <AlertTriangle size={22} />
              </div>
              <div>
                <h4 className="font-bold text-stone-900 text-base">{confirmModal.title}</h4>
                <p className="text-xs text-stone-500 mt-1 leading-relaxed">{confirmModal.description}</p>
              </div>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-2.5 mb-5 text-[11px] text-amber-900">
              ⚡ <strong>Safety Confirmation:</strong> Only records marked with <code className="font-mono">isTest: true</code> will be affected. Production records are safe.
            </div>

            <div className="flex items-center justify-end gap-2.5">
              <button
                type="button"
                onClick={() => setConfirmModal({ ...confirmModal, isOpen: false })}
                className="px-4 py-2 border border-stone-300 rounded-lg text-xs font-semibold text-stone-700 hover:bg-stone-50 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmModal.action === 'all-used' ? handleExecuteAllUsed : handleExecuteResetUnused}
                className={`px-4 py-2 rounded-lg text-xs font-bold text-white transition cursor-pointer ${
                  confirmModal.action === 'all-used'
                    ? 'bg-rose-600 hover:bg-rose-700'
                    : 'bg-emerald-600 hover:bg-emerald-700'
                }`}
              >
                Confirm and Execute
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

/* ==========================================================================
   TEMPORARY TESTING FUNCTIONALITY - END
   ========================================================================== */
export default TestCouponManager
