import { Link } from './Link'
import { ArrowRight } from 'lucide-react'

interface PublicNavbarProps {
  active?: 'home' | 'register' | 'winners'
}

export function PublicNavbar({ active }: PublicNavbarProps) {
  return (
    <header className="fixed top-0 left-0 right-0 z-50 w-full bg-white/95 backdrop-blur-md text-[#0f172a] border-b border-cyan-100 px-4 sm:px-8 lg:px-12 py-2.5 shadow-xs">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        {/* Brand Logo & KVVES Badge */}
        <Link to="/" className="flex items-center gap-3 group shrink-0">
          <img
            src="/valanchery-shopping-festival-logo.png"
            alt="Valanchery Shopping Festival Season 2"
            className="h-10 sm:h-12 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
          />
          <div className="hidden lg:flex items-center gap-2 pl-3 border-l border-slate-200">
            <img
              src="/kvves-logo-round.png"
              alt="KVVES Valanchery"
              className="h-8 w-auto object-contain"
            />
            <div className="text-[10px] leading-tight text-slate-500 font-medium">
              <span className="font-bold text-[#0891b2]">KVVES</span> Valanchery Unit
              <br />Reg. No: 262/81
            </div>
          </div>
        </Link>

        {/* Navigation Links - Centered on Desktop */}
        <nav className="hidden md:flex items-center gap-8 text-xs sm:text-[13px] font-semibold text-slate-600 shrink-0">
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

        {/* Right Action Button */}
        <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
          <Link
            to="/register"
            className="inline-flex items-center gap-1.5 bg-[#0284c7] hover:bg-[#0369a1] text-white px-3 sm:px-4 py-1.5 sm:py-2 text-[11px] sm:text-xs font-bold tracking-wider uppercase transition shadow-xs active:scale-95 cursor-pointer whitespace-nowrap rounded-md font-['Montserrat',sans-serif]"
          >
            <span>Register Now</span>
            <ArrowRight size={13} />
          </Link>
        </div>
      </div>
    </header>
  )
}
