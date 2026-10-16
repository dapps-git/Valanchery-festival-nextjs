import { useState, useEffect } from 'react'
import {
  ArrowRight,
  Play,
  X,
  Sparkles,
  Award,
  Store,
  Users,
} from 'lucide-react'
import { PublicNavbar } from '../../components/PublicNavbar'
import { FestivalAdBannerSlider } from '../../components/FestivalAdBannerSlider'
import { RegisterCouponSection } from '../../components/RegisterCouponSection'
import { FestivalThreeAdsSection } from '../../components/FestivalThreeAdsSection'

export function HomePage() {
  const [videoModalOpen, setVideoModalOpen] = useState(false)

  // If a user scans a QR code that lands on the home page with a coupon code,
  // smoothly scroll them directly to the embedded registration section.
  useEffect(() => {
    if (typeof window === 'undefined') return
    const params = new URLSearchParams(window.location.search)
    const rawParam =
      params.get('coupon') ||
      params.get('token') ||
      params.get('id') ||
      params.get('c') ||
      params.get('code')
    if (rawParam) {
      setTimeout(() => {
        const el = document.getElementById('register')
        if (el) el.scrollIntoView({ behavior: 'smooth' })
      }, 150)
    }
  }, [])

  return (
    <div className="w-full bg-[#f8fafc] text-[#0f172a] font-sans select-none scroll-smooth min-h-screen overflow-x-hidden">
      {/* 1. White & Cyan Festival Navbar */}
      <PublicNavbar active="home" />

      {/* Main Page Content Container */}
      <main className="pt-14 sm:pt-16 pb-16 w-full overflow-x-hidden">
        {/* ─────────────────────────────────────────────────────────────
            FOLD 1: 100% FULL-PAGE FULL-SIZE HERO BANNER (Edge-to-Edge)
        ─────────────────────────────────────────────────────────────── */}
        {/* ─────────────────────────────────────────────────────────────
            FOLD 1: HERO BANNER (Desktop: hero.png | Mobile: image.png)
        ─────────────────────────────────────────────────────────────── */}
        <section className="relative w-full bg-white border-b border-slate-200/80 overflow-hidden">
          {/* Edge-to-Edge Banner Frame */}
          <div className="relative w-full">
            {/* Desktop / Tablet Banner (hero.png unzoomed landscape ratio) */}
            <div className="hidden sm:block relative w-full">
              <picture>
                <source srcSet="/hero.webp" type="image/webp" />
                <img
                  src="/hero.png"
                  alt="Valanchery Shopping Festival - Shop Local, Support Local, Win Together"
                  className="w-full h-auto block select-none"
                  loading="eager"
                  fetchPriority="high"
                />
              </picture>

              {/* 1. Floating Ad Banner Slideshow Directly ON the Sky of hero.png with KVVES Malayalam logo above */}
              <div className="absolute top-2 sm:top-2.5 md:top-3 inset-x-0 z-20 flex flex-col items-center gap-1.5 px-4 pointer-events-auto">
                <div className="flex justify-center">
                  <img
                    src="/kvves-malayalam-banner.png"
                    alt="Kerala Vyapari Vyavasayi Ekopana Samithi Valanchery Unit"
                    className="h-5 sm:h-6 md:h-7 w-auto object-contain drop-shadow-xs"
                  />
                </div>
                <div className="w-full max-w-sm sm:max-w-md md:max-w-lg">
                  <FestivalAdBannerSlider />
                </div>
              </div>

              {/* 2. Desktop / Tablet Content Overlay (Positioned cleanly below the top banner, logo removed) */}
              <div className="absolute inset-0 flex flex-col justify-start pt-36 sm:pt-40 md:pt-44 lg:pt-48 xl:pt-52 z-10 pointer-events-none">
                <div className="w-full max-w-7xl mx-auto px-6 md:px-10 lg:px-14">
                  <div className="max-w-[48%] lg:max-w-[44%] space-y-1.5 md:space-y-2 pointer-events-auto">

                    {/* Subtitle */}
                    <p className="font-script text-[#0284c7] text-base md:text-xl lg:text-2xl font-bold tracking-wide">
                      Shop Local • Support Local • Win Together ♡
                    </p>

                    {/* Festival Main Headline - Reduced font weight, Montserrat font */}
                    <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-semibold md:font-bold text-[#0369a1] tracking-tight leading-[1.12] font-['Montserrat',sans-serif]">
                      Valanchery Shopping<br />
                      Festival
                    </h1>

                    {/* Description - Montserrat font */}
                    <p className="text-slate-600 text-[10px] md:text-xs lg:text-sm font-normal leading-relaxed line-clamp-2 md:line-clamp-3 lg:line-clamp-none font-['Montserrat',sans-serif]">
                      Organized by Kerala Vyapari Vyavasayi Ekopana Samithi (KVVES) Valanchery Unit. Collect your official coupons from member shops and stand a chance to win mega bumper prizes!
                    </p>

                    {/* Action Buttons -> Smooth scroll to #register on page */}
                    <div className="pt-1 flex flex-wrap items-center gap-2">
                      <a
                        href="#register"
                        className="inline-flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white px-3.5 md:px-4 py-1.5 md:py-2 text-[11px] md:text-xs font-semibold tracking-wider uppercase transition shadow-xs active:scale-95 cursor-pointer rounded-md font-['Montserrat',sans-serif]"
                      >
                        <span>Register Coupon</span>
                        <ArrowRight size={13} />
                      </a>

                      <a
                        href="#why-festival"
                        className="inline-flex items-center gap-1 bg-[#e0f2fe]/95 hover:bg-[#bae6fd] text-[#0369a1] border border-[#7dd3fc] px-3 md:px-3.5 py-1.5 md:py-2 text-[11px] md:text-xs font-medium tracking-wide transition rounded-md font-['Montserrat',sans-serif]"
                      >
                        <span>Learn More</span>
                      </a>
                    </div>

                    {/* Official Coupon Ticket Preview directly below the buttons - Increased Size */}
                    <div className="pt-2.5 sm:pt-3 w-full max-w-md lg:max-w-lg">
                      <div className="rounded-lg sm:rounded-xl overflow-hidden border border-slate-300 shadow-md bg-white ring-1 ring-black/5 hover:shadow-lg transition">
                        <img
                          src="/festival-coupon-banner.png"
                          alt="Official Lucky Draw Coupon Ticket"
                          className="w-full h-auto block object-contain"
                          loading="lazy"
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile View: Clean white background with natural flowing content (bg image removed) */}
            <div className="sm:hidden relative w-full bg-white px-3.5 pt-3 pb-6">
              <div className="space-y-3 w-full">
                {/* 1. Official KVVES Malayalam Logo above the banner */}
                <div className="flex justify-center pt-0.5 pb-0.5">
                  <img
                    src="/kvves-malayalam-banner.png"
                    alt="Kerala Vyapari Vyavasayi Ekopana Samithi Valanchery Unit"
                    className="h-6 xs:h-7 w-auto object-contain"
                  />
                </div>

                {/* 2. Floating Ad Banner Slider */}
                <div className="w-full">
                  <FestivalAdBannerSlider />
                </div>

                {/* 3. Subtitle */}
                <p className="font-script text-[#0284c7] text-xs xs:text-sm font-bold tracking-wide pt-1">
                  Shop Local • Support Local • Win Together ♡
                </p>

                {/* 4. Main Headline */}
                <h1 className="text-xl xs:text-2xl font-bold text-[#0369a1] tracking-tight leading-tight font-['Montserrat',sans-serif]">
                  Valanchery Shopping<br />
                  Festival
                </h1>

                {/* 5. Description */}
                <p className="text-slate-600 text-[11px] xs:text-xs font-normal leading-relaxed font-['Montserrat',sans-serif]">
                  Organized by Kerala Vyapari Vyavasayi Ekopana Samithi (KVVES) Valanchery Unit. Collect your official coupons from member shops and stand a chance to win mega bumper prizes!
                </p>

                {/* 6. Action Buttons */}
                <div className="pt-1 flex items-center gap-2">
                  <a
                    href="#register"
                    className="inline-flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white px-3.5 py-1.5 text-[11px] font-semibold tracking-wider uppercase transition shadow-xs active:scale-95 cursor-pointer rounded-md font-['Montserrat',sans-serif]"
                  >
                    <span>Register Coupon</span>
                    <ArrowRight size={12} />
                  </a>

                  <a
                    href="#why-festival"
                    className="inline-flex items-center gap-1 bg-white hover:bg-slate-50 text-[#0369a1] border border-[#bae6fd] px-3 py-1.5 text-[11px] font-medium tracking-wide transition shadow-2xs rounded-md font-['Montserrat',sans-serif]"
                  >
                    <span>Learn More</span>
                  </a>
                </div>

                {/* 7. Official Festival Coupon Ticket - 100% Full-Bleed Edge-to-Edge with Zero Border Radius */}
                <div className="pt-2 -mx-3.5 w-[calc(100%+28px)]">
                  <div className="w-full rounded-none overflow-hidden border-y border-slate-300 shadow-md bg-white">
                    <img
                      src="/festival-coupon-banner.png"
                      alt="Official Lucky Draw Coupon Ticket"
                      className="w-full h-auto block object-cover rounded-none"
                      loading="eager"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            FOLD 2: REGISTER COUPON SECTION (Embedded on Home Page)
        ─────────────────────────────────────────────────────────────── */}
        <div className="w-full pt-8 sm:pt-12 pb-6 sm:pb-8 bg-gradient-to-b from-white via-cyan-50/30 to-slate-50 border-b border-cyan-100/60">
          <RegisterCouponSection id="register" />
        </div>

        {/* ─────────────────────────────────────────────────────────────
            FOLD 3: 3 ADS DISPLAYED AT THE SAME TIME (Google-Ad Style)
        ─────────────────────────────────────────────────────────────── */}
        <FestivalThreeAdsSection />

        {/* Full-Width Inner Content Container */}
        <div className="w-full pt-8 sm:pt-10 space-y-6 sm:space-y-8">
          {/* ─────────────────────────────────────────────────────────────
              FOLD 2: FESTIVAL SPECIAL COUPON BANNER (Prominent & High Impact)
          ─────────────────────────────────────────────────────────────── */}
          <section className="relative w-full bg-white border-y border-cyan-100 py-10 sm:py-14 px-4 sm:px-6 lg:px-8 shadow-xs overflow-hidden">
            <div className="max-w-6xl mx-auto flex flex-col items-center gap-8 relative z-10">
              {/* Top Banner Row: Title + Motto */}
              <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 border-b border-slate-100 pb-5">
                <div className="space-y-1 text-center md:text-left">
                  <span className="text-[11px] font-bold text-[#0891b2] uppercase tracking-wider bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-100">
                    Official Ticket
                  </span>
                  <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#0f172a] pt-1">
                    Exclusive <span className="text-[#0891b2]">Festival Coupons</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-normal">
                    Collect serial-numbered tickets with every purchase at Valanchery stores
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <p className="font-script text-[#0891b2] text-xl sm:text-2xl font-bold leading-tight text-center md:text-right">
                    Shop Local • Save More • Win Big ♡
                  </p>
                  <img
                    src="/shopping-bags.png"
                    alt="Valanchery Festival Shopping Bags"
                    className="w-14 sm:w-16 h-auto drop-shadow-sm hidden sm:block"
                  />
                </div>
              </div>

              {/* Large, Prominent Official Lucky Draw Coupon Ticket */}
              <div className="w-full flex items-center justify-center">
                <div className="relative group w-full max-w-5xl lg:max-w-6xl">
                  {/* Large Official Coupon Card Container */}
                  <div className="relative overflow-hidden bg-white border border-cyan-200/80 shadow-2xl shadow-cyan-950/10 p-2 sm:p-4 transition transform group-hover:scale-[1.005] duration-300 rounded-xl sm:rounded-2xl">
                    <img
                      src="/festival-coupon-banner.png"
                      alt="Valanchery Lucky Draw Official Coupon"
                      className="w-full h-auto object-contain block mx-auto rounded-lg sm:rounded-xl"
                    />
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────
              FOLD 4: "WHY SHOP LOCAL?" (Standardized, White & Cyan Card)
          ─────────────────────────────────────────────────────────────── */}
          <section id="why-festival" className="scroll-mt-20 relative w-full bg-[#f8fafc] py-12 sm:py-16">
            <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Content Column */}
              <div className="lg:col-span-6 space-y-4">
                <div className="space-y-1">
                  <span className="text-[11px] font-bold text-[#0891b2] uppercase tracking-wider bg-cyan-50 px-2.5 py-1 rounded-md border border-cyan-100">
                    Community Initiative
                  </span>
                  <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-slate-900 pt-1">
                    Why Shop Local in Valanchery?
                  </h2>
                </div>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal">
                  Your purchase directly empowers neighborhood merchants, strengthens local families, and creates vibrant commerce right here in Valanchery.
                </p>

                <div className="space-y-3 pt-2">
                  <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="h-7 w-7 rounded-lg bg-cyan-50 text-[#0891b2] flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Genuine Community Support</p>
                      <p className="text-xs text-slate-500">Every rupee spent circulates within Valanchery businesses.</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 bg-white p-3.5 rounded-xl border border-slate-200/80 shadow-xs">
                    <div className="h-7 w-7 rounded-lg bg-cyan-50 text-[#0891b2] flex items-center justify-center shrink-0 mt-0.5">
                      ✓
                    </div>
                    <div>
                      <p className="text-xs font-bold text-slate-900">Exciting Bumper Lucky Draws</p>
                      <p className="text-xs text-slate-500">Enter multiple coupons to boost your chances for Mega and Normal prizes.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Right Column: Direct High-Quality Collage Image Asset */}
              <div className="lg:col-span-6 flex justify-center items-center">
                <div className="bg-white p-3 sm:p-4 rounded-2xl border border-cyan-100 shadow-xl shadow-cyan-950/5">
                  <img
                    src="/why-shop-local-collage.png"
                    alt="Valanchery Festival Local Markets"
                    className="w-full max-w-[420px] sm:max-w-[480px] h-auto object-contain block drop-shadow-sm rounded-xl"
                  />
                </div>
              </div>
            </div>
          </section>


          {/* ─────────────────────────────────────────────────────────────
              FOLD 6: 🏘️ "OUR TOWN" HERITAGE (White & Cyan Aesthetic)
          ─────────────────────────────────────────────────────────────── */}
          <section id="our-valanchery" className="scroll-mt-20 bg-gradient-to-r from-slate-900 via-cyan-950 to-slate-900 text-white p-8 sm:p-14 text-center relative overflow-hidden shadow-lg">
            <div className="max-w-2xl mx-auto space-y-4 relative z-10">
              <h2 className="text-2xl sm:text-4xl font-extrabold tracking-tight leading-tight text-white">
                More Than Shopping. <span className="text-[#06b6d4]">It's Our Valanchery.</span>
              </h2>
              <p className="font-script text-cyan-200 text-2xl sm:text-3xl font-bold">
                “Local shops. Local people. Local happiness.”
              </p>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-normal max-w-xl mx-auto">
                Shop with pride across Valanchery's registered stores, collect your official serial-numbered coupon tickets, and celebrate with the whole town!
              </p>
              <div className="pt-3">
                <a
                  href="#register"
                  className="inline-flex items-center gap-2 bg-gradient-to-r from-[#06b6d4] to-[#0891b2] hover:from-[#0891b2] hover:to-[#0e7490] text-white px-7 py-3 text-xs sm:text-sm font-bold rounded-xl shadow-md transition active:scale-95 cursor-pointer"
                >
                  <span>Register Coupon Now</span>
                  <ArrowRight size={14} />
                </a>
              </div>
            </div>
          </section>
        </div>
      </main>

      {/* ─────────────────────────────────────────────────────────────
          EVENT VIDEO MODAL
      ─────────────────────────────────────────────────────────────── */}
      {videoModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-2xl bg-black overflow-hidden border border-white/20 shadow-2xl rounded-2xl">
            <button
              onClick={() => setVideoModalOpen(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center transition rounded-full"
            >
              <X size={18} />
            </button>
            <div className="p-8 sm:p-12 text-center text-white space-y-4">
              <div className="w-16 h-16 bg-[#0891b2] text-white mx-auto flex items-center justify-center shadow-lg rounded-2xl">
                <Play size={24} className="fill-current ml-1" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black">Valanchery Festival 2026 Promo</h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                Official teaser video for Valanchery Shopping Festival Season 2. Shop local, support local, and win bumper rewards!
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setVideoModalOpen(false)}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 text-xs font-bold border border-white/20 transition rounded-xl"
                >
                  Close Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MINIMALIST OFFICIAL KVVES FOOTER
      ─────────────────────────────────────────────────────────────── */}
      <footer className="bg-white text-[#1E2937] border-t border-slate-200 py-8 px-4 font-sans">
        <div className="mx-auto max-w-4xl flex flex-col items-center justify-center text-center space-y-4">
          <img
            src="/kvves-valanchery-banner-transparent.png"
            alt="KVVES Valanchery Unit"
            className="h-10 sm:h-12 w-auto object-contain mx-auto"
          />
          <p className="text-[11px] text-slate-400">
            © 2026-2027 Kerala Vyapari Vyavasayi Ekopana Samithi (KVVES) Valanchery Unit · Reg. No: 262/81
          </p>
        </div>
      </footer>
    </div>
  )
}
