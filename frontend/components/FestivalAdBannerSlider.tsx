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
    id: 'banner-solar-house',
    title: 'Bayment Solar - Making It Easy',
    src: '/bayment-solar-house-banner.jpg',
    alt: 'Bayment Solar Shopping Festival',
    link: '#register',
  },
  {
    id: 'banner-solar-field',
    title: 'Bayment Solar - Quality Energy',
    src: '/bayment-solar-field-banner.jpg',
    alt: 'Bayment Solar Panels & Inverters',
    link: '#register',
  },
]

export function FestivalAdBannerSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [previousIndex, setPreviousIndex] = useState<number | null>(null)

  const goToSlide = useCallback((nextIdx: number) => {
    setCurrentIndex((curr) => {
      if (curr === nextIdx) return curr
      setPreviousIndex(curr)
      return nextIdx
    })
  }, [])

  const nextSlide = useCallback(() => {
    goToSlide((currentIndex + 1) % BANNERS.length)
  }, [currentIndex, goToSlide])

  const prevSlide = useCallback(() => {
    goToSlide((currentIndex - 1 + BANNERS.length) % BANNERS.length)
  }, [currentIndex, goToSlide])

  // Clear previous slide after transition finishes so it resets above the viewport
  useEffect(() => {
    if (previousIndex === null) return
    const t = setTimeout(() => {
      setPreviousIndex(null)
    }, 1250)
    return () => clearTimeout(t)
  }, [previousIndex])

  // Auto-slide every 5 seconds with slow smooth slide-down animation (1200ms)
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentIndex((curr) => {
        const next = (curr + 1) % BANNERS.length
        setPreviousIndex(curr)
        return next
      })
    }, 5000)

    return () => clearInterval(timer)
  }, [])

  return (
    <div className="w-full relative select-none group px-0 mx-0 overflow-hidden">
      {/* 
        Ad Banner Frame: Zero border radius (rounded-none), pure 1024x341 aspect ratio (3:1)
      */}
      <div className="relative w-full overflow-hidden rounded-none border-y border-slate-200/80 shadow-xs bg-white aspect-[1024/341]">
        {/* Slide-Down Container */}
        <div className="relative w-full h-full overflow-hidden">
          {BANNERS.map((banner, index) => {
            const isCurrent = index === currentIndex
            const isPrev = index === previousIndex

            let transform = 'translateY(-100%)'
            let opacity = 0
            let zIndex = 0
            let transition = 'none'

            if (isCurrent) {
              transform = 'translateY(0%)'
              opacity = 1
              zIndex = 20
              transition = 'transform 1200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 800ms ease'
            } else if (isPrev) {
              transform = 'translateY(100%)'
              opacity = 0
              zIndex = 10
              transition = 'transform 1200ms cubic-bezier(0.16, 1, 0.3, 1), opacity 800ms ease'
            }

            return (
              <div
                key={banner.id}
                className="absolute inset-0 w-full h-full will-change-transform"
                style={{
                  transform,
                  opacity,
                  zIndex,
                  transition,
                }}
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
            )
          })}
        </div>

        {/* Prev / Next Controls */}
        <button
          type="button"
          onClick={prevSlide}
          aria-label="Previous banner"
          className="absolute left-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/35 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer backdrop-blur-2xs"
        >
          <ChevronLeft size={16} />
        </button>
        <button
          type="button"
          onClick={nextSlide}
          aria-label="Next banner"
          className="absolute right-2 top-1/2 -translate-y-1/2 z-20 w-7 h-7 sm:w-8 sm:h-8 rounded-full bg-black/35 hover:bg-black/60 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-pointer backdrop-blur-2xs"
        >
          <ChevronRight size={16} />
        </button>

        {/* Slide Indicator Dots */}
        <div className="absolute bottom-2 inset-x-0 z-20 flex items-center justify-center gap-1.5 pointer-events-none">
          {BANNERS.map((_, i) => (
            <span
              key={i}
              className={`transition-all duration-500 rounded-full ${
                i === currentIndex
                  ? 'w-5 sm:w-6 h-1 sm:h-1.5 bg-white shadow-md'
                  : 'w-1.5 h-1.5 bg-white/60'
              }`}
            />
          ))}
        </div>
      </div>
    </div>
  )
}
