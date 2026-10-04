'use client'

import React from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { AdminLayout } from './AdminLayout'
import { ProtectedRoute } from '@/components/ProtectedRoute'
import { AdminLoginPage } from './AdminLoginPage'
import { AdminWinnersPage } from './AdminWinnersPage'
import { DashboardPage } from './DashboardPage'
import { CouponsPage } from './CouponsPage'
import { CouponsDirectoryPage } from './CouponsDirectoryPage'
import { LuckyDrawPage } from './LuckyDrawPage'
import { CompetitionGiftsPage } from './CompetitionGiftsPage'
import { ParticipantsPage } from './ParticipantsPage'
import { PrizesPage } from './PrizesPage'

export function AdminApp() {
  const [mounted, setMounted] = React.useState(false)

  React.useEffect(() => {
    setMounted(true)
  }, [])

  if (!mounted) {
    return (
      <div className="min-h-screen bg-[#F7F5F0] flex items-center justify-center text-xs text-stone-500 font-sans">
        Loading Admin Console...
      </div>
    )
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/admin/login" element={<AdminLoginPage />} />
        <Route
          path="/admin"
          element={
            <ProtectedRoute>
              <AdminLayout />
            </ProtectedRoute>
          }
        >
          <Route index element={<Navigate to="/admin/dashboard" replace />} />
          <Route path="dashboard" element={<DashboardPage />} />
          <Route path="coupons" element={<CouponsPage />} />
          <Route path="coupons-directory" element={<CouponsDirectoryPage />} />
          <Route path="lucky-draw" element={<LuckyDrawPage />} />
          <Route path="mega-competition" element={<CompetitionGiftsPage type="Mega" />} />
          <Route path="normal-competition" element={<CompetitionGiftsPage type="Normal" />} />
          <Route path="participants" element={<ParticipantsPage />} />
          <Route path="prizes" element={<Navigate to="/admin/normal-competition" replace />} />
          <Route path="gifts" element={<Navigate to="/admin/normal-competition" replace />} />
          <Route path="winners" element={<AdminWinnersPage />} />
        </Route>
        <Route path="/" element={<Navigate to="/admin/dashboard" replace />} />
        <Route path="*" element={<Navigate to="/admin/dashboard" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default AdminApp
