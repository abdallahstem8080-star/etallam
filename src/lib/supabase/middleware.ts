import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

// بتشتغل مع كل طلب: بتحافظ على تسجيل الدخول وبتحمي الصفحات
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const path = request.nextUrl.pathname
  const isProtected = path.startsWith('/dashboard')

  // لو مش مسجل دخول وحاول يدخل صفحة محمية، يترجع لصفحة الدخول
  if (!user && isProtected) {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // حماية حسب نوع الحساب: كل حساب يقدر يدخل صفحاته بس
  if (user && isProtected) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const role = profile?.role
    const roleSection = path.split('/')[2] // dashboard/[role]/...

    const validRoles = ['admin', 'teacher', 'student', 'parent']

    if (role && validRoles.includes(roleSection) && roleSection !== role) {
      const url = request.nextUrl.clone()
      url.pathname = `/dashboard/${role}`
      return NextResponse.redirect(url)
    }
  }

  return supabaseResponse
}
