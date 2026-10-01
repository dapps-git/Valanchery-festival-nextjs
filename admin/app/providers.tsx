'use client'

import { AppProvider } from '@/context/AppContext'

export function AdminProviders({ children }: { children: React.ReactNode }) {
  return <AppProvider>{children}</AppProvider>
}
