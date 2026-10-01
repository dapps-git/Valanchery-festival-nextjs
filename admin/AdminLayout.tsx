import { NavLink, Outlet, useNavigate, Link } from 'react-router-dom'
import {
  CalendarClock,
  Gift,
  LayoutDashboard,
  LogOut,
  Menu,
  Settings,
  Trophy,
  Upload,
  Users,
  Dices,
  Sparkles,
  X,
  ExternalLink,
  QrCode,
  Ticket,
} from 'lucide-react'
import { useState } from 'react'
import { useApp } from '@/context/AppContext'

const links = [
  { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/coupons', label: 'Generate Coupons', icon: QrCode },
  { to: '/admin/coupons-directory', label: 'Coupons Directory', icon: Ticket },
  { to: '/admin/lucky-draw', label: 'Live Draw Stage', icon: Sparkles },
  { to: '/admin/participants', label: 'Participants', icon: Users },
  { to: '/admin/prizes', label: 'Gifts', icon: Gift },
  { to: '/admin/winners', label: 'Winner History', icon: Trophy },
]

export function AdminLayout() {
  const { logout } = useApp()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 px-3 font-sans">
      <div className="mb-2 px-3 py-1 text-[10px] font-medium tracking-[0.2em] text-[#C2A676] uppercase">
        NAVIGATION
      </div>
      {links.map(({ to, label, icon: Icon }) => (
        <NavLink
          key={to}
          to={to}
          onClick={() => setOpen(false)}
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 text-xs tracking-wide transition rounded-[6px] ${
              isActive
                ? 'bg-[#2E2924] font-medium text-[#FAF8F5] shadow-xs border-l-2 border-[#C2A676]'
                : 'text-stone-300 hover:bg-[#2A2520] hover:text-white font-normal border-l-2 border-transparent'
            }`
          }
        >
          <Icon size={16} className="shrink-0 text-[#C2A676]/90" />
          <span>{label}</span>
        </NavLink>
      ))}

      <div className="my-3 border-t border-stone-800" />

      <Link
        to="/"
        target="_blank"
        className="flex items-center gap-3 px-3 py-2 text-xs font-light text-stone-300 hover:bg-[#2A2520] hover:text-white transition rounded-[6px]"
      >
        <ExternalLink size={15} className="shrink-0 text-[#C2A676]" />
        <span>Public Website</span>
      </Link>

      <button
        type="button"
        onClick={() => {
          logout()
          navigate('/admin/login')
        }}
        className="mt-auto mb-3 flex items-center gap-3 border border-stone-800 px-3 py-2 text-xs font-normal text-stone-300 transition hover:border-red-900/60 hover:bg-red-950/20 hover:text-red-200 cursor-pointer rounded-[6px]"
      >
        <LogOut size={15} className="shrink-0" />
        <span>Logout</span>
      </button>
    </nav>
  )

  return (
    <div className="min-h-screen bg-[#F7F5F0] text-[#292524] font-sans relative">
      {/* Desktop Sidebar */}
      <aside className="fixed inset-y-0 left-0 z-40 hidden w-64 flex-col border-r border-[#2C2722] bg-[#1E1B18] text-white lg:flex shadow-xl">
        <div className="border-b border-[#2C2722] px-5 py-4 flex items-center gap-3 bg-[#181512]">
          <div className="w-8 h-8 rounded-[6px] bg-[#C2A676]/20 border border-[#C2A676]/40 flex items-center justify-center text-[#E6D5B8] font-medium text-xs">
            VF
          </div>
          <div>
            <p className="text-sm font-medium text-[#FAF8F5] tracking-wide leading-tight">Valanchery Festival</p>
            <p className="text-[10px] font-light text-[#C2A676]">Admin Portal · 2026</p>
          </div>
        </div>
        <div className="flex-1 py-4 flex flex-col overflow-y-auto">{nav}</div>
      </aside>

      {/* Mobile Drawer */}
      {open && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button className="absolute inset-0 bg-black/60 backdrop-blur-xs" onClick={() => setOpen(false)} />
          <aside className="absolute inset-y-0 left-0 flex w-72 flex-col border-r border-[#2C2722] bg-[#1E1B18] text-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-[#2C2722] px-5 py-4 bg-[#181512]">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-[6px] bg-[#C2A676]/20 border border-[#C2A676]/40 flex items-center justify-center text-[#E6D5B8] font-medium text-xs">
                  VF
                </div>
                <div>
                  <p className="text-sm font-medium text-[#FAF8F5] tracking-wide leading-tight">Valanchery Festival</p>
                  <p className="text-[10px] font-light text-[#C2A676]">Admin Portal · 2026</p>
                </div>
              </div>
              <button onClick={() => setOpen(false)} className="text-stone-400 hover:text-white p-1">
                <X size={20} />
              </button>
            </div>
            <div className="flex-1 py-4 flex flex-col overflow-y-auto">{nav}</div>
          </aside>
        </div>
      )}

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <header className="sticky top-0 z-30 flex items-center justify-between border-b border-[#E8E3D8] bg-white/95 px-4 py-3 backdrop-blur-md md:px-8">
          <div className="flex items-center gap-3">
            <button
              className="border border-[#E8E3D8] bg-white p-2 rounded-[6px] lg:hidden text-stone-700 hover:text-stone-900 transition"
              onClick={() => setOpen(true)}
              aria-label="Open menu"
            >
              <Menu size={18} />
            </button>
            <div className="flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-xs font-medium tracking-wider text-stone-700 uppercase">
                Admin Console
              </p>
            </div>
          </div>

          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/"
              target="_blank"
              className="hidden sm:inline-flex items-center gap-1.5 border border-[#E8E3D8] bg-white px-3 py-1.5 text-xs font-normal text-stone-700 hover:text-stone-900 hover:border-stone-400 transition rounded-[6px]"
            >
              <span>Public Site</span>
              <ExternalLink size={12} />
            </Link>

            <div className="flex items-center gap-2 pl-2 border-l border-stone-200">
              <div className="flex h-7 w-7 rounded-[6px] items-center justify-center bg-[#1E1B18] text-xs font-medium text-[#C2A676]">
                A
              </div>
              <div className="hidden sm:block text-left">
                <p className="text-[11px] font-medium text-stone-800 leading-tight">Admin Committee</p>
                <p className="text-[9px] font-light text-stone-500">Valanchery Portal</p>
              </div>
            </div>
          </div>
        </header>

        <main className="relative z-10 flex-1 px-4 py-6 md:px-8 md:py-8 font-normal">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
