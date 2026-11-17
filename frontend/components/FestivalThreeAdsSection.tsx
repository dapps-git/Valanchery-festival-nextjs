'use client'

import { useState, useEffect } from 'react'

export interface BannerSlide {
  id: string
  src: string
  alt: string
  link: string
}

// Column 1: 3 banner slides
const COLUMN_1_SLIDES: BannerSlide[] = [
  {
    id: 'col1-appliances',
    src: '/bayment-appliances-offer-poster.jpg',
    alt: 'Bayment 999 Special Offer Home Appliances',
    link: '#register',
  },
  {
    id: 'col1-solar-house',
    src: '/bayment-solar-house-poster.jpg',
    alt: 'Bayment Go Solar for Your Home',
    link: '#register',
  },
  {
    id: 'col1-washing-machine',
    src: '/bayment-washing-machine-poster.jpg',
    alt: 'Bayment Branded Washing Machines Offer',
    link: '#register',
  },
]

// Column 2: 3 banner slides
const COLUMN_2_SLIDES: BannerSlide[] = [
  {
    id: 'col2-solar-subsidy',
    src: '/bayment-solar-subsidy-poster.jpg',
    alt: 'Bayment Solar Lifetime Free Current with Subsidy',
    link: '#register',
  },
  {
    id: 'col2-water-purity',
    src: '/bayment-purity-water-poster.jpg',
    alt: 'Bayment Purity Water Assessment',
    link: '#register',
  },
  {
    id: 'col2-solar-gas',
    src: '/bayment-solar-gas-poster.jpg',
    alt: 'Bayment Solar Save on Current Bill and Gas',
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
    <div className="relative aspect-[3/4] w-full overflow-hidden rounded-none border border-slate-200/90 shadow-2xs bg-white">
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
              className="w-full h-full block relative p-0 m-0 overflow-hidden cursor-pointer bg-white"
              title={banner.alt}
            >
              <img
                src={banner.src}
                alt={banner.alt}
                className="w-full h-full object-contain object-center block select-none rounded-none"
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
    <section className="relative w-full pt-1.5 pb-2 sm:py-2.5 bg-slate-50/60 border-b border-slate-200/70 select-none">
      <div className="max-w-2xl sm:max-w-3xl mx-auto px-1.5 sm:px-3">
        {/* 2 columns, each running a slow vertical slide-down animation (total 4 square/portrait banners) */}
        <div className="grid grid-cols-2 gap-1.5 sm:gap-3">
          <SingleColumnSlider slides={COLUMN_1_SLIDES} interval={5000} initialDelay={0} />
          <SingleColumnSlider slides={COLUMN_2_SLIDES} interval={5000} initialDelay={1000} />
        </div>
      </div>
    </section>
  )
}
