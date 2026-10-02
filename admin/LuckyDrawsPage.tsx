import { useState } from 'react'
import { Link } from 'react-router-dom'
import { useApp } from '@/context/AppContext'
import { formatDate } from '@/lib/format'

import { Plus, X, ArrowRight, Calendar, Users, Sparkles } from 'lucide-react'

export function LuckyDrawsPage() {
  const { data, getPrize, addDraw } = useApp()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    number: data.draws.length + 1,
    date: new Date().toISOString().slice(0, 10),
    prizeId: data.prizes[0]?.id ?? '',
  })

  return (
    <div className="space-y-6 font-sans font-light text-[#292524]">
      {/* Page Header (no Back button) */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-[#E8E3D8] pb-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-normal tracking-tight text-stone-900">
            Festival Lucky Draws
          </h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to="/admin/lucky-draw"
            className="inline-flex items-center gap-1.5 border border-[#E8E3D8] bg-white px-3.5 py-2 text-xs font-normal text-stone-700 hover:text-stone-900 hover:border-stone-400 transition rounded-[6px] shadow-2xs"
          >
            <Sparkles size={13} className="text-[#9A7B4F]" />
            <span>Enter Live Stage</span>
          </Link>
          <button
            onClick={() => setOpen(true)}
            className="inline-flex items-center gap-1.5 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 px-4 py-2 text-xs font-normal text-white rounded-[6px] shadow-2xs transition cursor-pointer"
          >
            <Plus size={13} />
            <span>Create New Draw</span>
          </button>
        </div>
      </div>

      {/* Grid of Lucky Draws */}
      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {data.draws.map((d) => {
          const prize = getPrize(d.prizeId)
          const isCompleted = d.status === 'Completed'
          return (
            <article
              key={d.id}
              className="border border-[#E8E3D8] bg-white rounded-[6px] shadow-2xs hover:shadow-xs transition duration-200 flex flex-col overflow-hidden"
            >
              {/* Image Banner */}
              <div className="relative h-44 w-full overflow-hidden bg-[#FAF8F5]">
                <img
                  src={prize?.image || ''}
                  alt={prize?.name ?? 'Prize'}
                  className="h-full w-full object-cover transition-transform duration-300 hover:scale-105"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent pointer-events-none" />

                {/* Draw Tag */}
                <div className="absolute left-3 top-3 bg-[#1E1B18]/80 backdrop-blur-xs border border-[#C2A676]/40 px-2.5 py-1 text-[10px] font-normal text-white rounded-[4px] shadow-2xs">
                  DRAW #{String(d.number).padStart(2, '0')}
                </div>

                {/* Status Badge */}
                <div className="absolute bottom-3 right-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-[4px] text-[10px] font-normal backdrop-blur-xs ${
                      isCompleted
                        ? 'bg-stone-900/80 text-white'
                        : 'bg-[#9A7B4F]/90 text-white'
                    }`}
                  >
                    {d.status}
                  </span>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <h2 className="text-sm font-normal text-stone-900 truncate">
                    {prize?.name ?? 'Prize'}
                  </h2>

                  <div className="mt-2 space-y-1 text-xs text-stone-500 font-light">
                    <p className="flex items-center gap-1.5">
                      <Calendar size={12} className="text-[#9A7B4F]" />
                      <span>Date: <strong className="font-normal text-stone-800">{formatDate(d.date)}</strong></span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Users size={12} className="text-[#9A7B4F]" />
                      <span>Winners: <strong className="font-normal text-stone-800">{d.winnerCount} participant</strong></span>
                    </p>
                  </div>
                </div>

                {/* Card Footer */}
                <div className="flex items-center justify-between border-t border-[#F2EFE9] pt-3">
                  <Link
                    to="/admin/lucky-draw"
                    className="inline-flex items-center gap-1 text-xs font-normal text-stone-700 hover:text-stone-900 transition"
                  >
                    <span>Live Stage</span>
                    <ArrowRight size={12} />
                  </Link>
                  <span className="font-mono text-xs font-normal text-stone-800 bg-[#FAF8F5] px-2 py-0.5 rounded-[4px] border border-[#E8E3D8]">
                    {prize?.value ?? '₹0'}
                  </span>
                </div>
              </div>
            </article>
          )
        })}
      </div>

      {/* Create New Draw Modal */}
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-xs p-4">
          <div className="w-full max-w-md border border-[#E8E3D8] bg-white p-5 rounded-[6px] shadow-lg">
            <div className="flex items-center justify-between border-b border-[#E8E3D8] pb-3">
              <h3 className="text-sm font-normal text-stone-900">Create New Draw</h3>
              <button
                onClick={() => setOpen(false)}
                className="text-stone-400 hover:text-stone-700 p-1 cursor-pointer transition"
              >
                <X size={16} />
              </button>
            </div>

            <div className="mt-4 space-y-3.5 text-xs font-light">
              <div>
                <label className="block text-xs font-normal text-stone-600">
                  Draw Sequence Number
                </label>
                <input
                  type="number"
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                  value={form.number}
                  onChange={(e) => setForm({ ...form, number: Number(e.target.value) })}
                />
              </div>

              <div>
                <label className="block text-xs font-normal text-stone-600">
                  Assigned Prize
                </label>
                <select
                  className="mt-1 w-full border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs text-stone-900 outline-none focus:border-[#9A7B4F] rounded-[4px]"
                  value={form.prizeId}
                  onChange={(e) => setForm({ ...form, prizeId: e.target.value })}
                >
                  {data.prizes.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} ({p.value})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="mt-5 flex gap-2 pt-3 border-t border-[#E8E3D8]">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-[#E8E3D8] bg-white py-2 text-xs font-normal text-stone-700 hover:bg-[#FAF8F5] rounded-[6px] transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                className="flex-1 border border-[#1E1B18] bg-[#1E1B18] hover:bg-stone-800 py-2 text-xs font-normal text-white rounded-[6px] shadow-2xs transition cursor-pointer"
                onClick={() => {
                  addDraw({ ...form, winnerCount: 1, status: 'Upcoming' })
                  setOpen(false)
                }}
              >
                Save Draw
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
