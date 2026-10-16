'use client'

import { useState, useEffect, useCallback, useRef } from 'react'

export interface BannerSlide {
  id: string
  title: string
  src: string
  alt: string
  link: string
}

const BANNERS: BannerSlide[] = [
  {
    id: 'banner-shopping-festival',
    title: 'Valanchery Shopping Festival - Purchase Things & Earn Coupon',
    src: '/banner-shopping-festival.png',
    alt: 'Valanchery Shopping Festival - Purchase Things & Earn Coupon - Get Exclusive Coupon',
    link: '/register',
  },
  {
    id: 'festival-coupon-banner',
    title: 'Official Festival Lucky Draw Coupon - Win Swift Car & Scooters',
    src: '/festival-coupon-banner.png',
    alt: 'Valanchery Shopping Festival Official Coupon - Win Swift Car & Scooters',
    link: '/register',
  },
  {
    id: 'banner-bumper-draw',
    title: 'Mega Bumper Lucky Draw - Win Car, Bikes & Gold',
    src: '/banner-bumper-draw.png',
    alt: 'Valanchery Festival Mega Bumper Draw - Win Car, Bikes & Gold',
    link: '/register',
  },
]

export function FestivalAdBannerSlider() {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const [touchStartX, setTouchStartX] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const nextSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % BANNERS.length)
  }, [])

  const prevSlide = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + BANNERS.length) % BANNERS.length)
  }, [])

  // Auto-slide every 3 seconds (3000ms), paused on user hover
  useEffect(() => {
    if (isPaused) {
      if (timerRef.current) clearInterval(timerRef.current)
      return
    }

    timerRef.current = setInterval(() => {
      nextSlide()
    }, 3000)

    return () => {
      if (timerRef.current) clearInterval(timerRef.current)
    }
  }, [nextSlide, isPaused, currentIndex])

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
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {/* 
        Clean Rounded Border & Shadow for Banner.
        Pure 3:1 natural banner aspect ratio (aspect-[1024/342]).
      */}
      <div className="relative w-full overflow-hidden rounded-lg sm:rounded-xl border border-slate-300 shadow-md sm:shadow-lg bg-white aspect-[1024/342] transition-all duration-300 ring-1 ring-black/5">
        {/* Slides Track */}
        <div
          className="flex w-full h-full transition-transform duration-700 ease-out"
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
      </div>
    </div>
  )
}
