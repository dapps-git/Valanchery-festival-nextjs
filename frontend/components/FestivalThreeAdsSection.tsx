'use client'

const BANNERS_GRID = [
  { id: 'banner-1', src: '/ad-banner-gift.png', alt: 'Festival Shopping & Gifts', link: '#register' },
  { id: 'banner-2', src: '/ad-banner-cart.png', alt: 'Festival Electronics & Lifestyle', link: '#register' },
]

export function FestivalThreeAdsSection() {
  return (
    <section className="relative w-full py-5 sm:py-8 bg-slate-50/70 border-y border-slate-200/70 select-none">
      <div className="max-w-4xl mx-auto px-3.5 sm:px-6">
        {/* 2 banners: 2 in one row, increased height, 10% curved corners, zero text/writings */}
        <div className="grid grid-cols-2 gap-3.5 sm:gap-6">
          {BANNERS_GRID.map((banner) => (
            <a
              key={banner.id}
              href={banner.link}
              className="group relative block aspect-[3/4] sm:aspect-[4/5] max-h-[460px] w-full overflow-hidden rounded-[10%] border border-slate-200/90 shadow-xs hover:shadow-md transition-all duration-300 bg-white"
            >
              <img
                src={banner.src}
                alt={banner.alt}
                className="w-full h-full object-cover object-center transform group-hover:scale-[1.03] transition-transform duration-500"
                loading="lazy"
              />
            </a>
          ))}
        </div>
      </div>
    </section>
  )
}
