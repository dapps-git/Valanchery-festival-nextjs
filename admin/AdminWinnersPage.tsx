import { useMemo, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { formatDate } from '@/lib/format'
import { Search, Trophy, Calendar, Award, RotateCcw, CheckCircle2 } from 'lucide-react'

export function AdminWinnersPage() {
  const { data, getParticipant, getPrize, getDraw } = useApp()
  const [q, setQ] = useState('')
  const [prize, setPrize] = useState('')
  const [date, setDate] = useState('')

  const rows = useMemo(() => {
    return [...data.winners]
      .sort((a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime() || b.id.localeCompare(a.id))
      .filter((w) => {
        const p = getParticipant(w.participantId) || { phone: '', name: 'Participant', location: 'Valanchery' }
        const pr = getPrize(w.prizeId) || { id: w.prizeId, name: 'Festival Prize' }
        const d = getDraw(w.drawId)
        const hit = `${d ? '#' + d.number : w.drawId} ${p.name || ''} ${p.phone || ''} ${pr.name} ${w.status}`.toLowerCase().includes(q.toLowerCase())
        return hit && (!prize || pr.id === prize) && (!date || w.date === date)
      })
  }, [data.winners, q, prize, date, getParticipant, getPrize, getDraw])

  const hasActiveFilters = Boolean(q || prize || date)

  const handleResetFilters = () => {
    setQ('')
    setPrize('')
    setDate('')
  }

  // Statistics
  const completedDrawsCount = useMemo(() => {
    return new Set(data.winners.map((w) => w.drawId)).size
  }, [data.winners])

  return (
    <div className="space-y-6 font-sans font-light text-[#292524]">
      {/* Header (no Back button) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E8E3D8] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-stone-900">
            Official Winner Records
          </h1>
        </div>
      </div>

      {/* KPI Metric Strip */}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="flex items-center gap-3 border border-[#E8E3D8] bg-white p-3.5 rounded-[6px] shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[#E8E3D8] bg-[#FAF8F5] text-[#9A7B4F]">
            <Trophy size={16} />
          </div>
          <div>
            <p className="text-[11px] font-normal text-stone-500">Total Winners</p>
            <p className="text-lg font-medium text-stone-900">
              {data.winners.length} <span className="text-xs font-light text-stone-400">recipients</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 border border-[#E8E3D8] bg-white p-3.5 rounded-[6px] shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[#E8E3D8] bg-[#FAF8F5] text-stone-700">
            <Calendar size={16} />
          </div>
          <div>
            <p className="text-[11px] font-normal text-stone-500">Completed Draws</p>
            <p className="text-lg font-medium text-stone-900">
              {completedDrawsCount} <span className="text-xs font-light text-stone-400">draws</span>
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 border border-[#E8E3D8] bg-white p-3.5 rounded-[6px] shadow-2xs">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[4px] border border-[#E8E3D8] bg-[#FAF8F5] text-[#C2A676]">
            <CheckCircle2 size={16} />
          </div>
          <div>
            <p className="text-[11px] font-normal text-stone-500">Awards Status</p>
            <p className="text-lg font-medium text-stone-900">
              100% <span className="text-xs font-light text-stone-400">verified</span>
            </p>
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center gap-2 border border-[#E8E3D8] bg-white p-2.5 rounded-[6px] shadow-2xs">
        <div className="relative min-w-[220px] flex-1">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search draw #, name, phone, or prize..."
            className="w-full border border-[#E8E3D8] bg-white pl-8 pr-3 py-1.5 text-xs text-stone-900 placeholder:text-stone-400 outline-none focus:border-[#9A7B4F] rounded-[4px]"
          />
          <Search className="pointer-events-none absolute left-2.5 top-2 text-stone-400" size={14} />
        </div>

        <select
          value={prize}
          onChange={(e) => setPrize(e.target.value)}
          className="border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs font-light text-stone-700 outline-none focus:border-[#9A7B4F] rounded-[4px] cursor-pointer"
        >
          <option value="">All Prizes</option>
          {data.prizes.map((p) => (
            <option key={p.id} value={p.id}>
              {p.name}
            </option>
          ))}
        </select>

        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs font-light text-stone-700 outline-none focus:border-[#9A7B4F] rounded-[4px] cursor-pointer"
        />

        {hasActiveFilters && (
          <button
            onClick={handleResetFilters}
            className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-[#FAF8F5] hover:bg-stone-100 px-2.5 py-1.5 text-xs font-light text-stone-600 transition rounded-[4px] cursor-pointer"
          >
            <RotateCcw size={12} /> Reset
          </button>
        )}
      </div>

      {/* Winners Table */}
      <div className="border border-[#E8E3D8] bg-white rounded-[6px] shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[650px] text-left text-xs">
            <thead className="border-b border-[#E8E3D8] bg-[#FAF8F5] text-[11px] font-normal text-stone-500">
              <tr>
                <th className="w-12 px-4 py-3 text-center">#</th>
                <th className="px-4 py-3">Draw</th>
                <th className="px-4 py-3">Winner Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Prize Awarded</th>
                <th className="px-4 py-3">Draw Date</th>
                <th className="px-4 py-3 text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#F2EFE9]">
              {rows.map((w, idx) => {
                const p = getParticipant(w.participantId)
                const pr = getPrize(w.prizeId)
                const d = getDraw(w.drawId)
                const drawTag = d
                  ? `#${String(d.number).padStart(2, '0')}`
                  : w.drawId.startsWith('draw-')
                  ? `#${w.drawId.replace('draw-', '').padStart(2, '0')}`
                  : `#${idx + 1}`
                const prizeName = pr?.name || 'Festival Prize'
                const nameDisplay = p?.name || 'Verified Winner'
                const phoneDisplay = p?.phone || '—'
                return (
                  <tr key={w.id} className="hover:bg-[#FAF8F5] transition-colors">
                    <td className="w-12 px-4 py-3 text-center font-mono text-[11px] text-stone-400">
                      {idx + 1}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-stone-800">
                      {drawTag}
                    </td>

                    <td className="px-4 py-3 font-normal text-stone-900">
                      {nameDisplay}
                    </td>

                    <td className="px-4 py-3 font-mono text-xs text-stone-600">
                      {phoneDisplay}
                    </td>

                    <td className="px-4 py-3">
                      <span className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-[#FAF8F5] px-2 py-0.5 rounded-[4px] text-stone-800 text-xs">
                        <Award size={11} className="text-[#9A7B4F]" /> {prizeName}
                      </span>
                    </td>

                    <td className="px-4 py-3 text-stone-500 font-light whitespace-nowrap">
                      {formatDate(w.date)}
                    </td>

                    <td className="px-4 py-3 text-right">
                      <span className="inline-flex items-center gap-1 border border-[#E8E3D8] bg-white px-2 py-0.5 rounded-[4px] text-[11px] text-stone-700">
                        {w.status}
                      </span>
                    </td>
                  </tr>
                )
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-xs text-stone-400 font-light">
                    No winners recorded yet.
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
