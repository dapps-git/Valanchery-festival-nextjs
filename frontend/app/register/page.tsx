'use client'

import { useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

function RegisterRedirect() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    if (typeof window === 'undefined') return
    const search = window.location.search || (searchParams ? `?${searchParams.toString()}` : '')
    const target = search ? `/${search}` : '/'
    window.location.replace(target)
  }, [router, searchParams])

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 text-slate-600 font-sans">
      <div className="flex items-center gap-2.5 text-sm font-semibold text-cyan-800">
        <div className="h-5 w-5 border-2 border-cyan-600 border-t-transparent rounded-full animate-spin" />
        <span>Routing to Festival Registration...</span>
      </div>
    </div>
  )
}

export default function Register() {
  return (
    <Suspense fallback={null}>
      <RegisterRedirect />
    </Suspense>
  )
}

