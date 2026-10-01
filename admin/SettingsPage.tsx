import { useState } from 'react'
import { Toast } from '@/components/Toast'
import { useApp } from '@/context/AppContext'

export function SettingsPage() {
  const { resetToDefaultData } = useApp()
  const [toast, setToast] = useState('')

  return (
    <div className="max-w-xl">
      {toast && <Toast message={toast} onDone={() => setToast('')} />}
      <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[#140d10]">
        Festival Settings
      </h1>
      <p className="mt-1 text-xs sm:text-sm text-slate-600 font-normal">
        Configure festival titles, campaign parameters, and local settings.
      </p>

      <div className="mt-6 space-y-4 border border-black/10 bg-white p-6 shadow-sm">
        <label className="block text-xs font-medium tracking-wide uppercase text-black/70">
          Festival Name
          <input
            defaultValue="Valanchery Festival 2026"
            className="mt-1.5 w-full border border-black/15 bg-white px-3.5 py-2.5 text-xs font-light text-black outline-none focus:border-[#d4a017] sm:text-sm"
          />
        </label>

        <label className="block text-xs font-medium tracking-wide uppercase text-black/70">
          Campaign Tagline
          <input
            defaultValue="Celebrate. Participate. Win Big!"
            className="mt-1.5 w-full border border-black/15 bg-white px-3.5 py-2.5 text-xs font-light text-black outline-none focus:border-[#d4a017] sm:text-sm"
          />
        </label>

        <label className="block text-xs font-medium tracking-wide uppercase text-black/70">
          Next Scheduled Draw Date
          <input
            defaultValue="15 September 2026"
            className="mt-1.5 w-full border border-black/15 bg-white px-3.5 py-2.5 text-xs font-light text-black outline-none focus:border-[#d4a017] sm:text-sm"
          />
        </label>

        <div className="border border-[#d4a017]/30 bg-[#f7f0e6] p-3 text-xs font-light text-black/70">
          Running in offline-first client storage mode. All participant registrations and lucky draw winners are safely preserved in this browser.
        </div>

        <div className="pt-2 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setToast('Settings successfully saved!')}
            className="border border-[#6b1020] bg-[#6b1020] px-6 py-2.5 text-xs font-medium tracking-wider text-white transition hover:bg-[#851629]"
          >
            SAVE SETTINGS
          </button>
          <button
            type="button"
            onClick={() => {
              if (window.confirm('Reset all participants, draws and winners to default initial demo dataset?')) {
                resetToDefaultData()
                setToast('Demo data restored to original initial state!')
              }
            }}
            className="border border-black/20 bg-[#f7f0e6] px-5 py-2.5 text-xs font-light tracking-wider text-black transition hover:bg-black/5"
          >
            RESET TO DEFAULT DEMO DATA
          </button>
        </div>
      </div>
    </div>
  )
}
