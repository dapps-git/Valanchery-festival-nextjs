import { useState, useEffect, useCallback } from 'react'

const BANNERS = [
  {
    id: 'banner-festival',
    src: '/banner-festival.png',
    alt: 'Valanchery Festival 2026 - Shop Local, Support Local, Win Together',
  },
  {
    id: 'banner-prizes',
    src: '/banner-prizes.png',
    alt: 'Win Exciting Prizes - Cars, Scooters, Home Appliances & Gold',
  },
  {
    id: 'banner-support-local',
    src: '/banner-support-local.png',
    alt: 'Support Local Business - Celebrate Valanchery Merchants & Shops',
  },
]

export function HeroBannerSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % BANNERS.length)
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      nextSlide()
    }, 3000) // Automatically slides every 3 seconds
    return () => clearInterval(timer)
  }, [nextSlide])

  return (
    <div className="w-full max-w-[960px] mx-auto mt-1 mb-2.5 sm:my-3 relative">
      {/* Container with gold accent border and ambient shadow */}
      <div className="relative overflow-hidden rounded-xl sm:rounded-2xl border-2 border-[#e5a93b]/60 bg-slate-900 shadow-xl shadow-amber-950/20">
        {/* Slides Track */}
        <div
          className="flex transition-transform duration-700 ease-out"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {BANNERS.map((banner, index) => (
            <div key={banner.id} className="w-full shrink-0 relative aspect-[1024/379] bg-slate-950">
              <img
                src={banner.src}
                alt={banner.alt}
                className="w-full h-full object-cover select-none"
                loading={index === 0 ? 'eager' : 'lazy'}
                draggable={false}
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
