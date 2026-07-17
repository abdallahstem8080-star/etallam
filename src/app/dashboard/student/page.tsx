'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

type Exam = {
  id: string
  title: string
  subject_id: string
  duration_minutes: number
}
type Subject = { id: string; name: string }
type Submission = { exam_id: string; score: number }

export default function StudentDashboard() {
  const supabase = createClient()
  const [exams, setExams] = useState<Exam[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [loading, setLoading] = useState(true)
  const [studentCode, setStudentCode] = useState('')
  const [siteUrl, setSiteUrl] = useState('')

  async function loadAll() {
    setLoading(true)
    const { data: subs } = await supabase.from('subjects').select('id, name')
    setSubjects(subs ?? [])

    const { data: ex } = await supabase
      .from('exams')
      .select('id, title, subject_id, duration_minutes')
      .eq('is_published', true)
    setExams(ex ?? [])

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: subm } = await supabase
      .from('submissions')
      .select('exam_id, score')
      .eq('student_id', user?.id)
    setSubmissions(subm ?? [])

    const { data: profile } = await supabase
      .from('profiles')
      .select('student_code')
      .eq('id', user?.id)
      .single()
    setStudentCode(profile?.student_code ?? '')
    setSiteUrl(window.location.origin)

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  function getSubmission(examId: string) {
    return submissions.find((s) => s.exam_id === examId)
  }

  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
      <DashboardHeader title="لوحة تحكم الطالب" subtitle="Student" />

      <main className="flex-1 px-6 sm:px-12 py-10 max-w-3xl mx-auto w-full">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold">الامتحانات المتاحة</h2>
          <div className="flex gap-2">
            <Link
              href="/dashboard/student/schedule"
              className="text-sm border border-gold text-gold px-4 py-2 rounded-lg hover:bg-gold hover:text-background transition"
            >
              جدول حصصي
            </Link>
            <Link
              href="/dashboard/student/courses"
              className="text-sm border border-gold text-gold px-4 py-2 rounded-lg hover:bg-gold hover:text-background transition"
            >
              الكورسات
            </Link>
          </div>
        </div>

        {studentCode && (
          <div className="bg-navy-card border border-navy-border rounded-xl p-5 mb-6">
            <p className="text-sm font-bold mb-2">📤 تابع مستواك مع والديك</p>
            <p className="text-xs text-zinc-500 mb-3">
              ابعت الرابط ده لولي أمرك، هيقدر يتابع نتايجك وحضورك بدون ما يعمل حساب:
            </p>
            <div className="flex gap-2">
              <input
                readOnly
                value={`${siteUrl}/follow/${studentCode}`}
                className="flex-1 bg-background border border-navy-border rounded-lg px-3 py-2 text-xs"
              />
              <button
                onClick={() =>
                  navigator.clipboard.writeText(`${siteUrl}/follow/${studentCode}`)
                }
                className="bg-gold text-background text-sm font-bold px-4 py-2 rounded-lg hover:bg-gold-light transition"
              >
                نسخ
              </button>
            </div>
          </div>
        )}

        {loading ? (
          <p className="text-zinc-500">جاري التحميل...</p>
        ) : exams.length === 0 ? (
          <p className="text-zinc-500">مفيش امتحانات منشورة دلوقتي.</p>
        ) : (
          <ul className="space-y-3">
            {exams.map((ex) => {
              const submission = getSubmission(ex.id)
              return (
                <li
                  key={ex.id}
                  className="flex items-center justify-between bg-navy-card border border-navy-border rounded-xl px-5 py-4"
                >
                  <div>
                    <p className="font-bold">{ex.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {subjects.find((s) => s.id === ex.subject_id)?.name} —{' '}
                      {ex.duration_minutes} دقيقة
                    </p>
                  </div>

                  {submission ? (
                    <span className="text-gold-light font-bold">
                      نتيجتك: {submission.score}%
                    </span>
                  ) : (
                    <Link
                      href={`/dashboard/student/exam/${ex.id}`}
                      className="bg-gold text-background font-bold px-5 py-2 rounded-lg hover:bg-gold-light transition"
                    >
                      ابدأ الامتحان
                    </Link>
                  )}
                </li>
              )
            })}
          </ul>
        )}
      </main>
    </div>
  )
}
