import { useMemo, useState } from 'react'
import { useApp } from '@/context/AppContext'
import { formatDate, monthLabel } from '@/lib/format'
import { Plus, X } from 'lucide-react'

export function DrawSchedulePage() {
  const { data, getPrize, addDraw } = useApp()
  const [open, setOpen] = useState(false)
  const [form, setForm] = useState({
    number: data.draws.length + 1,
    date: '2026-12-30',
    prizeId: data.prizes[0]?.id ?? '',
  })

  const groups = useMemo(() => {
    const map = new Map<string, typeof data.draws>()
    ;[...data.draws]
      .sort((a, b) => a.date.localeCompare(b.date))
      .forEach((d) => {
        const key = monthLabel(d.date)
        map.set(key, [...(map.get(key) ?? []), d])
      })
    return [...map.entries()]
  }, [data.draws])

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#140d10]">
            Draw Schedule Timeline
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-slate-600 font-normal">
            Calendar view of all 2026 festival lucky draws
          </p>
        </div>
        <button
          onClick={() => setOpen(true)}
          className="inline-flex items-center gap-1.5 border border-[#6b1020] bg-[#6b1020] px-4 py-2 text-xs font-medium tracking-wider text-white transition hover:bg-[#851629]"
        >
          <Plus size={15} /> ADD DRAW
        </button>
      </div>

      <div className="mt-8 space-y-10">
        {groups.map(([month, draws]) => (
          <section key={month}>
            <div className="border-b border-black/10 pb-2">
              <h2 className="font-display text-lg font-light tracking-wider text-[#6b1020] uppercase sm:text-xl">
                {month}
              </h2>
            </div>
            <div className="relative mt-4 border-l-2 border-[#d4a017] pl-6">
              {draws.map((d) => {
                const prize = getPrize(d.prizeId)
                return (
                  <div key={d.id} className="relative mb-6">
                    <span className="absolute -left-[31px] top-2 h-3 w-3 border border-[#6b1020] bg-[#d4a017]" />
                    <div className="border border-black/10 bg-white p-4 shadow-sm">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-[10px] font-medium tracking-wider text-[#9b1c32] uppercase">
                          Draw #{String(d.number).padStart(2, '0')}
                        </p>
                        <span
                          className={`border px-2 py-0.5 text-[9px] font-medium uppercase ${
                            d.status === 'Completed'
                              ? 'border-emerald-600 bg-emerald-50 text-emerald-800'
                              : 'border-[#d4a017] bg-[#f7f0e6] text-black'
                          }`}
                        >
                          {d.status}
                        </span>
                      </div>
                      <p className="font-display mt-1 text-lg font-light text-[#140d10]">
                        {formatDate(d.date).replace(/ \d{4}/, '')}
                      </p>
                      <p className="mt-1 text-xs font-light text-black/70">
                        Prize: <span className="font-medium text-[#140d10]">{prize?.name}</span> ({prize?.value})
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          </section>
        ))}
      </div>

      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-md border-2 border-black/20 bg-white p-6 shadow-2xl">
            <div className="flex items-center justify-between border-b border-black/10 pb-3">
              <h3 className="font-display text-lg font-light">Add Draw to Schedule</h3>
              <button onClick={() => setOpen(false)} className="text-black/50 hover:text-black">
                <X size={18} />
              </button>
            </div>
            <div className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block text-black/60 uppercase">Date</label>
                <input
                  type="date"
                  className="mt-1 w-full border border-black/20 bg-white px-3 py-2 outline-none"
                  value={form.date}
                  onChange={(e) => setForm({ ...form, date: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-black/60 uppercase">Prize</label>
                <select
                  className="mt-1 w-full border border-black/20 bg-white px-3 py-2 outline-none"
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
            <div className="mt-6 flex gap-2">
              <button
                onClick={() => setOpen(false)}
                className="flex-1 border border-black/20 py-2 text-xs font-light text-black hover:bg-black/5"
              >
                Cancel
              </button>
              <button
                className="flex-1 border border-[#6b1020] bg-[#6b1020] py-2 text-xs font-medium text-white hover:bg-[#851629]"
                onClick={() => {
                  addDraw({ ...form, winnerCount: 1, status: 'Upcoming' })
                  setOpen(false)
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
