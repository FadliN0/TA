import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export async function middleware(req: NextRequest) {
  // 1. Buat response dasar
  const res = NextResponse.next()
  
  // 2. Biarkan Supabase mengecek dan memvalidasi sesi. 
  // Jika ada token baru, Supabase akan menyuntikkannya ke dalam objek 'res' ini.
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              res.cookies.set(name, value, options)
            )
          } catch {
            // dipanggil dari Server Component — aman diabaikan
          }
        },
      },
    }
  )
  const { data: { user} } = await supabase.auth.getUser()

  const isAuthPage = req.nextUrl.pathname.startsWith('/login')
  const isDashboardPage = req.nextUrl.pathname.startsWith('/dashboard')

  // 3. Tentukan respons akhir (default-nya adalah 'res' biasa)
  let finalResponse = res;

  if (!user && isDashboardPage) {
    // Mau ke dashboard tapi belum login -> Tendang ke login
    finalResponse = NextResponse.redirect(new URL('/login', req.url))
  } else if (user && isAuthPage) {
    // Sudah login tapi iseng buka halaman login -> Tendang ke dashboard
    finalResponse = NextResponse.redirect(new URL('/dashboard', req.url))
  }

  // 4. PENYELAMAT NYAWA (Copy Cookies) 🚨
  // Jika ternyata kita melakukan redirect (finalResponse berubah menjadi objek baru),
  // kita WAJIB memindahkan cookie dari 'res' asli ke 'finalResponse'
  // agar token Supabase tidak hilang!
  if (finalResponse !== res) {
    res.cookies.getAll().forEach((cookie) => {
      finalResponse.cookies.set(cookie)
    })
  }

  return finalResponse
}

export const config = {
  matcher: ['/dashboard/:path*', '/login'],
}