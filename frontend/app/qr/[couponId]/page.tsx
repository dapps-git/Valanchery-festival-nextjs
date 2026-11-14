'use client'

import { useEffect, use } from 'react'

export default function QrPage({ params }: { params: Promise<{ couponId: string }> }) {
  const resolvedParams = use(params)
  const couponId = resolvedParams?.couponId

  useEffect(() => {
    if (typeof window === 'undefined') return
    const target = couponId ? `/?coupon=${encodeURIComponent(couponId)}` : '/'
    window.location.replace(target)
  }, [couponId])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-sans">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-cyan-800">
        <div className="h-5 w-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
        <span>Routing to Festival Registration...</span>
      </div>
    </div>
  )
}

