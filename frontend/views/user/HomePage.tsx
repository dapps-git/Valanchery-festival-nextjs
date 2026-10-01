import { useState } from 'react'
import {
  ArrowRight,
  Gift,
  Play,
  X,
} from 'lucide-react'
import couponBannerImg from '../../assets/festival-coupon-banner.png'
import heroBannerFull from '../../assets/hero-banner-full.png'
import { PublicNavbar } from '../../components/PublicNavbar'
import { HomeRegisterSection } from '../../components/HomeRegisterSection'

export function HomePage() {
  const [videoModalOpen, setVideoModalOpen] = useState(false)

  return (
    <div className="w-full bg-[#F8F9FA] text-[#1E2937] font-sans select-none scroll-smooth min-h-screen overflow-x-hidden">
      {/* 1. White Festival Navbar */}
      <PublicNavbar active="home" />

      {/* Main Page Content Container */}
      <main className="pt-14 sm:pt-16 pb-16 w-full overflow-x-hidden">
        {/* ─────────────────────────────────────────────────────────────
            FOLD 1: 100% FULL-WIDTH VIBRANT HERO BANNER (Edge-to-Edge)
        ─────────────────────────────────────────────────────────────── */}
        <section className="relative w-full overflow-hidden shadow-xl bg-[#DC2626]">
          {/* Background Full Hero Banner Image across 100% viewport width */}
          <div
            className="w-full min-h-[460px] sm:min-h-[520px] lg:min-h-[580px] xl:min-h-[640px] bg-cover bg-center sm:bg-right-bottom relative flex flex-col justify-center"
            style={{
              backgroundImage: `url(${typeof heroBannerFull === 'string' ? heroBannerFull : (heroBannerFull as any)?.src || '/hero-banner-full.png'})`,
              backgroundPosition: 'right center',
              backgroundSize: 'cover',
            }}
          >
            {/* Soft Gradient Veil for left text legibility without obscuring the right bags */}
            <div className="absolute inset-0 bg-gradient-to-r from-[#DC2626]/90 via-[#DC2626]/55 to-transparent sm:via-[#DC2626]/30 lg:to-transparent pointer-events-none" />

            {/* Inner Content Alignment matching the Navbar max-width */}
            <div className="max-w-7xl mx-auto w-full px-4 sm:px-8 lg:px-12 relative z-10 py-10 sm:py-14">
              {/* Top Right Handwriting Sticker */}
              <div className="hidden md:block absolute top-2 right-4 lg:right-8 text-right z-20 pointer-events-none">
                <p className="font-script text-white/95 text-xl lg:text-2xl font-bold tracking-wide -rotate-3 drop-shadow-md leading-tight">
                  Local Business<br />Stronger Together ♡
                </p>
              </div>

              {/* Text on the Center Bag */}
              <div className="hidden lg:block absolute bottom-[8%] right-[22%] xl:right-[24%] z-20 pointer-events-none transform -rotate-6">
                <p className="font-script text-white text-3xl xl:text-4xl font-extrabold tracking-wide drop-shadow-lg text-center leading-tight">
                  Shop<br />Local ♡
                </p>
              </div>

              {/* Hero Content (Left-Aligned) */}
              <div className="max-w-xl lg:max-w-2xl space-y-3 sm:space-y-4 text-white">
                {/* Script Subtitle */}
                <p className="font-script text-white text-2xl sm:text-3xl lg:text-4xl font-bold italic tracking-wide drop-shadow-md">
                  Shop Local Support Local Win Together ♡
                </p>

                {/* Clean Semi-Bold Montserrat Headline */}
                <h1 className="text-3xl xs:text-4xl sm:text-5xl lg:text-6xl font-semibold text-white tracking-tight leading-[1.05] drop-shadow-md">
                  Valanchery<br />Festival 2026
                </h1>

                {/* Tagline */}
                <p className="text-white/95 text-xs sm:text-sm lg:text-base font-normal tracking-wide drop-shadow-xs">
                  Shop Local &nbsp;•&nbsp; Support Local &nbsp;•&nbsp; Win Together
                </p>

                {/* Action Buttons */}
                <div className="pt-2 sm:pt-4 flex items-center">
                  <a
                    href="#register"
                    className="inline-flex items-center gap-2 bg-white hover:bg-slate-50 text-[#DC2626] px-7 sm:px-9 py-3 text-xs sm:text-sm font-semibold tracking-wider uppercase shadow-lg transition active:scale-95 cursor-pointer rounded-lg"
                  >
                    <span>Register Now</span>
                    <ArrowRight size={15} />
                  </a>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Full-Width Inner Content Container */}
        <div className="w-full pt-4 sm:pt-6 space-y-4 sm:space-y-6">
          {/* ─────────────────────────────────────────────────────────────
              FOLD 2: FESTIVAL SPECIAL COUPON BANNER (Prominent & High Impact)
          ─────────────────────────────────────────────────────────────── */}
          <section className="relative w-full bg-gradient-to-r from-white via-[#FEF2F2] to-white border-y sm:border border-red-200/90 py-8 sm:py-10 px-4 sm:px-6 lg:px-8 shadow-xs overflow-hidden">
            {/* Sparkles in background */}
            <div className="absolute top-2 left-1/4 text-red-300/40 text-sm select-none">✦</div>
            <div className="absolute bottom-2 left-1/3 text-amber-300/50 text-xs select-none">★</div>
            <div className="absolute top-4 right-1/4 text-red-300/40 text-sm select-none">✦</div>

            <div className="max-w-6xl mx-auto flex flex-col items-center gap-6 relative z-10">
              {/* Top Banner Row: Title + Motto */}
              <div className="w-full flex flex-col md:flex-row items-center justify-between gap-4 border-b border-red-100 pb-4">
                <div className="space-y-1 text-center md:text-left">
                  <h2 className="text-2xl sm:text-3xl font-semibold tracking-tight text-[#1E2937]">
                    Exclusive <span className="text-[#DC2626]">Festival Coupons</span>
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-500 font-normal">
                    Save more • Shop more • Support local
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <p className="font-script text-[#DC2626] text-xl sm:text-2xl font-bold leading-tight text-center md:text-right">
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
                <div className="relative group w-full max-w-4xl">
                  {/* Large Official Coupon Card Container */}
                  <div className="relative overflow-hidden bg-white border-2 sm:border-[3px] border-[#DC2626] shadow-2xl p-2.5 sm:p-4 transition transform group-hover:scale-[1.01] duration-300 rounded-xl">
                    {/* Top Header Tag Row */}
                    <div className="bg-gradient-to-r from-[#DC2626] via-[#B91C1C] to-[#DC2626] text-white px-4 py-1.5 sm:py-2 flex items-center justify-between text-xs sm:text-sm font-extrabold uppercase tracking-wider mb-2 rounded-t-lg shadow-xs">
                      <div className="flex items-center gap-2">
                        <Gift size={16} className="text-[#FFD600]" />
                        <span>VALANCHERY LUCKY DRAW 2026 OFFICIAL COUPON</span>
                      </div>
                      <span className="bg-[#FFD600] text-[#1E2937] px-2.5 py-0.5 font-black text-[10px] sm:text-xs rounded-xs shadow-xs">OFFICIAL</span>
                    </div>

                    {/* High-Resolution Official Coupon Graphic - Large & Crisp */}
                    <div className="border border-red-100 overflow-hidden bg-white rounded-lg p-1 sm:p-2">
                      <img
                        src={typeof couponBannerImg === 'string' ? couponBannerImg : (couponBannerImg as any)?.src || '/festival-coupon-banner.png'}
                        alt="Valanchery Lucky Draw Official Coupon"
                        className="w-full h-auto max-h-[300px] sm:max-h-[420px] object-contain block mx-auto drop-shadow-sm"
                      />
                    </div>
                  </div>

                  {/* Floating Sparkle Accents */}
                  <div className="absolute -top-3 -right-3 text-[#FFD600] text-lg animate-pulse">✨</div>
                  <div className="absolute -bottom-3 -left-3 text-[#DC2626] text-base">✦</div>
                </div>
              </div>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────
              FOLD 4: "WHY SHOP LOCAL?" (Balanced, Centered, Premium Layout)
          ─────────────────────────────────────────────────────────────── */}
          <section id="why-festival" className="scroll-mt-20 relative w-full bg-gradient-to-r from-white via-[#FEF2F2] to-white border-y border-red-100 py-8 sm:py-12 shadow-xs overflow-hidden rounded-none">
            {/* Soft red organic background swoosh on right */}
            <div className="absolute right-0 top-0 bottom-0 w-full lg:w-1/2 bg-gradient-to-l from-[#FEE2E2]/40 to-transparent pointer-events-none" />

            <div className="max-w-7xl mx-auto px-4 sm:px-8 lg:px-12 relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-center">
              {/* Left Content Column */}
              <div className="lg:col-span-6 space-y-3">
                <div className="flex items-center gap-3">
                  <div className="w-1.5 h-9 bg-[#DC2626] shrink-0" />
                  <div>
                    <h2 className="text-2xl sm:text-4xl font-normal tracking-tight text-[#1E2937]">
                      Why Shop Local?
                    </h2>
                    <div className="h-1 w-14 bg-[#DC2626] mt-1.5" />
                  </div>
                </div>

                <p className="text-sm sm:text-base text-slate-600 leading-relaxed font-normal pt-1">
                  Your support helps local businesses grow, creates more opportunities, and builds a stronger, happier Valanchery.
                </p>
              </div>

              {/* Right Column: Direct High-Quality Collage Image Asset */}
              <div className="lg:col-span-6 flex justify-center items-center py-2">
                <img
                  src="/why-shop-local-collage.png"
                  alt="Valanchery Festival Local Markets"
                  className="w-full max-w-[420px] sm:max-w-[480px] h-auto object-contain block drop-shadow-sm"
                />
              </div>
            </div>
          </section>

          {/* ─────────────────────────────────────────────────────────────
              FOLD 5: 📝 LIVE REGISTRATION FORM (DIRECTLY ON HOME PAGE)
          ─────────────────────────────────────────────────────────────── */}
          <div id="register" className="scroll-mt-20">
            <HomeRegisterSection />
          </div>

          {/* ─────────────────────────────────────────────────────────────
              FOLD 6: 🏘️ "OUR TOWN" HERITAGE
          ─────────────────────────────────────────────────────────────── */}
          <section id="our-valanchery" className="scroll-mt-20 bg-gradient-to-r from-[#1E2937] via-[#2A1B1F] to-[#1E2937] text-white p-8 sm:p-14 text-center relative overflow-hidden shadow-lg rounded-none">
            <div className="max-w-2xl mx-auto space-y-4 relative z-10">
              <h2 className="text-2xl sm:text-4xl font-light tracking-tight leading-tight text-white">
                More Than Shopping. <span className="font-semibold text-red-300">It's Our Valanchery.</span>
              </h2>
              <p className="font-script text-red-300 text-2xl sm:text-3xl font-bold">
                “Local shops. Local people. Local happiness.”
              </p>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-light max-w-xl mx-auto">
                Shop with pride across Valanchery's registered stores, collect your official serial-numbered coupon tickets, and celebrate with the whole town!
              </p>
              <div className="pt-3">
                <a
                  href="#register"
                  className="inline-flex items-center gap-2 bg-[#DC2626] hover:bg-[#B91C1C] text-white px-7 py-3 text-xs sm:text-sm font-semibold rounded-lg shadow-md transition active:scale-95 cursor-pointer"
                >
                  <span>Register Coupon</span>
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
          <div className="relative w-full max-w-2xl bg-black overflow-hidden border border-white/20 shadow-2xl rounded-none">
            <button
              onClick={() => setVideoModalOpen(false)}
              className="absolute top-3 right-3 z-10 w-8 h-8 bg-white/20 hover:bg-white text-white hover:text-black flex items-center justify-center transition rounded-none"
            >
              <X size={18} />
            </button>
            <div className="p-8 sm:p-12 text-center text-white space-y-4">
              <div className="w-16 h-16 bg-[#DC2626] text-white mx-auto flex items-center justify-center shadow-lg rounded-none">
                <Play size={24} className="fill-current ml-1" />
              </div>
              <h3 className="text-xl sm:text-2xl font-black">Valanchery Festival 2026 Promo</h3>
              <p className="text-xs sm:text-sm text-slate-300 max-w-md mx-auto">
                Official teaser video for Valanchery Shopping Festival Season 2. Shop local, support local, and win bumper rewards!
              </p>
              <div className="pt-2">
                <button
                  onClick={() => setVideoModalOpen(false)}
                  className="bg-white/10 hover:bg-white/20 text-white px-6 py-2 text-xs font-bold border border-white/20 transition rounded-none"
                >
                  Close Video
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─────────────────────────────────────────────────────────────
          MINIMALIST COMMUNITY FOOTER
      ─────────────────────────────────────────────────────────────── */}
      <footer className="bg-white text-[#1E2937] border-t border-slate-200 py-10 px-4 sm:px-8 font-sans">
        <div className="mx-auto max-w-4xl text-center space-y-4">
          <p className="text-[#DC2626] font-script text-2xl sm:text-3xl font-bold">
            Shop Local • Support Local ♡
          </p>

          <p className="text-slate-600 text-xs sm:text-sm leading-relaxed font-normal max-w-3xl mx-auto">
            Celebrate local shopping, discover exciting offers, and be part of something bigger with our Valanchery festival experience. Explore exclusive deals from local businesses, enter your coupon for a chance to win exciting rewards, and support the brands that make our community special. Every purchase helps local businesses grow while giving you more opportunities to save, shop, and celebrate. Join us in creating a stronger, happier Valanchery by shopping local and celebrating together.
          </p>

          <div className="pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between text-[11px] text-slate-400 gap-2">
            <p>© 2026 Valanchery Festival Merchants Committee. All rights reserved.</p>
            <div className="flex items-center gap-3">
              <span className="text-slate-500 font-medium">Official Lucky Draw Portal · Valanchery</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}
