import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { cookies } from 'next/headers'
import { Suspense } from 'react'
import './globals.css'
import { AuthProvider } from '@/hooks/useAuth'
import { AppShell } from '@/components/app-shell'
import { Toaster } from '@/components/ui/sonner'

const geistSans = Geist({ variable: '--font-geist-sans', subsets: ['latin'] })
const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'MCP Builder — Enterprise Console',
  description:
    'Build, deploy, and manage Model Context Protocol servers for your team.',
  icons: {
    icon: [
      {
        url: '/icon-light-32x32.png',
        media: '(prefers-color-scheme: light)',
      },
      {
        url: '/icon-dark-32x32.png',
        media: '(prefers-color-scheme: dark)',
      },
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
    apple: '/apple-icon.png',
  },
}

// viewport must be a separate export in Next.js 15+ (not inside metadata)
export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased bg-background">
        <Suspense fallback={null}>
          <AuthenticatedShell>{children}</AuthenticatedShell>
        </Suspense>
        <Toaster richColors position="top-right" />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}

async function AuthenticatedShell({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  // Proxy.ts has already verified the JWT before this layout renders, so the
  // presence of the mcp.token cookie is a reliable authenticated signal.
  // We pass this hint to AppShell so it can skip the loading spinner on hard
  // reload — the /api/auth/me call still runs to hydrate the full User object,
  // but the shell no longer blocks rendering behind a flash.
  const cookieStore = await cookies()
  const initialAuthenticated = !!cookieStore.get('mcp.token')?.value

  return (
    <AuthProvider initialAuthenticated={initialAuthenticated}>
      <AppShell>{children}</AppShell>
    </AuthProvider>
  )
}
