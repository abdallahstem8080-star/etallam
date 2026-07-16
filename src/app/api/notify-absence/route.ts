import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  try {
    const { studentId, groupName, sessionDate } = await req.json()

    const supabase = await createClient()

    // نجيب اسم الطالب وأولياء أموره المرتبطين
    const { data: student } = await supabase
      .from('profiles')
      .select('name')
      .eq('id', studentId)
      .single()

    const { data: links } = await supabase
      .from('parent_student_links')
      .select('parent_id')
      .eq('student_id', studentId)

    if (!links || links.length === 0) {
      return NextResponse.json({ skipped: 'no linked parent' })
    }

    const { data: parents } = await supabase
      .from('profiles')
      .select('email')
      .in(
        'id',
        links.map((l) => l.parent_id)
      )

    const resendKey = process.env.RESEND_API_KEY

    if (!resendKey) {
      // لو مفتاح Resend مش متضاف لسه، منسجلش خطأ، بس منبعتش إيميل فعلي
      return NextResponse.json({ skipped: 'no RESEND_API_KEY configured' })
    }

    for (const parent of parents ?? []) {
      if (!parent.email) continue

      await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: 'اتعلم <onboarding@resend.dev>',
          to: parent.email,
          subject: 'تنبيه غياب',
          html: `<div dir="rtl" style="font-family: Arial, sans-serif;">
            <p>نود إفادتكم بأن الطالب <b>${student?.name ?? ''}</b> تم تسجيله غائبًا اليوم (${sessionDate}) عن حصة مجموعة <b>${groupName}</b>.</p>
          </div>`,
        }),
      })
    }

    return NextResponse.json({ sent: true })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
