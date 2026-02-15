import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { DashboardProvider } from '@/contexts/DashboardContext'
import './globals.css'

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' })

export const metadata: Metadata = {
  title: '108 Ops Hub',
  description: 'Internal operations hub for 108 Performance',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: '108 Ops',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#111827',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className={inter.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body className="font-sans">
        <DashboardProvider>
          {children}
        </DashboardProvider>
      </body>
    </html>
  )
}
