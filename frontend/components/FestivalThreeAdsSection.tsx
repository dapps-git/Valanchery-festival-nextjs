'use client'

import { ExternalLink, Sparkles, Megaphone, Info } from 'lucide-react'

export interface AdUnit {
  id: string
  title: string
  subtitle: string
  image: string
  link: string
  tag: string
  sponsor: string
}

const ADS_DATA: AdUnit[] = [
  {
    id: 'ad-1',
    title: 'Festival Shopping & Coupons',
    subtitle: 'Shop at partner stores and collect serial tickets',
    image: '/banner-shopping-festival.png',
    link: '#register',
    tag: 'Official Partner',
    sponsor: 'KVVES Valanchery',
  },
  {
    id: 'ad-2',
    title: 'Mega Bumper Lucky Draw',
    subtitle: 'Win Maruti Swift Car, Electric Scooters & Gold',
    image: '/banner-bumper-draw.png',
    link: '#register',
    tag: 'Bumper Draw',
    sponsor: 'Valanchery Festival 2026',
  },
  {
    id: 'ad-3',
    title: 'Exclusive Member Offers',
    subtitle: 'Special festival discounts & bonus rewards',
    image: '/banner-special-offer.png',
    link: '#register',
    tag: 'Special Offer',
    sponsor: 'Member Merchants',
  },
]

export function FestivalThreeAdsSection() {
  return (
    <section className="relative w-full py-8 sm:py-10 bg-slate-50/80 border-y border-slate-200/70 select-none">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Google Ad Header Label / Sponsored Identifier */}
        <div className="flex items-center justify-between pb-3.5 mb-1 border-b border-slate-200/60">
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-200/90 text-slate-700 border border-slate-300">
              Ad
            </span>
            <span className="text-xs font-semibold text-slate-600 tracking-wide">
              Featured Festival Sponsors & Promotions
            </span>
          </div>

          <div className="flex items-center gap-1 text-[11px] text-slate-400">
            <Info size={12} className="text-slate-400" />
            <span className="hidden sm:inline">Official Advertisements</span>
          </div>
        </div>

        {/* 3 Ads Displayed At The Same Time (3-Column Grid) */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-5 lg:gap-6 pt-3">
          {ADS_DATA.map((ad, idx) => (
            <div
              key={ad.id}
              className="group relative bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-300 overflow-hidden flex flex-col justify-between"
            >
              {/* Top Google-style Ad meta bar */}
              <div className="px-3 pt-2.5 pb-2 flex items-center justify-between border-b border-slate-100 bg-slate-50/50 text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="px-1 py-0.2 rounded font-bold text-[9px] bg-amber-100 text-amber-800 border border-amber-200 uppercase">
                    Ad #{idx + 1}
                  </span>
                  <span className="text-slate-500 font-medium truncate max-w-[150px]">
                    {ad.sponsor}
                  </span>
                </div>
                <span className="text-cyan-700 font-semibold text-[10px] tracking-wide">
                  {ad.tag}
                </span>
              </div>

              {/* Ad Creative Image (Natural 3:1 banner ratio) */}
              <a
                href={ad.link}
                className="relative block w-full aspect-[1024/342] overflow-hidden bg-slate-900 group-hover:opacity-95 transition"
              >
                <img
                  src={ad.image}
                  alt={ad.title}
                  className="w-full h-full object-cover object-center transform group-hover:scale-[1.02] transition-transform duration-500"
                  loading="lazy"
                />
              </a>

              {/* Ad Footer Banner / Call to Action */}
              <div className="p-3 bg-white flex items-center justify-between gap-2">
                <div className="min-w-0 flex-1">
                  <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-[#0284c7] transition">
                    {ad.title}
                  </h4>
                  <p className="text-[11px] text-slate-500 truncate mt-0.5">
                    {ad.subtitle}
                  </p>
                </div>

                <a
                  href={ad.link}
                  className="inline-flex items-center gap-1 shrink-0 bg-cyan-50 hover:bg-cyan-100 text-[#0284c7] font-semibold text-[11px] px-2.5 py-1.5 rounded-lg border border-cyan-200/80 transition"
                >
                  <span>Explore</span>
                  <ExternalLink size={11} />
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
