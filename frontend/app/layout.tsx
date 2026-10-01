import type { Metadata } from 'next'
import '@/index.css'
import { Providers } from './providers'

export const metadata: Metadata = {
  title: 'Valanchery Festival 2026 | Grand Shopping Festival & Lucky Draw',
  description:
    'Join Valanchery Festival 2026. Shop from registered merchants across Valanchery, register your lucky draw coupons, and win cars, gold, bikes, and mega home appliances.',
  keywords: ['Valanchery Festival', 'Lucky Draw', 'Shopping Festival 2026', 'Kerala Shopping Festival', 'Coupons'],
  openGraph: {
    title: 'Valanchery Festival 2026 | Grand Shopping Festival',
    description: 'Shop, Register your coupon, and Win grand prizes!',
    type: 'website',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Caveat:wght@600;700&family=Montserrat:ital,wght@0,300;0,400;0,500;0,600;0,700;0,800;0,900;1,400;1,600;1,700&display=swap"
          rel="stylesheet"
        />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
      </head>
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}

