import { Link } from './Link'
import { ArrowRight } from 'lucide-react'

interface PublicNavbarProps {
  active?: 'home' | 'register' | 'winners'
}

export function PublicNavbar({ active }: PublicNavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-md text-[#0f172a] border-b border-cyan-100 px-3 sm:px-6 lg:px-8 py-1.5 sm:py-2 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-3">
        {/* Brand Logo: Official Kerala KVVES Logo (Reduced Size) */}
        <Link to="/" className="flex items-center group shrink-0">
          <img
            src="/kvves-hd-logo.png"
            alt="Kerala Vyapari Vyavasayi Ekopana Samithi Valanchery Unit"
            className="h-7 sm:h-8 md:h-9 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
          />
        </Link>

        {/* Navigation Links - Centered on Desktop */}
        <nav className="hidden md:flex items-center gap-6 text-xs sm:text-[13px] font-semibold text-slate-600 shrink-0">
          <Link
            to="/"
            className={`transition py-1 tracking-wide relative ${
              active === 'home'
                ? 'text-[#0891b2] font-bold after:content-[""] after:absolute after:bottom-[-4px] after:left-0 after:right-0 after:h-[2.5px] after:bg-[#0891b2] after:rounded-full'
                : 'hover:text-[#0891b2]'
            }`}
          >
            Home
          </Link>
          <a href="/#why-festival" className="hover:text-[#0891b2] transition py-1 tracking-wide">
            Why Festival
          </a>
          <a href="/#our-valanchery" className="hover:text-[#0891b2] transition py-1 tracking-wide">
            Our Town
          </a>
        </nav>

        {/* Right Action Button: Reduced Button Size */}
        <div className="flex items-center gap-2 shrink-0">
          <Link
            to="/#register"
            className="inline-flex items-center gap-1 bg-[#0284c7] hover:bg-[#0369a1] text-white px-2.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] font-bold tracking-wider uppercase transition shadow-2xs active:scale-95 cursor-pointer whitespace-nowrap rounded font-['Montserrat',sans-serif]"
          >
            <span>Register Now</span>
            <ArrowRight size={11} />
          </Link>
        </div>
      </div>
    </header>
  )
}
