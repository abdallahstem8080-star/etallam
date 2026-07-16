'use client'

import { useEffect, useState, useRef } from 'react'
import { QRCodeCanvas } from 'qrcode.react'
import { createClient } from '@/lib/supabase/client'
import LogoutButton from '@/components/LogoutButton'

type Subject = { id: string; name: string }
type Profile = { id: string; name: string; email: string | null; role: string }
type Course = { id: string; title: string; subject_id: string }
type Group = { id: string; name: string; subject_id: string; studentCount: number }
type ExamRow = { id: string; title: string; submissionCount: number }

const sidebarItems = [
  { key: 'overview', label: 'الإحصائيات', icon: '📊' },
  { key: 'teachers', label: 'إدارة المدرسين', icon: '👨‍🏫' },
  { key: 'courses', label: 'الكورسات والدروس', icon: '📚' },
  { key: 'groups', label: 'المجموعات والجداول', icon: '🗓️' },
  { key: 'quizzes', label: 'الكويزات والـ QR', icon: '🧾' },
  { key: 'settings', label: 'الإعدادات', icon: '⚙️' },
] as const

type TabKey = typeof sidebarItems[number]['key']

export default function AdminDashboard() {
  const supabase = createClient()
  const [tab, setTab] = useState<TabKey>('overview')

  const [subjects, setSubjects] = useState<Subject[]>([])
  const [teachers, setTeachers] = useState<Profile[]>([])
  const [students, setStudents] = useState<Profile[]>([])
  const [courses, setCourses] = useState<Course[]>([])
  const [groups, setGroups] = useState<Group[]>([])
  const [exams, setExams] = useState<ExamRow[]>([])
  const [todayAttendancePct, setTodayAttendancePct] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)

  const [newSubject, setNewSubject] = useState('')
  const [qrExamId, setQrExamId] = useState<string | null>(null)
  const [siteUrl, setSiteUrl] = useState('')

  async function loadAll() {
    setLoading(true)
    setSiteUrl(window.location.origin)

    const { data: subs } = await supabase.from('subjects').select('id, name')
    setSubjects(subs ?? [])

    const { data: allProfiles } = await supabase
      .from('profiles')
      .select('id, name, email, role')
    setTeachers((allProfiles ?? []).filter((p) => p.role === 'teacher'))
    setStudents((allProfiles ?? []).filter((p) => p.role === 'student'))

    const { data: crs } = await supabase.from('courses').select('id, title, subject_id')
    setCourses(crs ?? [])

    const { data: grps } = await supabase.from('groups').select('id, name, subject_id')
    const groupsWithCount: Group[] = []
    for (const g of grps ?? []) {
      const { count } = await supabase
        .from('group_students')
        .select('id', { count: 'exact', head: true })
        .eq('group_id', g.id)
      groupsWithCount.push({ ...g, studentCount: count ?? 0 })
    }
    setGroups(groupsWithCount)

    const { data: exs } = await supabase
      .from('exams')
      .select('id, title')
      .eq('is_published', true)
    const examsWithCount: ExamRow[] = []
    for (const ex of exs ?? []) {
      const { count } = await supabase
        .from('submissions')
        .select('id', { count: 'exact', head: true })
        .eq('exam_id', ex.id)
      examsWithCount.push({ ...ex, submissionCount: count ?? 0 })
    }
    setExams(examsWithCount)

    // نسبة الحضور اليوم
    const today = new Date().toISOString().split('T')[0]
    const { data: todaySessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('session_date', today)
    if (todaySessions && todaySessions.length > 0) {
      const { data: att } = await supabase
        .from('attendance')
        .select('status')
        .in('session_id', todaySessions.map((s) => s.id))
      if (att && att.length > 0) {
        const present = att.filter((a) => a.status === 'present').length
        setTodayAttendancePct(Math.round((present / att.length) * 100))
      } else {
        setTodayAttendancePct(null)
      }
    } else {
      setTodayAttendancePct(null)
    }

    setLoading(false)
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addSubject(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubject.trim()) return
    await supabase.from('subjects').insert({ name: newSubject.trim() })
    setNewSubject('')
    loadAll()
  }

  async function deleteSubject(id: string) {
    if (!confirm('حذف المادة دي؟')) return
    await supabase.from('subjects').delete().eq('id', id)
    loadAll()
  }

  async function deleteProfile(id: string) {
    if (!confirm('حذف الحساب ده نهائيًا من قاعدة البيانات؟')) return
    await supabase.from('profiles').delete().eq('id', id)
    loadAll()
  }

  function downloadQr(examId: string) {
    const canvas = document.getElementById(`qr-${examId}`) as HTMLCanvasElement | null
    if (!canvas) return
    const url = canvas.toDataURL('image/png')
    const link = document.createElement('a')
    link.href = url
    link.download = `quiz-qr-${examId}.png`
    link.click()
  }

  return (
    <div className="min-h-screen flex bg-[#F3F4F6] text-[#1F2937]">
      {/* السايدبار */}
      <aside className="w-64 shrink-0 bg-white border-l border-gray-200 hidden md:flex flex-col">
        <div className="px-6 py-5 border-b border-gray-200">
          <span className="text-xl font-bold text-[#990033]">اتعلم</span>
          <p className="text-xs text-gray-400 mt-1">لوحة التحكم والإدارة</p>
        </div>
        <nav className="flex-1 px-3 py-4 space-y-1">
          {sidebarItems.map((item) => (
            <button
              key={item.key}
              onClick={() => setTab(item.key)}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm text-right transition ${
                tab === item.key
                  ? 'bg-[#990033]/10 text-[#990033] font-bold'
                  : 'text-gray-600 hover:bg-gray-50'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          ))}
        </nav>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        {/* الهيدر */}
        <header className="flex items-center justify-between px-6 py-4 bg-white border-b border-gray-200">
          <h1 className="text-lg font-bold">
            {sidebarItems.find((s) => s.key === tab)?.label}
          </h1>
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-500">👤 أدمن</span>
            <LogoutButton />
          </div>
        </header>

        <main className="flex-1 p-6 overflow-y-auto">
          {loading ? (
            <p className="text-gray-400">جاري التحميل...</p>
          ) : (
            <>
              {tab === 'overview' && (
                <div>
                  <div className="flex gap-3 mb-6 flex-wrap">
                    <button
                      onClick={() => setTab('teachers')}
                      className="bg-[#990033] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#7a0029] transition"
                    >
                      + إضافة مدرس جديد
                    </button>
                    <button
                      onClick={() => setTab('courses')}
                      className="bg-[#990033] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#7a0029] transition"
                    >
                      + إنشاء كورس جديد
                    </button>
                    <button
                      onClick={() => setTab('groups')}
                      className="bg-[#990033] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#7a0029] transition"
                    >
                      + مجموعة جديدة
                    </button>
                  </div>

                  <p className="text-sm text-gray-500 mb-3">📊 نظرة عامة على المنصة اليوم:</p>
                  <div className="grid sm:grid-cols-3 gap-4 mb-8">
                    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                      <p className="text-xs text-gray-400 mb-1">إجمالي الطلاب</p>
                      <p className="text-2xl font-extrabold text-[#990033]">
                        {students.length} طالب
                      </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                      <p className="text-xs text-gray-400 mb-1">الكورسات النشطة</p>
                      <p className="text-2xl font-extrabold text-[#990033]">
                        {courses.length} كورس
                      </p>
                    </div>
                    <div className="bg-white rounded-xl border border-gray-200 p-5 text-center">
                      <p className="text-xs text-gray-400 mb-1">نسبة حضور اليوم</p>
                      <p className="text-2xl font-extrabold text-[#990033]">
                        {todayAttendancePct !== null ? `${todayAttendancePct}%` : '—'}
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {tab === 'teachers' && (
                <div>
                  <div className="bg-white border border-gray-200 rounded-xl p-5 mb-6">
                    <p className="text-sm text-gray-600 mb-3">
                      عشان تضيف مدرس جديد، ابعتله رابط التسجيل ده، وهيظهرلك تلقائيًا في الليستة تحت بعد ما يسجل:
                    </p>
                    <div className="flex gap-2">
                      <input
                        readOnly
                        value={`${siteUrl}/signup`}
                        className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm"
                      />
                      <button
                        onClick={() => navigator.clipboard.writeText(`${siteUrl}/signup`)}
                        className="bg-[#990033] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#7a0029] transition"
                      >
                        نسخ الرابط
                      </button>
                    </div>
                  </div>

                  <ul className="space-y-2">
                    {teachers.map((t) => (
                      <li
                        key={t.id}
                        className="flex justify-between items-center bg-white border border-gray-200 rounded-lg px-4 py-3"
                      >
                        <div>
                          <p className="font-medium">{t.name}</p>
                          <p className="text-xs text-gray-400">{t.email}</p>
                        </div>
                        <button
                          onClick={() => deleteProfile(t.id)}
                          className="text-red-600 hover:text-red-500 text-sm"
                        >
                          حذف
                        </button>
                      </li>
                    ))}
                    {teachers.length === 0 && (
                      <p className="text-gray-400 text-sm">مفيش معلمين مسجلين لسه.</p>
                    )}
                  </ul>
                </div>
              )}

              {tab === 'courses' && (
                <ul className="space-y-2">
                  {courses.map((c) => (
                    <li
                      key={c.id}
                      className="bg-white border border-gray-200 rounded-lg px-4 py-3"
                    >
                      <p className="font-medium">{c.title}</p>
                      <p className="text-xs text-gray-400">
                        {subjects.find((s) => s.id === c.subject_id)?.name}
                      </p>
                    </li>
                  ))}
                  {courses.length === 0 && (
                    <p className="text-gray-400 text-sm">مفيش كورسات لسه.</p>
                  )}
                </ul>
              )}

              {tab === 'groups' && (
                <div className="space-y-4">
                  {groups.map((g) => (
                    <div
                      key={g.id}
                      className="bg-white border border-gray-200 rounded-xl p-5"
                    >
                      <p className="font-bold mb-1">{g.name}</p>
                      <p className="text-xs text-gray-400 mb-3">
                        {subjects.find((s) => s.id === g.subject_id)?.name} — 👥 {g.studentCount} طالب
                      </p>
                      <div className="flex gap-3 flex-wrap">
                        <span className="bg-green-50 text-green-700 text-sm font-medium px-4 py-2 rounded-lg">
                          🟢 تسجيل الحضور من لوحة المعلم بتاع المجموعة
                        </span>
                      </div>
                    </div>
                  ))}
                  {groups.length === 0 && (
                    <p className="text-gray-400 text-sm">مفيش مجموعات لسه.</p>
                  )}
                </div>
              )}

              {tab === 'quizzes' && (
                <div className="space-y-3">
                  {exams.map((ex) => (
                    <div
                      key={ex.id}
                      className="bg-white border border-gray-200 rounded-xl p-4 flex flex-wrap items-center justify-between gap-3"
                    >
                      <span className="font-medium">{ex.title}</span>
                      <div className="flex items-center gap-3">
                        <button
                          onClick={() => setQrExamId(qrExamId === ex.id ? null : ex.id)}
                          className="bg-[#FF4D6D] text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-[#e6416099] transition"
                        >
                          📱 توليد كود QR
                        </button>
                        <span className="text-sm text-gray-500">
                          📊 {ex.submissionCount} نتيجة لحظيًا
                        </span>
                      </div>

                      {qrExamId === ex.id && (
                        <div className="w-full flex flex-col items-center gap-3 pt-4 border-t border-gray-200 mt-2">
                          <QRCodeCanvas
                            id={`qr-${ex.id}`}
                            value={`${siteUrl}/dashboard/student/exam/${ex.id}`}
                            size={180}
                          />
                          <button
                            onClick={() => downloadQr(ex.id)}
                            className="text-sm text-[#990033] hover:underline"
                          >
                            📥 تحميل صورة الـ QR
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {exams.length === 0 && (
                    <p className="text-gray-400 text-sm">مفيش كويزات منشورة لسه.</p>
                  )}
                </div>
              )}

              {tab === 'settings' && (
                <div className="max-w-md">
                  <h3 className="font-bold mb-3">إدارة المواد الدراسية</h3>
                  <form onSubmit={addSubject} className="flex gap-3 mb-6">
                    <input
                      type="text"
                      placeholder="اسم المادة الجديدة"
                      value={newSubject}
                      onChange={(e) => setNewSubject(e.target.value)}
                      className="flex-1 bg-white border border-gray-200 rounded-lg px-4 py-2"
                    />
                    <button
                      type="submit"
                      className="bg-[#990033] text-white font-bold px-6 py-2 rounded-lg hover:bg-[#7a0029] transition"
                    >
                      إضافة
                    </button>
                  </form>
                  <ul className="space-y-2">
                    {subjects.map((s) => (
                      <li
                        key={s.id}
                        className="flex items-center justify-between bg-white border border-gray-200 rounded-lg px-4 py-3"
                      >
                        <span>{s.name}</span>
                        <button
                          onClick={() => deleteSubject(s.id)}
                          className="text-red-600 hover:text-red-500 text-sm"
                        >
                          حذف
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}
