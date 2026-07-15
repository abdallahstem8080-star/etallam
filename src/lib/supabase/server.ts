import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

// الاتصال بـ Supabase من جهة السيرفر (Server Components / API Routes)
export async function createClient() {
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
            // بيحصل عادي لو اتنادى من Server Component، ممكن نتجاهله
          }
        },
      },
    }
  )
}
