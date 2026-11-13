'use client'

import { useState, useEffect } from 'react'

export interface BannerSlide {
  id: string
  src: string
  alt: string
  link: string
}

// Column 1: Original prizes poster + New Green Solar poster
const COLUMN_1_SLIDES: BannerSlide[] = [
  {
    id: 'col1-prizes',
    src: '/bayment-prizes-poster.jpg',
    alt: 'Bayment Special Offers & Prizes',
    link: '#register',
  },
  {
    id: 'col1-solar-green',
    src: '/bayment-solar-green-poster.jpg',
    alt: 'Bayment Go Solar for a Greener Smarter Home',
    link: '#register',
  },
]

// Column 2: Original store poster + New Festival Solar poster
const COLUMN_2_SLIDES: BannerSlide[] = [
  {
    id: 'col2-store',
    src: '/bayment-store-poster.jpg',
    alt: 'Bayment Store Special Offer',
    link: '#register',
  },
  {
    id: 'col2-solar-festival',
    src: '/bayment-solar-festival-poster.jpg',
    alt: 'Bayment Solar Shopping Festival',
    link: '#register',
  },
]

function SingleColumnSlider({
  slides,
  interval = 5000,
  initialDelay = 0,
}: {
  slides: BannerSlide[]
  interval?: number
  initialDelay?: number
}) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [previousIndex, setPreviousIndex] = useState<number | null>(null)

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
    let timer: NodeJS.Timeout
    const startTimeout = setTimeout(() => {
      timer = setInterval(() => {
        setCurrentIndex((curr) => {
          const next = (curr + 1) % slides.length
          setPreviousIndex(curr)
          return next
        })
      }, interval)
    }, initialDelay)

    return () => {
      clearTimeout(startTimeout)
      if (timer) clearInterval(timer)
    }
  }, [interval, initialDelay, slides.length])

  return (
    <div className="relative aspect-square sm:aspect-[4/5] max-h-[460px] w-full overflow-hidden rounded-none border border-slate-200/90 shadow-2xs bg-white">
      {slides.map((banner, index) => {
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
            style={{ transform, opacity, zIndex, transition }}
          >
            <a
              href={banner.link}
              className="w-full h-full block relative p-0 m-0 overflow-hidden cursor-pointer"
              title={banner.alt}
            >
              <img
                src={banner.src}
                alt={banner.alt}
                className="w-full h-full object-cover object-center block select-none rounded-none"
                loading="lazy"
                draggable={false}
              />
            </a>
          </div>
        )
      })}
    </div>
  )
}

export function FestivalThreeAdsSection() {
  return (
    <section className="relative w-full py-2 sm:py-3 bg-slate-50/60 border-b border-slate-200/70 select-none">
      <div className="max-w-4xl mx-auto px-1.5 sm:px-3">
        {/* 2 columns, each running a slow vertical slide-down animation (total 4 square/portrait banners) */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
          <SingleColumnSlider slides={COLUMN_1_SLIDES} interval={5000} initialDelay={0} />
          <SingleColumnSlider slides={COLUMN_2_SLIDES} interval={5000} initialDelay={1000} />
        </div>
      </div>
    </section>
  )
}
