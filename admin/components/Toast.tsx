import { useEffect } from 'react'

export function Toast({
  message,
  onDone,
  tone = 'success',
}: {
  message: string
  onDone: () => void
  tone?: 'success' | 'error'
}) {
  useEffect(() => {
    const t = setTimeout(onDone, 2800)
    return () => clearTimeout(t)
  }, [onDone])

  return (
    <div className="fixed top-6 right-6 z-[80] animate-fade-up">
      <div
        className={`border px-5 py-3 text-xs font-light tracking-wide shadow-2xl ${
          tone === 'success'
            ? 'border-emerald-500 bg-emerald-950 text-emerald-100'
            : 'border-[#9b1c32] bg-[#3a0c14] text-red-100'
        }`}
      >
        {message}
      </div>
    </div>
  )
}
