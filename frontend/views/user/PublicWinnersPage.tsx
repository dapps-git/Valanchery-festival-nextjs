import { useState } from 'react'
import { Link } from '../../components/Link'
import { Search } from 'lucide-react'
import { useApp } from '../../context/AppContext'
import { formatDate, maskPhone } from '../../lib/format'

export function PublicWinnersPage() {
  const { data, getParticipant, getPrize, getDraw } = useApp()
  const [filter, setFilter] = useState('')
  const winners = [...data.winners].sort(
    (a, b) => new Date(b.date || 0).getTime() - new Date(a.date || 0).getTime() || b.id.localeCompare(a.id)
  )

  const filteredWinners = winners.filter((w) => {
    const p = getParticipant(w.participantId)
    const prize = getPrize(w.prizeId)
    const match = `${p?.name || ''} ${p?.phone || ''} ${p?.location || ''} ${prize?.name || ''}`.toLowerCase()
    return !filter || match.includes(filter.toLowerCase())
  })

  return (
    <div className="festival-hero min-h-screen text-white">
      {/* Header */}
      <header className="mx-auto flex max-w-6xl items-center justify-between border-b border-white/10 px-3 py-3.5 sm:px-6 md:px-8">
        <Link to="/" className="font-display text-sm tracking-wider sm:text-base md:text-lg whitespace-nowrap">
          Valanchery Festival
        </Link>
        <nav className="flex items-center gap-2 text-[10px] font-light tracking-wider sm:gap-4 sm:text-xs md:gap-6 md:text-sm">
          <Link to="/" className="text-white/70 transition hover:text-[#f3d48a] whitespace-nowrap">
            HOME
          </Link>
          <Link to="/register" className="text-white/70 transition hover:text-[#f3d48a] whitespace-nowrap">
            REGISTER
          </Link>
          <Link to="/winners" className="border-b border-[#f3d48a] pb-0.5 text-[#f3d48a] whitespace-nowrap">
            WINNERS
          </Link>
        </nav>
      </header>

      {/* Main Content */}
      <main className="mx-auto max-w-6xl px-4 py-8 md:py-14">
        <div className="text-center">
          <p className="animate-fade-up text-[11px] tracking-[0.35em] text-[#f3d48a]">OFFICIAL RESULTS</p>
          <h1 className="font-display animate-fade-up mt-2 text-2xl font-light tracking-wide sm:text-3xl md:text-5xl">
            Our Lucky Draw Winners
          </h1>
          <p className="animate-fade-up mt-3 text-xs font-light text-white/70 sm:text-sm">
            Celebrating the champions of Valanchery Festival 2026 Lucky Draws.
          </p>
        </div>

        {/* Filter bar */}
        {winners.length > 0 && (
          <div className="mx-auto mt-8 max-w-md">
            <div className="relative">
              <input
                type="text"
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                placeholder="Search winner name or prize…"
                className="w-full border border-white/20 bg-black/40 px-4 py-2.5 text-xs font-light text-white placeholder-white/30 outline-none transition focus:border-[#d4a017] sm:text-sm"
              />
              <Search className="pointer-events-none absolute right-3 top-3 text-white/40" size={16} />
            </div>
          </div>
        )}

        {/* Winners Grid */}
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {filteredWinners.map((w) => {
            const p = getParticipant(w.participantId) || { name: 'Winner Participant', phone: '', location: 'Valanchery' }
            const prize = getPrize(w.prizeId) || { name: 'Festival Prize', value: 'Special Award', image: 'https://images.unsplash.com/photo-1513885535751-8b9238bd345a?auto=format&fit=crop&w=900&q=80' }
            const draw = getDraw(w.drawId)

            return (
              <article
                key={w.id}
                className="animate-fade-up group relative border border-[#d4a017]/35 bg-black/40 transition hover:border-[#d4a017]"
              >
                <div className="relative h-44 w-full overflow-hidden bg-black/60 sm:h-48">
                  {prize.image && (
                    <img
                      src={prize.image}
                      alt={prize.name}
                      className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                    />
                  )}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent" />
                  <div className="absolute left-3 top-3 border border-[#d4a017]/60 bg-black/70 px-2.5 py-1 text-[10px] font-light tracking-widest text-[#f3d48a]">
                    DRAW #{draw?.number ? String(draw.number).padStart(2, '0') : w.drawId.replace(/[^0-9]/g, '') || '01'}
                  </div>
                  <div className="absolute bottom-2 right-3 text-[11px] font-light text-white/70">
                    {formatDate(w.date)}
                  </div>
                </div>

                <div className="p-5">
                  <p className="text-[10px] tracking-widest text-[#f3d48a] uppercase">LUCKY WINNER</p>
                  <h2 className="font-display mt-1 text-xl font-light tracking-wide text-white sm:text-2xl">
                    {p.name}
                  </h2>
                  <div className="mt-3 space-y-1 text-xs font-light text-white/70">
                    <p>Phone: {p.phone ? maskPhone(p.phone) : 'Verified'}</p>
                    {p.location && <p>Location: {p.location}</p>}
                  </div>

                  <div className="mt-4 border-t border-white/10 pt-3">
                    <p className="text-[10px] tracking-widest text-white/40 uppercase">WON PRIZE</p>
                    <p className="mt-0.5 text-sm font-light text-[#f3d48a]">🎁 {prize.name}</p>
                    {prize.value && <p className="text-[11px] font-light text-white/50">{prize.value}</p>}
                  </div>
                </div>
              </article>
            )
          })}
        </div>

        {filteredWinners.length === 0 && (
          <div className="mt-12 border border-white/10 bg-black/30 p-8 text-center text-xs font-light text-white/60">
            {winners.length === 0
              ? 'No lucky draw winners have been announced yet. Stay tuned for upcoming draws!'
              : 'No winners found matching your search.'}
          </div>
        )}

        {/* Callout */}
        <div className="mt-16 border border-[#d4a017]/30 bg-gradient-to-r from-[#240b12] to-[#140d10] p-6 text-center sm:p-8">
          <p className="text-xs font-light tracking-widest text-[#f3d48a] uppercase">MORE DRAWS COMING UP</p>
          <h3 className="font-display mt-2 text-xl font-light text-white sm:text-2xl">
            Want to be the next winner?
          </h3>
          <p className="mt-2 text-xs font-light text-white/70 sm:text-sm">
            Registration is 100% free and open to all residents.
          </p>
          <div className="mt-6">
            <Link
              to="/register"
              className="inline-flex items-center gap-2 border border-[#d4a017] bg-[#d4a017] px-6 py-3 text-xs font-medium tracking-widest text-[#140d10] transition hover:bg-[#e5b32e]"
            >
              REGISTER NOW FREE
            </Link>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/10 py-6 text-center text-xs font-light text-white/40">
        Valanchery Festival 2026 · Lucky Draw Results
      </footer>
    </div>
  )
}
