'use client'

import { useState, useEffect, useCallback } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

export interface BannerSlide {
  id: string
  title: string
  src: string
  alt: string
  link: string
}

const BANNERS: BannerSlide[] = [
  {
    id: 'banner-solar',
    title: 'Bayment Solar Shopping Festival',
    src: '/bayment-solar-festival-banner.jpg',
    alt: 'Bayment Solar Shopping Festival',
    link: '#register',
  },
  {
    id: 'banner-1',
    title: 'Valanchery Shopping Festival - Banner 1',
    src: '/banner1.webp',
    alt: 'Valanchery Shopping Festival Banner 1',
    link: '#register',
  },
  {
    id: 'banner-2',
    title: 'Valanchery Shopping Festival - Banner 2',
    src: '/banner2.webp',
    alt: 'Valanchery Shopping Festival Banner 2',
    link: '#register',
  },
  {
    id: 'banner-3',
    title: 'Valanchery Shopping Festival - Banner 3',
    src: '/banner3.webp',
    alt: 'Valanchery Shopping Festival Banner 3',
    link: '#register',
  },
  {
    id: 'banner-4',
    title: 'Valanchery Shopping Festival - Banner 4',
    src: '/banner4.webp',
    alt: 'Valanchery Shopping Festival Banner 4',
    link: '#register',
  },
]

export function FestivalAdBannerSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % BANNERS.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + BANNERS.length) % BANNERS.length)
  }, [])

  // Auto-slide every 3.5 seconds (3500ms) uninterrupted
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % BANNERS.length)
    }, 3500)

    return () => clearInterval(timer)
  }, [])

  // Touch gestures for mobile swipe
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX)
  }

  const handleTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null) return
    const touchEndX = e.changedTouches[0].clientX
    const diff = touchStartX - touchEndX
    if (Math.abs(diff) > 35) {
      if (diff > 0) nextSlide()
      else prevSlide()
    }
    setTouchStartX(null)
  }

  return (
    <div
      className="w-full relative select-none group px-0 mx-0 overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* Full-width Ad Banner Frame with increased height and smooth rounded corners */}
      <div className="relative w-full overflow-hidden rounded-xl sm:rounded-2xl border border-slate-200/90 shadow-sm sm:shadow-md bg-white aspect-[16/7.5] sm:aspect-[1024/380] transition-all duration-300">
        {/* Slides Track */}
        <div
          className="flex w-full h-full transition-transform duration-700 ease-in-out will-change-transform"
          style={{ transform: `translateX(-${currentIndex * 100}%)` }}
        >
          {BANNERS.map((banner, index) => (
            <div
              key={banner.id}
              className="w-full min-w-full flex-none shrink-0 h-full relative overflow-hidden rounded-none p-0 m-0"
            >
              <a
                href={banner.link}
                className="w-full h-full block relative p-0 m-0 overflow-hidden cursor-pointer"
                title={banner.title}
              >
                <img
                  src={banner.src}
                  alt={banner.alt}
                  className="w-full h-full object-cover block select-none rounded-none p-0 m-0"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  draggable={false}
                />
              </a>
            </div>
          ))}
        </div>

        {/* Prev / Next Arrows on Desktop */}
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Previous slide"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer backdrop-blur-2xs"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next slide"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer backdrop-blur-2xs"
        >
          <ChevronRight size={16} />
        </button>

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-1.5 sm:bottom-2 inset-x-0 z-10 flex items-center justify-center gap-1 sm:gap-1.5 pointer-events-none">
          {BANNERS.map((_, i) => (
            <span
              key={i}
              className={`transition-all duration-300 rounded-full ${
                i === currentIndex
                  ? 'w-4 sm:w-5 h-1 sm:h-1.5 bg-white shadow-xs'
                  : 'w-1 sm:w-1.5 h-1 sm:h-1.5 bg-white/50'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
