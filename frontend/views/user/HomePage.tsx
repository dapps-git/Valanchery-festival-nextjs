import { useEffect } from 'react'
import {
  ArrowRight,
} from 'lucide-react'
import { PublicNavbar } from '../../components/PublicNavbar'
import { RegisterCouponSection } from '../../components/RegisterCouponSection'
import { FestivalThreeAdsSection } from '../../components/FestivalThreeAdsSection'

export function HomePage() {
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
    const hasHash = window.location.hash === '#register'

    if (rawParam || hasHash) {
      const scrollHandler = () => {
        const el = document.getElementById('register')
        if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }
      setTimeout(scrollHandler, 100)
      setTimeout(scrollHandler, 400)
    }
  }, [])

  return (
    <div className="w-full bg-[#f8fafc] text-[#0f172a] font-sans select-none scroll-smooth min-h-screen overflow-x-hidden">
      {/* 1. White & Cyan Festival Navbar */}
      <PublicNavbar active="home" />

      {/* Main Page Content Container */}
      <main className="pt-9 sm:pt-12 pb-12 w-full overflow-x-hidden">
        {/* ─────────────────────────────────────────────────────────────
            FOLD 1: 2-COLUMN SQUARE AD BANNERS (Slow Slide-Down Slideshows)
        ─────────────────────────────────────────────────────────────── */}
        <FestivalThreeAdsSection />

        {/* ─────────────────────────────────────────────────────────────
            FOLD 2: OFFICIAL FESTIVAL COUPON TICKET (Full-Width Edge-to-Edge, Zero Border Radius)
        ─────────────────────────────────────────────────────────────── */}
        <section className="relative w-full bg-white border-b border-slate-200/80 overflow-hidden p-0 m-0">
          <div className="w-full p-0 m-0">
            <img
              src="/festival-coupon-banner.png"
              alt="Official Valanchery Shopping Festival Lucky Draw Coupon Ticket"
              className="w-full h-auto block select-none rounded-none"
              loading="lazy"
            />
          </div>
        </section>

        {/* ─────────────────────────────────────────────────────────────
            FOLD 3: REGISTER COUPON SECTION (Directly Below Coupon Ticket)
        ─────────────────────────────────────────────────────────────── */}
        <div className="w-full pt-2 sm:pt-4 pb-6 sm:pb-8 bg-gradient-to-b from-white via-cyan-50/20 to-slate-50 border-b border-cyan-100/60">
          <RegisterCouponSection id="register" compact={true} />
        </div>

        {/* Full-Width Inner Content Container */}
        <div className="w-full pt-8 sm:pt-10 space-y-6 sm:space-y-8">
          {/* ─────────────────────────────────────────────────────────────
              FOLD 5: "WHY SHOP LOCAL?" (Standardized, White & Cyan Card)
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
