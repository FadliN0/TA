import { createMiddlewareClient } from '@supabase/auth-helpers-nextjs'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // 1. Buat response dasar
  const res = NextResponse.next()
  
  // 2. Biarkan Supabase mengecek dan memvalidasi sesi. 
  // Jika ada token baru, Supabase akan menyuntikkannya ke dalam objek 'res' ini.
  const supabase = createMiddlewareClient({ req, res })
  const { data: { session } } = await supabase.auth.getSession()

  const isAuthPage = req.nextUrl.pathname.startsWith('/login')
  const isDashboardPage = req.nextUrl.pathname.startsWith('/dashboard')

  // 3. Tentukan respons akhir (default-nya adalah 'res' biasa)
  let finalResponse = res;

  if (!session && isDashboardPage) {
    // Mau ke dashboard tapi belum login -> Tendang ke login
    finalResponse = NextResponse.redirect(new URL('/login', req.url))
  } else if (session && isAuthPage) {
    // Sudah login tapi iseng buka halaman login -> Tendang ke dashboard
    finalResponse = NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // 4. PENYELAMAT NYAWA (Copy Cookies) 🚨
  // Jika ternyata kita melakukan redirect (finalResponse berubah menjadi objek baru),
  // kita WAJIB memindahkan cookie dari 'res' asli ke 'finalResponse'
  // agar token Supabase tidak hilang!
  if (finalResponse !== res) {
    res.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie.name, cookie.value)
    })
  }

  return finalResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}