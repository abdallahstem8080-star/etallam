'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

type Course = {
  id: string
  title: string
  description: string | null
  subject_id: string
}
type Subject = { id: string; name: string }
type Subscription = { course_id: string; status: string }

export default function CoursesPage() {
  const supabase = createClient()
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [loading, setLoading] = useState(true)

  async function loadAll() {
    setLoading(true)
    const { data: crs } = await supabase
      .from('courses')
      .select('id, title, description, subject_id')
    setCourses(crs ?? [])

    const { data: subs } = await supabase.from('subjects').select('id, name')
    setSubjects(subs ?? [])

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: mySubs } = await supabase
      .from('course_subscriptions')
      .select('course_id, status')
      .eq('student_id', user?.id)
    setSubscriptions(mySubs ?? [])

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
  }, [])

  async function requestSubscription(courseId: string) {
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('course_subscriptions').insert({
      course_id: courseId,
      student_id: user?.id,
      status: 'pending',
    })
    loadAll()
  }

  function getStatus(courseId: string) {
    return subscriptions.find((s) => s.course_id === courseId)?.status
  }

  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
      <DashboardHeader title="الكورسات" subtitle="Student" />

      <main className="flex-1 px-6 sm:px-12 py-10 max-w-3xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-6">الكورسات المتاحة</h2>

        {loading ? (
          <p className="text-zinc-500">جاري التحميل...</p>
        ) : courses.length === 0 ? (
          <p className="text-zinc-500">مفيش كورسات متاحة دلوقتي.</p>
        ) : (
          <ul className="space-y-3">
            {courses.map((c) => {
              const status = getStatus(c.id)
              return (
                <li
                  key={c.id}
                  className="flex items-center justify-between bg-navy-card border border-navy-border rounded-xl px-5 py-4"
                >
                  <div>
                    <p className="font-bold">{c.title}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {subjects.find((s) => s.id === c.subject_id)?.name}
                    </p>
                    {c.description && (
                      <p className="text-sm text-zinc-400 mt-1">{c.description}</p>
                    )}
                  </div>

                  {status === 'approved' ? (
                    <Link
                      href={`/dashboard/student/course/${c.id}`}
                      className="bg-gold text-background font-bold px-5 py-2 rounded-lg hover:bg-gold-light transition"
                    >
                      ادخل الكورس
                    </Link>
                  ) : status === 'pending' ? (
                    <span className="text-zinc-400 text-sm">طلبك قيد المراجعة</span>
                  ) : status === 'rejected' ? (
                    <span className="text-red-400 text-sm">تم رفض الطلب</span>
                  ) : (
                    <button
                      onClick={() => requestSubscription(c.id)}
                      className="border border-gold text-gold px-5 py-2 rounded-lg hover:bg-gold hover:text-background transition"
                    >
                      اشتراك
                    </button>
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
