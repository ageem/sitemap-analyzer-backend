import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { Providers } from './providers'
import { NavBar } from '@/components/NavBar'
import { Toaster } from '@/components/ui/toaster'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Sitemap SEO Analyzer',
  description: 'Analyze SEO metadata from sitemap.xml files',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>
          <NavBar />
          <main>
            {children}
          </main>
          <Toaster />
        </Providers>
      </body>
    </html>
  )
}
