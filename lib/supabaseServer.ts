import { createServerClient } from '@supabase/ssr'   // ← dari package BARU
import { cookies } from 'next/headers'

// nama fungsi diganti jadi createClient (biar nggak bentrok)
export async function createClient() {              // ← perhatiin: async!
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              cookieStore.set(name, value, options)
            )
          } catch {
            // dipanggil dari Server Component — aman diabaikan
          }
        },
      },
    }
  )
}