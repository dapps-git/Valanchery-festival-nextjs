import type { Metadata } from 'next'
import '../index.css'
import { AdminProviders } from './providers'

export const metadata: Metadata = {
  title: 'Valanchery Festival 2026 | Admin Panel',
  description: 'Admin panel for Valanchery Festival Lucky Draw management',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Montserrat:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </head>
      <body>
        <AdminProviders>{children}</AdminProviders>
      </body>
    </html>
  )
}
