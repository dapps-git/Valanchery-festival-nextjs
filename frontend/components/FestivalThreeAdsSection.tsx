'use client'

const BANNERS_GRID = [
  { id: 'banner-1', src: '/bayment-prizes-poster.jpg', alt: 'Bayment Special Offers & Prizes', link: '#register' },
  { id: 'banner-2', src: '/bayment-store-poster.jpg', alt: 'Bayment Store Special Offer', link: '#register' },
]

export function FestivalThreeAdsSection() {
  return (
    <section className="relative w-full py-2 sm:py-3 bg-slate-50/60 border-b border-slate-200/70 select-none">
      <div className="max-w-4xl mx-auto px-1.5 sm:px-3">
        {/* 2 banners: 2 in one row, zero border-radius, reduced padding */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
          {BANNERS_GRID.map((banner) => (
            <a
              key={banner.id}
              href={banner.link}
              className="group relative block aspect-[3/4] max-h-[500px] w-full overflow-hidden rounded-none border border-slate-200/90 shadow-2xs hover:shadow-xs transition-all duration-300 bg-white"
            >
              <img
                src={banner.src}
                alt={banner.alt}
                className="w-full h-full object-cover object-top sm:object-center transform group-hover:scale-[1.01] transition-transform duration-500 rounded-none"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
