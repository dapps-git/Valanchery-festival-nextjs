import { useState } from 'react'
import { Link } from 'react-router-dom'
import { AnimatedNumber } from '@/components/AnimatedNumber'
import { useApp } from '@/context/AppContext'
import { formatDate, formatShortDate } from '@/lib/format'
import { exportCouponsToXlsx } from '@/lib/exportCsv'
import { api } from '@/lib/api'
import { Sparkles, Ticket, Layers, Download, ListFilter, Gift, Users, Trophy, CheckCircle2, Loader2 } from 'lucide-react'

export function DashboardPage() {
  const { data, coupons, batches, getPrize, getParticipant } = useApp()
  const [downloadingBatchId, setDownloadingBatchId] = useState<string | null>(null)
  const recent = [...data.winners]
    .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime() || b.id.localeCompare(a.id))
    .slice(0, 5)

  const allBatches = batches && batches.length > 0 ? batches : data.batches || []
  const totalFromBatches = allBatches.reduce((acc, b) => acc + (b.count || 0), 0)
  const totalCouponsCount = typeof data.totalCouponsCount === 'number' ? data.totalCouponsCount : totalFromBatches
  const usedCount = typeof data.usedCouponsCount === 'number' ? data.usedCouponsCount : data.participants.length
  const unusedCount = Math.max(0, totalCouponsCount - usedCount)

  // Map winner participant IDs
  const winnerParticipantIds = new Set(data.winners.map((w) => w.participantId))
  const registeredCount = data.participants.length
  const wonCount = data.winners.length
  const activePoolCount = data.participants.filter(
    (p) => p.status === 'Active' && !winnerParticipantIds.has(p.id)
  ).length

  const handleDownloadBatch = async (batchId: string, batchName: string, batchCount = 10000) => {
    setDownloadingBatchId(batchId)
    try {
      let batchCoupons: any[] = []
      const d = await api.getBatchCoupons(batchId, Math.min(batchCount || 10000, 50000))
      if (d.ok && Array.isArray(d.coupons) && d.coupons.length > 0) {
        batchCoupons = d.coupons
      } else {
        batchCoupons = (coupons || []).filter((c) => c.batchId === batchId)
      }

      if (batchCoupons.length === 0) {
        alert('No coupons found for this batch in the database.')
        return
      }

      exportCouponsToXlsx(batchCoupons, `${batchName.replace(/\s+/g, '_')}.xlsx`)
    } catch (err: any) {
      alert('Failed to download batch: ' + (err.message || err))
    } finally {
      setDownloadingBatchId(null)
    }
  }

  return (
    <div className="space-y-6 font-sans font-normal text-[#292524]">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E8E3D8] pb-4">
        <div>
          <h1 className="text-2xl font-medium tracking-tight text-stone-900">
            Festival Dashboard
          </h1>
          <p className="mt-0.5 text-xs text-stone-500 font-normal">
            Valanchery Festival 2026 Management Console
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/admin/prizes"
            className="flex items-center gap-1.5 border border-[#E8E3D8] bg-white px-3.5 py-1.5 text-xs font-medium text-stone-700 hover:text-stone-900 hover:border-stone-400 transition rounded-[6px] shadow-2xs"
          >
            <Gift size={13} className="text-[#9A7B4F]" />
            <span>Gifts</span>
          </Link>
          <Link
            to="/admin/lucky-draw"
            className="flex items-center gap-1.5 border border-[#1E1B18] bg-[#1E1B18] px-4 py-1.5 text-xs font-medium text-white hover:bg-stone-800 transition rounded-[6px] shadow-2xs"
          >
            <Sparkles size={13} className="text-[#C2A676]" />
            <span>Live Draw Stage</span>
          </Link>
        </div>
      </div>

      {/* Primary Highlighted Participant Status Cards: Registered vs Unregistered vs Won */}
      <div className="grid gap-3 sm:grid-cols-3">
        {/* 1. REGISTERED ENTRANTS */}
        <Link
          to="/admin/participants"
          className="border border-[#E8E3D8] bg-white p-4 rounded-[6px] shadow-2xs transition hover:border-stone-400 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <Users size={14} className="text-emerald-700" />
              <span>Registered Entrants</span>
            </span>
            <span className="inline-flex items-center gap-1 border border-emerald-300 bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-800 rounded-[4px]">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> Active
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            <AnimatedNumber value={registeredCount} />
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-500 font-normal">
            <span>In Live Pool: <strong className="text-emerald-800 font-semibold">{activePoolCount}</strong></span>
            <span className="text-stone-400 group-hover:text-stone-700 transition">View Directory →</span>
          </div>
        </Link>

        {/* 2. UNREGISTERED COUPONS */}
        <Link
          to="/admin/coupons-directory?status=Unused"
          className="border border-[#E8E3D8] bg-white p-4 rounded-[6px] shadow-2xs transition hover:border-stone-400 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <Ticket size={14} className="text-[#9A7B4F]" />
              <span>Unregistered Coupons</span>
            </span>
            <span className="inline-flex items-center gap-1 border border-amber-300 bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 rounded-[4px]">
              Available
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            <AnimatedNumber value={unusedCount} />
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-500 font-normal">
            <span>Ready for customers</span>
            <span className="text-stone-400 group-hover:text-stone-700 transition">View Coupons →</span>
          </div>
        </Link>

        {/* 3. WON PARTICIPANTS */}
        <Link
          to="/admin/winners"
          className="border border-[#E8E3D8] bg-white p-4 rounded-[6px] shadow-2xs transition hover:border-stone-400 block group"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-600 flex items-center gap-1.5">
              <Trophy size={14} className="text-[#9A7B4F]" />
              <span>Won Participants</span>
            </span>
            <span className="inline-flex items-center gap-1 border border-[#D8C7A3] bg-[#FBF8F1] px-2 py-0.5 text-[10px] font-semibold text-[#8C6D38] rounded-[4px]">
              Awarded
            </span>
          </div>
          <p className="mt-2 text-3xl font-semibold tracking-tight text-stone-900">
            <AnimatedNumber value={wonCount} />
          </p>
          <div className="mt-2 flex items-center justify-between text-xs text-stone-500 font-normal">
            <span>Gifts Awarded: <strong className="text-[#8C6D38] font-semibold">{wonCount}</strong></span>
            <span className="text-stone-400 group-hover:text-stone-700 transition">View Winners →</span>
          </div>
        </Link>
      </div>

      {/* Secondary Quick Metrics */}
      <div className="grid gap-3 sm:grid-cols-3">
        <div className="border border-[#E8E3D8] bg-[#FAF8F5] p-3.5 rounded-[6px] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Total Coupons Generated</p>
            <p className="text-xl font-semibold text-stone-900 mt-0.5">{totalCouponsCount.toLocaleString()}</p>
          </div>
          <Ticket size={20} className="text-stone-400" />
        </div>

        <div className="border border-[#E8E3D8] bg-[#FAF8F5] p-3.5 rounded-[6px] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Coupon Batches</p>
            <p className="text-xl font-semibold text-stone-900 mt-0.5">{allBatches.length}</p>
          </div>
          <Layers size={20} className="text-stone-400" />
        </div>

        <div className="border border-[#E8E3D8] bg-[#FAF8F5] p-3.5 rounded-[6px] flex items-center justify-between">
          <div>
            <p className="text-[11px] font-medium text-stone-500 uppercase tracking-wider">Festival Gifts in Vault</p>
            <p className="text-xl font-semibold text-stone-900 mt-0.5">{(data.prizes || []).length}</p>
          </div>
          <Gift size={20} className="text-[#9A7B4F]" />
        </div>
      </div>

      {/* Prepared Batches Section */}
      <div className="border border-[#E8E3D8] bg-white rounded-[6px] shadow-2xs overflow-hidden">
        <div className="border-b border-[#E8E3D8] bg-[#FAF8F5] px-5 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-semibold text-stone-800 tracking-wide">
            <Layers size={14} className="text-[#9A7B4F]" />
            <span>Coupon Batches</span>
            <span className="text-[11px] text-stone-500 font-normal">({allBatches.length})</span>
          </div>
          <Link
            to="/admin/coupons"
            className="text-xs font-medium text-[#9A7B4F] hover:text-stone-900 transition"
          >
            + Create Batch
          </Link>
        </div>

        {allBatches.length > 0 ? (
          <div className="divide-y divide-[#F2EFE9]">
            {allBatches.map((b, idx) => {
              const count = b.count || (b.endId ? 10000 : 50)
              const usedInBatch = b.usedCount || 0
              const unusedInBatch = Math.max(0, count - usedInBatch)
              const percentageUsed = count > 0 ? Math.min(100, Math.round((usedInBatch / count) * 100)) : 0

              return (
                <div
                  key={b.id || idx}
                  className="px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAF8F5] transition"
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-sm font-medium text-stone-900">{b.name || `Batch #${idx + 1}`}</span>
                      <span className="font-mono text-[10px] text-stone-700 bg-[#F5F2EB] px-2 py-0.5 rounded-[4px] border border-[#E8E3D8]">
                        {b.id}
                      </span>
                      <span className="text-[11px] font-medium text-stone-700 bg-white border border-[#E8E3D8] px-2 py-0.5 rounded-[4px]">
                        {count.toLocaleString()} pcs
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs text-stone-600 font-normal">
                      <span>Created {formatShortDate(b.createdAt)}</span>
                      <span>·</span>
                      <span className="text-emerald-800 font-medium">{usedInBatch.toLocaleString()} Registered</span>
                      <span>·</span>
                      <span>{unusedInBatch.toLocaleString()} Unregistered</span>
                    </div>

                    <div className="w-full max-w-xs h-1.5 bg-[#E8E3D8] rounded-full overflow-hidden mt-1">
                      <div
                        className="h-full bg-[#9A7B4F] transition-all duration-300"
                        style={{ width: `${percentageUsed}%` }}
                      />
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <Link
                      to="/admin/coupons-directory"
                      className="inline-flex items-center justify-center border border-[#E8E3D8] bg-white hover:bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 transition rounded-[6px]"
                    >
                      View
                    </Link>
                    <button
                      onClick={() => handleDownloadBatch(b.id, b.name || `Batch_${idx + 1}`, count)}
                      disabled={downloadingBatchId === b.id}
                      className="inline-flex items-center justify-center gap-1.5 border border-[#E8E3D8] bg-white hover:bg-stone-50 px-3 py-1.5 text-xs font-medium text-stone-700 transition cursor-pointer rounded-[6px] disabled:opacity-50"
                    >
                      {downloadingBatchId === b.id ? (
                        <Loader2 size={12} className="animate-spin text-stone-600" />
                      ) : (
                        <Download size={12} />
                      )}
                      <span>Excel</span>
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        ) : (
          <div className="p-8 text-center text-xs text-stone-400 font-normal">
            No batches created yet.
          </div>
        )}
      </div>

      {/* Recent Winners Table */}
      <div className="border border-[#E8E3D8] bg-white rounded-[6px] shadow-2xs overflow-hidden">
        <div className="border-b border-[#E8E3D8] bg-[#FAF8F5] px-5 py-3 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-stone-800 tracking-wide">Recent Winners</h3>
          <Link
            to="/admin/winners"
            className="text-xs font-medium text-[#9A7B4F] hover:text-stone-900 transition"
          >
            View all →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[500px] text-left text-xs">
            <thead className="border-b border-[#E8E3D8] bg-[#FAF8F5] text-[10px] font-medium tracking-wider text-stone-500 uppercase">
              <tr>
                <th className="px-5 py-2.5">Winner</th>
                <th className="px-5 py-2.5">Phone</th>
                <th className="px-5 py-2.5">Prize Won</th>
                <th className="px-5 py-2.5">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EFE9]">
              {recent.map((w) => {
                const p = getParticipant(w.participantId)
                const pr = getPrize(w.prizeId)
                const nameDisplay = p?.name || 'Verified Winner'
                const phoneDisplay = p?.phone || '—'
                const prizeDisplay = pr?.name || 'Festival Prize'
                return (
                  <tr key={w.id} className="hover:bg-[#FAF8F5] transition text-stone-800">
                    <td className="px-5 py-3 font-medium text-stone-900">{nameDisplay}</td>
                    <td className="px-5 py-3 font-mono text-stone-700">{phoneDisplay}</td>
                    <td className="px-5 py-3 text-[#9A7B4F] font-medium">{prizeDisplay}</td>
                    <td className="px-5 py-3 text-stone-500 font-normal">{formatDate(w.date)}</td>
                  </tr>
                )
              })}
              {recent.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-5 py-6 text-center text-xs text-stone-400 font-normal">
                    No confirmed winners yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
