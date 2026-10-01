import { Navigate } from 'react-router-dom'
import { useApp } from '../context/AppContext'
import type { ReactNode } from 'react'

export function ProtectedRoute({ children }: { children: ReactNode }) {
  const { isAdmin } = useApp()
  if (!isAdmin) return <Navigate to="/admin/login" replace />
  return children
}
