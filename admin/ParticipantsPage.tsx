import { useMemo, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { formatShortDate } from '@/lib/format'
import { formatParticipantsForExcelCsv, downloadCsvFile } from '@/lib/exportCsv'
import { DeleteConfirmModal } from '@/components/DeleteConfirmModal'
import type { Participant, CompetitionType } from '@/types'
import {
  Search,
  Eye,
  Trash2,
  X,
  Trophy,
  Plus,
  Download,
  Users,
  CheckCircle2,
  Ticket,
  RotateCcw,
  Crown,
  Sparkles,
  Award,
} from 'lucide-react'

const PAGE = 10

export function ParticipantsPage() {
  const { data, deleteParticipant, registerParticipant, getPrize, getDraw } = useApp()
  const [q, setQ] = useState('')
  const [status, setStatus] = useState('')
  const [winnerFilter, setWinnerFilter] = useState('')
  const [page, setPage] = useState(1)
  const [view, setView] = useState<Participant | null>(null)
  const [showAddModal, setShowAddModal] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Participant | null>(null)
  const [newParticipant, setNewParticipant] = useState({
    name: '',
    phone: '',
    address: '',
    couponId: '',
  })
  const [addError, setAddError] = useState('')

  // Map of participantId -> winner details with competition type
  const winnerMap = useMemo(() => {
    const map = new Map<
      string,
      {
        drawNumber: number
        prizeName: string
        date: string
        competitionType: CompetitionType
      }
    >()
    ;(data.winners || []).forEach((w) => {
      if (!w) return
      const draw = getDraw(w.drawId)
      const prize = getPrize(w.prizeId)
      const compType: CompetitionType =
        w.competitionType ||
        (draw as any)?.competitionType ||
        prize?.competitionType ||
        'Normal'
      map.set(w.participantId, {
        drawNumber: draw?.number ?? 0,
        prizeName: prize?.name ?? 'Prize',
        date: w.date,
        competitionType: compType,
      })
    })
    return map
  }, [data.winners, getDraw, getPrize])

  const filtered = useMemo(() => {
    return [...(data.participants || [])]
      .filter(Boolean)
      .sort((a, b) => {
        const timeA = new Date(a.createdAt || a.registeredAt || 0).getTime()
        const timeB = new Date(b.createdAt || b.registeredAt || 0).getTime()
        if (timeB !== timeA) return timeB - timeA

        const dateA = a.registeredAt || ''
        const dateB = b.registeredAt || ''
        if (dateB !== dateA) return dateB.localeCompare(dateA)

        return b.id.localeCompare(a.id, undefined, { numeric: true })
      })
      .filter((p) => {
        const winInfo = winnerMap.get(p.id)
        const isWinner = Boolean(winInfo)
        const hit = `${p.name} ${p.phone} ${p.couponId || ''}`.toLowerCase().includes(q.toLowerCase())
        const statusMatch = !status || p.status === status
        const winnerMatch =
          !winnerFilter ||
          (winnerFilter === 'winner' && isWinner) ||
          (winnerFilter === 'mega' && winInfo?.competitionType === 'Mega') ||
          (winnerFilter === 'normal' && winInfo?.competitionType === 'Normal') ||
          (winnerFilter === 'eligible' && !isWinner && p.status === 'Active')

        return hit && statusMatch && winnerMatch
      })
  }, [data.participants, q, status, winnerFilter, winnerMap])

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE))
  const rows = filtered.slice((page - 1) * PAGE, page * PAGE)

  const activeInPoolCount = data.participants.filter(
    (p) => p.status === 'Active' && !winnerMap.has(p.id)
  ).length

  const handleExportCsv = () => {
    const content = formatParticipantsForExcelCsv(filtered)
    downloadCsvFile(content, `Valanchery-Participants-Export-${filtered.length}.csv`)
  }

  const handleResetFilters = () => {
    setQ('')
    setStatus('')
    setWinnerFilter('')
    setPage(1)
  }

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setAddError('')
    const trimmedName = newParticipant.name.trim()
    if (!trimmedName) {
      setAddError('Please enter full name')
      return
    }
    if (!/^[A-Za-z\s]+$/.test(trimmedName)) {
      setAddError('Name must contain letters only')
      return
    }
    if (trimmedName.replace(/[^A-Za-z]/g, '').length < 2) {
      setAddError('Name must contain at least 2 letters')
      return
    }
    const cleanPhone = newParticipant.phone.replace(/\D/g, '').slice(-10)
    if (cleanPhone.length !== 10) {
      setAddError('Please enter a valid 10-digit mobile number')
      return
    }

    const cleanCoupon = newParticipant.couponId.replace(/[^A-Za-z0-9]/g, '').trim().toUpperCase()
    if (!cleanCoupon || cleanCoupon.length !== 13) {
      setAddError('Please enter a valid 13-character coupon code')
      return
    }

    const res = await registerParticipant({
      name: newParticipant.name.trim(),
      phone: cleanPhone,
      address: newParticipant.address.trim() || 'Valanchery',
      couponId: cleanCoupon,
    })
    if (!res.ok) {
      setAddError(res.error)
      return
    }
    setShowAddModal(false)
    setNewParticipant({ name: '', phone: '', address: '', couponId: '' })
  }

  const hasActiveFilters = Boolean(q || status || winnerFilter)

  return (
    <div className="space-y-6 font-sans font-normal text-[#292524]">
      {/* Header with Title and Primary Actions (no Back button) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E8E3D8] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-medium tracking-tight text-stone-900">
            Participants Directory
          </h1>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportCsv}
            className="inline-flex items-center gap-1.5 border border-[#E8E3D8] bg-white hover:bg-[#FAF8F5] px-3.5 py-2 text-xs font-normal text-stone-700 transition rounded-[6px] shadow-2xs cursor-pointer"
          >
            <Download size={13} className="text-[#9A7B4F]" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => setShowAddModal(true)}
            className="inline-flex items-center gap-1.5 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 px-4 py-2 text-xs font-normal text-white rounded-[6px] shadow-2xs transition cursor-pointer"
          >
            <Plus size={13} />
            <span>Add Entrant</span>
          </button>
        </div>
      </div>

      {/* Metric Cards - Beige & White Minimalist */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 border border-[#E8E3D8] bg-white p-3.5 rounded-[6px] shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[#E8E3D8] bg-[#FAF8F5] text-stone-700">
            <Users size={16} />
          </div>
          <div>
            <p className="text-[11px] font-normal text-stone-500">Total Registered</p>
            <p className="text-lg font-medium text-stone-900">
              {data.participants.length} <span className="text-xs font-light text-stone-400">entries</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 border border-[#E8E3D8] bg-white p-3.5 rounded-[6px] shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[#E8E3D8] bg-[#FAF8F5] text-[#9A7B4F]">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <p className="text-[11px] font-normal text-stone-500">In Live Pool</p>
            <p className="text-lg font-medium text-stone-900">
              {activeInPoolCount} <span className="text-xs font-light text-stone-400">eligible</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 border border-[#E8E3D8] bg-white p-3.5 rounded-[6px] shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[#E8E3D8] bg-[#FAF8F5] text-[#C2A676]">
            <Trophy size={16} />
          </div>
          <div>
            <p className="text-[11px] font-normal text-stone-500">Past Winners</p>
            <p className="text-lg font-medium text-stone-900">
              {data.winners.length} <span className="text-xs font-light text-stone-400">awarded</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border border-[#E8E3D8] bg-white p-2.5 rounded-[6px] shadow-2xs">
        <div className="relative min-w-[220px] flex-1">
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value)
              setPage(1)
            }}
            placeholder="Search coupon, phone, name..."
            className="w-full border border-[#E8E3D8] bg-white pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none focus:border-[#9A7B4F] rounded-[4px]"
          />
          <Search className="pointer-events-none absolute left-2.5 top-2 text-stone-400" size={14} />
        </div>

        <select
          value={winnerFilter}
          onChange={(e) => {
            setWinnerFilter(e.target.value)
            setPage(1)
          }}
          className="border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs font-light text-stone-700 outline-none focus:border-[#9A7B4F] rounded-[4px] cursor-pointer"
        >
          <option value="">All Eligibility</option>
          <option value="eligible">In Live Pool (Eligible)</option>
          <option value="mega">⭐ Mega Winners</option>
          <option value="winner">Past Winners</option>
        </select>

        <select
          value={status}
          onChange={(e) => {
            setStatus(e.target.value)
            setPage(1)
          }}
          className="border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs font-light text-stone-700 outline-none focus:border-[#9A7B4F] rounded-[4px] cursor-pointer"
        >
          <option value="">All Statuses</option>
          <option value="Active">Active</option>
          <option value="Inactive">Inactive</option>
        </select>

        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-[#FAF8F5] hover:bg-stone-100 px-2.5 py-1.5 text-xs font-light text-stone-600 transition rounded-[4px] cursor-pointer"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      {/* Table */}
      <div className="border border-[#E8E3D8] bg-white rounded-[6px] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[680px] text-left text-xs" style={{ fontWeight: 500 }}>
            <thead className="border-b-2 border-[#E8E3D8] bg-[#F5F2EB] text-[11px] text-stone-700 uppercase tracking-wider" style={{ fontWeight: 700 }}>
              <tr>
                <th className="w-12 px-4 py-3 text-center">#</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Coupon ID</th>
                <th className="px-4 py-3">Registered</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EFE9]">
              {rows.map((p, idx) => {
                const slNo = (page - 1) * PAGE + idx + 1
                const winInfo = winnerMap.get(p.id)
                const isMegaWinner = winInfo?.competitionType === 'Mega'
                const isNormalWinner = winInfo && !isMegaWinner
                return (
                  <tr
                    key={p.id}
                    className={`transition-colors ${
                      isMegaWinner
                        ? 'bg-gradient-to-r from-amber-500/15 via-amber-100/50 to-yellow-50/20 hover:from-amber-500/20 hover:via-amber-100/70 hover:to-yellow-50/30 border-l-4 border-l-amber-500'
                        : 'hover:bg-[#FAF8F5]'
                    }`}
                    style={{ color: '#1c1917' }}
                  >
                    <td className="w-12 px-4 py-3 text-center font-mono text-[11px]" style={{ color: isMegaWinner ? '#b45309' : '#78716c', fontWeight: 700 }}>
                      {isMegaWinner ? (
                        <span className="inline-flex items-center justify-center gap-0.5">
                          <span>{slNo}</span>
                          <Crown size={12} className="text-amber-500 fill-amber-400 inline" />
                        </span>
                      ) : (
                        slNo
                      )}
                    </td>

                    <td className="px-4 py-3" style={{ fontWeight: 600, color: '#1c1917' }}>
                      <div className="flex items-center gap-2">
                        <span className={isMegaWinner ? 'font-bold text-stone-950 text-sm' : ''}>
                          {p.name || 'Participant'}
                        </span>
                        {isMegaWinner && (
                          <span className="inline-flex items-center gap-1 bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 text-[10px] font-black uppercase px-2 py-0.5 rounded-[4px] shadow-xs tracking-wider">
                            <Crown size={10} className="fill-stone-950" /> MEGA
                          </span>
                        )}
                      </div>
                    </td>

                    <td className="px-4 py-3 font-mono text-xs" style={{ fontWeight: 600, color: '#292524' }}>
                      {p.phone}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs">
                      {p.couponId ? (
                        <span className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-[#FAF8F5] px-2 py-0.5 rounded-[4px] text-stone-800">
                          <Ticket size={11} className="text-[#9A7B4F]" /> {p.couponId}
                        </span>
                      ) : (
                        <span className="text-stone-300 font-mono">—</span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-[11px] whitespace-nowrap" style={{ color: '#57534e', fontWeight: 600 }}>
                      {formatShortDate(p.registeredAt || p.createdAt || '')}
                    </td>

                    <td className="px-4 py-3">
                      {isMegaWinner ? (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1.5 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-500 text-stone-950 font-black px-3 py-1 rounded-[6px] text-[11px] shadow-sm shadow-amber-500/25 border border-amber-300 ring-2 ring-amber-400/40 tracking-wider uppercase">
                            <Sparkles size={12} className="text-stone-950 shrink-0" />
                            <span>⭐ MEGA BUMPER WINNER</span>
                          </span>
                          {winInfo.prizeName && (
                            <div className="flex items-center gap-1 text-[11px] font-bold text-amber-900 pl-0.5">
                              <Award size={12} className="text-amber-600 shrink-0" />
                              <span className="truncate max-w-[170px]">{winInfo.prizeName}</span>
                            </div>
                          )}
                        </div>
                      ) : winInfo ? (
                        <span className="inline-flex items-center gap-1 border border-[#D8C7A3] bg-[#FBF8F1] px-2.5 py-1 rounded-[4px] text-[11px] font-medium text-[#8C6D38] shadow-2xs">
                          <Trophy size={11} className="text-[#8C6D38]" /> Won Prize
                        </span>
                      ) : p.status === 'Active' ? (
                        <span className="inline-flex items-center gap-1.5 border border-emerald-300 bg-emerald-50 px-2.5 py-1 rounded-[4px] text-[11px] font-medium text-emerald-800 shadow-2xs">
                          <span className="h-1.5 w-1.5 rounded-full bg-emerald-600" /> In Live Pool
                        </span>
                      ) : (
                        <span className="inline-flex items-center border border-stone-200 bg-stone-100 px-2 py-0.5 rounded-[4px] text-[11px] text-stone-600 font-normal">
                          {p.status}
                        </span>
                      )}
                    </td>

                    <td className="px-4 py-3 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => setView(p)}
                          className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-white hover:bg-[#FAF8F5] px-2 py-1 text-[11px] font-normal text-stone-700 rounded-[4px] transition cursor-pointer"
                        >
                          <Eye size={11} /> View
                        </button>
                        <button
                          onClick={() => setDeleteTarget(p)}
                          className="inline-flex items-center gap-1 border border-stone-200 bg-white hover:bg-red-50 hover:text-red-700 text-stone-400 px-2 py-1 text-[11px] rounded-[4px] transition cursor-pointer"
                          title="Delete participant"
                        >
                          <Trash2 size={11} />
                        </button>
                      </div>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-stone-400 font-light">
                    No participants found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[#E8E3D8] bg-[#FAF8F5] px-4 py-2.5 text-xs text-stone-600 font-normal">
          <p>
            Showing {filtered.length === 0 ? 0 : (page - 1) * PAGE + 1} to{' '}
            {Math.min(page * PAGE, filtered.length)} of {filtered.length} entries
          </p>
          <div className="flex items-center gap-1.5">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="border border-[#E8E3D8] bg-white hover:bg-stone-50 px-3 py-1 text-xs text-stone-700 transition disabled:opacity-40 rounded-[4px] cursor-pointer disabled:cursor-not-allowed"
            >
              Prev
            </button>
            <span className="px-2 text-xs text-stone-700 font-normal">
              {page} / {pages}
            </span>
            <button
              disabled={page === pages}
              onClick={() => setPage((p) => p + 1)}
              className="border border-[#E8E3D8] bg-white hover:bg-stone-50 px-3 py-1 text-xs text-stone-700 transition disabled:opacity-40 rounded-[4px] cursor-pointer disabled:cursor-not-allowed"
            >
              Next
            </button>
          </div>
        </div>
      </div>

      {/* Quick Add Modal */}
      {showAddModal && (
        <Modal onClose={() => setShowAddModal(false)} title="Add Participant">
          <form onSubmit={handleAddSubmit} className="space-y-3.5">
            {addError && (
              <div className="border border-red-200 bg-red-50 p-2.5 text-xs text-red-700 rounded-[4px]">
                {addError}
              </div>
            )}
            <div>
              <label className="block text-xs font-normal text-stone-600">Full Name *</label>
              <input
                required
                className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                placeholder="e.g. Muhammed Shafi"
                value={newParticipant.name}
                onChange={(e) => setNewParticipant({ ...newParticipant, name: e.target.value.replace(/[^A-Za-z\s]/g, '') })}
              />
            </div>
            <div>
              <label className="block text-xs font-normal text-stone-600">Phone Number *</label>
              <input
                required
                className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 font-mono text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                placeholder="10-digit mobile number"
                value={newParticipant.phone}
                onChange={(e) => setNewParticipant({ ...newParticipant, phone: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-normal text-stone-600">Festival Coupon Code (13-Char) *</label>
              <input
                required
                maxLength={16}
                className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 font-mono text-xs uppercase text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                placeholder="e.g. A9B2C3D4E5F6G"
                value={newParticipant.couponId}
                onChange={(e) => setNewParticipant({ ...newParticipant, couponId: e.target.value.toUpperCase() })}
              />
            </div>
            <div className="pt-2">
              <button
                type="submit"
                className="w-full border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 py-2.5 text-xs font-normal text-white rounded-[6px] shadow-2xs transition cursor-pointer"
              >
                Confirm & Register
              </button>
            </div>
          </form>
        </Modal>
      )}

      {/* View Modal */}
      {view && (
        <Modal onClose={() => setView(null)} title="Participant Details">
          <div className="space-y-4 text-xs font-light text-stone-700">
            {view.couponId && (
              <div className="border border-[#E8E3D8] bg-[#FAF8F5] p-3.5 rounded-[6px]">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-[10px] text-stone-400">Coupon Token ID</p>
                    <span className="inline-flex items-center gap-1 font-mono text-sm font-normal text-stone-900">
                      <Ticket size={13} className="text-[#9A7B4F]" /> {view.couponId}
                    </span>
                  </div>
                  <span className="border border-[#E8E3D8] bg-white px-2 py-0.5 rounded-[4px] text-[11px] text-stone-700">
                    {view.status}
                  </span>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-3 border border-[#E8E3D8] bg-white p-3.5 rounded-[6px]">
              <div>
                <p className="text-[10px] text-stone-400">Full Name</p>
                <p className="text-xs font-normal text-stone-900 mt-0.5">{view.name}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400">Phone</p>
                <p className="font-mono text-xs font-normal text-stone-900 mt-0.5">{view.phone}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400">Registered On</p>
                <p className="text-xs text-stone-600 mt-0.5">{formatShortDate(view.registeredAt)}</p>
              </div>
              <div>
                <p className="text-[10px] text-stone-400">Pool Status</p>
                <p className="text-xs font-normal text-stone-800 mt-0.5">{view.status} · {view.eligibility}</p>
              </div>
            </div>

            {winnerMap.has(view.id) && (() => {
              const win = winnerMap.get(view.id)!
              const isMega = win.competitionType === 'Mega'
              if (isMega) {
                return (
                  <div className="p-4 rounded-[8px] border border-amber-300 bg-gradient-to-r from-amber-500/20 via-yellow-100/70 to-amber-500/10 shadow-sm shadow-amber-500/20 ring-1 ring-amber-400/50">
                    <div className="flex items-center justify-between gap-2">
                      <p className="flex items-center gap-1.5 font-bold text-amber-950 text-sm">
                        <Crown size={16} className="text-amber-600 fill-amber-400" />
                        ⭐ OFFICIAL MEGA BUMPER WINNER
                      </p>
                      <span className="px-2.5 py-0.5 rounded-[4px] text-[10px] font-black uppercase tracking-wider bg-gradient-to-r from-amber-500 to-yellow-500 text-stone-950 shadow-xs">
                        MEGA
                      </span>
                    </div>
                    <div className="mt-2.5 pt-2 border-t border-amber-200/60 flex items-center justify-between">
                      <div>
                        <p className="text-[10px] uppercase font-bold text-amber-800/80">Prize Awarded</p>
                        <p className="text-sm font-extrabold text-stone-900 flex items-center gap-1 mt-0.5">
                          <Award size={14} className="text-amber-600" />
                          {win.prizeName}
                        </p>
                      </div>
                      <div className="text-right text-[11px] text-stone-600">
                        <p>Lucky Draw #{win.drawNumber}</p>
                        <p className="text-stone-400 font-mono text-[10px]">{win.date}</p>
                      </div>
                    </div>
                  </div>
                )
              }
              return (
                <div className="border border-[#E8E3D8] bg-[#FAF8F5] p-3.5 rounded-[6px]">
                  <p className="flex items-center gap-1.5 font-normal text-stone-900">
                    <Trophy size={13} className="text-[#C2A676]" /> Won Lucky Draw #{win.drawNumber}
                  </p>
                  <p className="mt-1 text-xs text-stone-600">
                    Prize: <strong className="font-normal text-stone-900">{win.prizeName}</strong>
                  </p>
                </div>
              )
            })()}

            <div className="pt-1 flex justify-end">
              <button
                onClick={() => setView(null)}
                className="border border-[#E8E3D8] bg-white hover:bg-[#FAF8F5] px-4 py-1.5 text-xs font-normal text-stone-700 rounded-[6px] transition cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Delete Confirmation Modal (Type DELETE + Secondary Confirm) */}
      <DeleteConfirmModal
        isOpen={Boolean(deleteTarget)}
        title="Delete Participant"
        itemName={`${deleteTarget?.name || 'Participant'} (${deleteTarget?.phone})`}
        itemType="Participant"
        warningDetails={
          deleteTarget ? (
            <>
              You are about to delete registration for <strong className="font-semibold text-red-950">"{deleteTarget.name}"</strong> (Coupon: <span className="font-mono">{deleteTarget.couponId || 'None'}</span>).
              Their coupon will be released back to <strong>Unused</strong> status.
            </>
          ) : undefined
        }
        onClose={() => setDeleteTarget(null)}
        onConfirm={async () => {
          if (!deleteTarget) return
          const id = deleteTarget.id
          setDeleteTarget(null)
          await deleteParticipant(id)
        }}
      />
    </div>
  )
}

function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
      <div className="w-full max-w-md border border-[#E8E3D8] bg-white p-5 rounded-[6px] shadow-lg">
        <div className="mb-4 flex items-center justify-between border-b border-[#E8E3D8] pb-3">
          <h3 className="text-sm font-normal text-stone-900">{title}</h3>
          <button onClick={onClose} className="text-stone-400 hover:text-stone-700 cursor-pointer">
            <X size={16} />
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
