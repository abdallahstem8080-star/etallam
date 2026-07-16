'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

type Student = { id: string; name: string; student_code: string }
type Submission = {
  id: string
  exam_id: string
  score: number
  submitted_at: string
}
type Exam = { id: string; title: string }
type AttendanceRecord = { status: string; session_date: string; group_name: string }

export default function ParentDashboard() {
  const supabase = createClient()
  const [code, setCode] = useState('')
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [students, setStudents] = useState<Student[]>([])
  const [submissionsByStudent, setSubmissionsByStudent] = useState<
    Record<string, Submission[]>
  >({})
  const [exams, setExams] = useState<Exam[]>([])
  const [attendanceByStudent, setAttendanceByStudent] = useState<
    Record<string, AttendanceRecord[]>
  >({})
  const [loading, setLoading] = useState(true)

  async function loadChildren() {
    setLoading(true)
    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: links } = await supabase
      .from('parent_student_links')
      .select('student_id')
      .eq('parent_id', user?.id)

    const studentIds = (links ?? []).map((l) => l.student_id)

    if (studentIds.length === 0) {
      setStudents([])
      setLoading(false)
      return
    }

    const { data: profs } = await supabase
      .from('profiles')
      .select('id, name, student_code')
      .in('id', studentIds)
    setStudents(profs ?? [])

    const { data: subs } = await supabase
      .from('submissions')
      .select('id, exam_id, score, submitted_at, student_id')
      .in('student_id', studentIds)

    const grouped: Record<string, Submission[]> = {}
    ;(subs ?? []).forEach((s) => {
      if (!grouped[s.student_id]) grouped[s.student_id] = []
      grouped[s.student_id].push(s)
    })
    setSubmissionsByStudent(grouped)

    const examIds = [...new Set((subs ?? []).map((s) => s.exam_id))]
    if (examIds.length > 0) {
      const { data: exs } = await supabase
        .from('exams')
        .select('id, title')
        .in('id', examIds)
      setExams(exs ?? [])
    }

    const attMap: Record<string, AttendanceRecord[]> = {}
    for (const sid of studentIds) {
      const { data: att } = await supabase
        .from('attendance')
        .select('status, session_id')
        .eq('student_id', sid)

      if (att && att.length > 0) {
        const { data: sessionsData } = await supabase
          .from('sessions')
          .select('id, session_date, group_id')
          .in('id', att.map((a) => a.session_id))

        const groupIds = [...new Set((sessionsData ?? []).map((s) => s.group_id))]
        const { data: groupsData } = await supabase
          .from('groups')
          .select('id, name')
          .in('id', groupIds)

        attMap[sid] = att.map((a) => {
          const session = sessionsData?.find((s) => s.id === a.session_id)
          const group = groupsData?.find((g) => g.id === session?.group_id)
          return {
            status: a.status,
            session_date: session?.session_date ?? '',
            group_name: group?.name ?? '',
          }
        })
      } else {
        attMap[sid] = []
      }
    }
    setAttendanceByStudent(attMap)

    setLoading(false)
  }

  useEffect(() => {
    loadChildren()
  }, [])

  async function handleLink(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setSuccess('')

    const { data, error } = await supabase.rpc('link_student', { p_code: code.trim() })

    if (error) {
      setError(error.message)
      return
    }

    setSuccess(`تم ربط الطالب: ${data}`)
    setCode('')
    loadChildren()
  }

  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
      <DashboardHeader title="لوحة تحكم ولي الأمر" subtitle="Parent" />

      <main className="flex-1 px-6 sm:px-12 py-10 max-w-2xl mx-auto w-full">
        <h2 className="text-xl font-bold mb-4">ربط حساب طالب</h2>
        <form onSubmit={handleLink} className="flex gap-3 mb-4">
          <input
            type="text"
            placeholder="كود الطالب (مثال: ET-1234)"
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="flex-1 bg-navy-card border border-navy-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <button
            type="submit"
            className="bg-gold text-background font-bold px-6 py-2 rounded-lg hover:bg-gold-light transition"
          >
            ربط
          </button>
        </form>
        {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
        {success && <p className="text-green-600 text-sm mb-4">{success}</p>}

        <h2 className="text-xl font-bold mb-4 mt-10">أبنائي</h2>

        {loading ? (
          <p className="text-zinc-500">جاري التحميل...</p>
        ) : students.length === 0 ? (
          <p className="text-zinc-500">
            مفيش طلاب مربوطين لسه. اطلب كود الطالب من ابنك (موجود في حسابه) وحطه فوق.
          </p>
        ) : (
          <div className="space-y-6">
            {students.map((st) => (
              <div
                key={st.id}
                className="bg-navy-card border border-navy-border rounded-xl p-5"
              >
                <div className="flex justify-between items-center mb-3">
                  <p className="font-bold">{st.name}</p>
                  <span className="text-xs text-zinc-500">كود: {st.student_code}</span>
                </div>

                {(submissionsByStudent[st.id] ?? []).length === 0 ? (
                  <p className="text-sm text-zinc-500">مفيش نتايج امتحانات لسه.</p>
                ) : (
                  <ul className="space-y-2 mb-4">
                    {submissionsByStudent[st.id].map((sub) => (
                      <li
                        key={sub.id}
                        className="flex justify-between text-sm border-t border-navy-border pt-2"
                      >
                        <span className="text-zinc-700">
                          {exams.find((e) => e.id === sub.exam_id)?.title ?? 'امتحان'}
                        </span>
                        <span className="text-gold-light font-bold">{sub.score}%</span>
                      </li>
                    ))}
                  </ul>
                )}

                {(attendanceByStudent[st.id] ?? []).length > 0 && (
                  <div>
                    <p className="text-xs text-zinc-500 mb-2 mt-3">سجل الحضور</p>
                    <ul className="space-y-1">
                      {attendanceByStudent[st.id].slice(0, 5).map((a, i) => (
                        <li
                          key={i}
                          className="flex justify-between text-xs border-t border-navy-border pt-1.5"
                        >
                          <span className="text-zinc-500">
                            {a.group_name} — {a.session_date}
                          </span>
                          <span
                            className={
                              a.status === 'present' ? 'text-green-600' : 'text-red-600'
                            }
                          >
                            {a.status === 'present' ? 'حاضر 🟢' : 'غائب 🔴'}
                          </span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
