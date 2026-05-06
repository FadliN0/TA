import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  const res = NextResponse.next()
  const supabase = createMiddlewareClient({ req, res })

  // PENTING: Refresh session agar cookie tetap valid
  const { data: { session } } = await supabase.auth.getSession()

  const isAuthPage = req.nextUrl.pathname.startsWith('/login')
  const isDashboardPage = req.nextUrl.pathname.startsWith('/dashboard')

  // Logika 1: Jika belum login tapi mau ke dashboard -> Tendang ke Login
  if (!session && isDashboardPage) {
    return NextResponse.redirect(new URL('/login', req.url))
  }

  // Logika 2: Jika sudah login tapi mau ke login lagi -> Tendang ke Dashboard
  if (session && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', req.url))
  }

  return res
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}