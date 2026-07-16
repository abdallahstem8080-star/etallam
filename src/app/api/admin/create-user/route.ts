import { NextRequest, NextResponse } from 'next/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { createClient as createServerClient } from '@/lib/supabase/server'

function generateStudentCode() {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `ET-${num}`
}

export async function POST(req: NextRequest) {
  // 1) نتأكد إن اللي بيطلب فعلاً Admin مسجل دخول (باستخدام الجلسة العادية، مش المفتاح الخاص)
  const supabaseAuth = await createServerClient()
  const {
    data: { user },
  } = await supabaseAuth.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { data: requesterProfile } = await supabaseAuth
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (requesterProfile?.role !== 'admin') {
    return NextResponse.json({ error: 'الصلاحية دي للأدمن بس' }, { status: 403 })
  }

  // 2) نستخدم الـ Service Role Key هنا بس، جوه السيرفر، عشان ننشئ الحساب فعليًا
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!serviceKey) {
    return NextResponse.json(
      { error: 'SUPABASE_SERVICE_ROLE_KEY مش متضاف في إعدادات السيرفر' },
      { status: 500 }
    )
  }

  const supabaseAdmin = createServiceClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    serviceKey
  )

  try {
    const { name, email, password, role, phone } = await req.json()

    if (!name || !email || !password || !role) {
      return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
    }

    const { data: created, error: createError } =
      await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
      })

    if (createError || !created.user) {
      return NextResponse.json(
        { error: createError?.message ?? 'فشل إنشاء الحساب' },
        { status: 400 }
      )
    }

    const profileData: Record<string, unknown> = {
      id: created.user.id,
      name,
      role,
      email,
      phone: phone || null,
    }
    if (role === 'student') {
      profileData.student_code = generateStudentCode()
    }

    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .insert(profileData)

    if (profileError) {
      return NextResponse.json({ error: profileError.message }, { status: 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
