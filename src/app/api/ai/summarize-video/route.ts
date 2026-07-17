import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST(req: NextRequest) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'غير مصرح' }, { status: 401 })
  }

  const { videoId, youtubeUrl, title } = await req.json()

  if (!videoId || !youtubeUrl) {
    return NextResponse.json({ error: 'بيانات ناقصة' }, { status: 400 })
  }

  // 1) نتأكد إن مفيش ملخص محفوظ بالفعل (Cache)
  const { data: existing } = await supabase
    .from('video_summaries')
    .select('summary')
    .eq('video_id', videoId)
    .maybeSingle()

  if (existing) {
    return NextResponse.json({ summary: existing.summary, cached: true })
  }

  const geminiKey = process.env.GEMINI_API_KEY
  if (!geminiKey) {
    return NextResponse.json(
      { error: 'GEMINI_API_KEY مش متضاف في إعدادات السيرفر لسه' },
      { status: 500 }
    )
  }

  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${geminiKey}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [
            {
              parts: [
                {
                  fileData: {
                    fileUri: youtubeUrl,
                    mimeType: 'video/*',
                  },
                },
                {
                  text: `لخّص محتوى الفيديو التعليمي ده باللغة العربية في نقاط واضحة ومختصرة، عنوان الفيديو هو "${title}". ركّز على أهم الأفكار والمعلومات اللي المفروض الطالب يخرج بيها.`,
                },
              ],
            },
          ],
        }),
      }
    )

    const data = await response.json()

    if (!response.ok) {
      return NextResponse.json(
        { error: data?.error?.message ?? 'فشل توليد الملخص' },
        { status: 400 }
      )
    }

    const summary =
      data?.candidates?.[0]?.content?.parts?.[0]?.text ?? 'تعذر توليد الملخص'

    // 2) نخزن الملخص عشان منولدوش تاني
    await supabase.from('video_summaries').insert({ video_id: videoId, summary })

    return NextResponse.json({ summary, cached: false })
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 })
  }
}
