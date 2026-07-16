'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

type Subject = { id: string; name: string }
type Question = {
  id: string
  subject_id: string
  text: string
  choices: string[]
  correct_answer: number
}
type Exam = {
  id: string
  title: string
  subject_id: string
  duration_minutes: number
  is_published: boolean
}
type Course = {
  id: string
  title: string
  description: string | null
  subject_id: string
}

export default function TeacherDashboard() {
  const supabase = createClient()
  const [tab, setTab] = useState<'questions' | 'exams' | 'courses'>('questions')
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [questions, setQuestions] = useState<Question[]>([])
  const [exams, setExams] = useState<Exam[]>([])
  const [selectedSubject, setSelectedSubject] = useState('')

  const [courses, setCourses] = useState<Course[]>([])
  const [courseTitle, setCourseTitle] = useState('')
  const [courseDesc, setCourseDesc] = useState('')
  const [courseSubject, setCourseSubject] = useState('')
  const [pendingCount, setPendingCount] = useState<Record<string, number>>({})

  const [qText, setQText] = useState('')
  const [choices, setChoices] = useState(['', '', '', ''])
  const [correctAnswer, setCorrectAnswer] = useState(0)

  const [examTitle, setExamTitle] = useState('')
  const [examDuration, setExamDuration] = useState(30)
  const [examSubject, setExamSubject] = useState('')
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])

  async function loadAll() {
    const { data: subs } = await supabase.from('subjects').select('id, name')
    setSubjects(subs ?? [])
    if (subs && subs.length && !selectedSubject) {
      setSelectedSubject(subs[0].id)
      setExamSubject(subs[0].id)
      setCourseSubject(subs[0].id)
    }

    const { data: qs } = await supabase
      .from('questions')
      .select('id, subject_id, text, choices, correct_answer')
    setQuestions(qs ?? [])

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: ex } = await supabase
      .from('exams')
      .select('id, title, subject_id, duration_minutes, is_published')
      .eq('teacher_id', user?.id)
    setExams(ex ?? [])

    const { data: crs } = await supabase
      .from('courses')
      .select('id, title, description, subject_id')
      .eq('teacher_id', user?.id)
    setCourses(crs ?? [])

    if (crs && crs.length > 0) {
      const { data: pending } = await supabase
        .from('course_subscriptions')
        .select('course_id')
        .in(
          'course_id',
          crs.map((c) => c.id)
        )
        .eq('status', 'pending')

      const counts: Record<string, number> = {}
      ;(pending ?? []).forEach((p) => {
        counts[p.course_id] = (counts[p.course_id] ?? 0) + 1
      })
      setPendingCount(counts)
    }
  }

  async function createCourse(e: React.FormEvent) {
    e.preventDefault()
    if (!courseTitle.trim() || !courseSubject) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('courses').insert({
      title: courseTitle.trim(),
      description: courseDesc.trim() || null,
      subject_id: courseSubject,
      teacher_id: user?.id,
    })

    setCourseTitle('')
    setCourseDesc('')
    loadAll()
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function addQuestion(e: React.FormEvent) {
    e.preventDefault()
    if (!qText.trim() || choices.some((c) => !c.trim()) || !selectedSubject) return

    await supabase.from('questions').insert({
      subject_id: selectedSubject,
      text: qText.trim(),
      choices,
      correct_answer: correctAnswer,
    })

    setQText('')
    setChoices(['', '', '', ''])
    setCorrectAnswer(0)
    loadAll()
  }

  async function deleteQuestion(id: string) {
    if (!confirm('حذف السؤال ده؟')) return
    await supabase.from('questions').delete().eq('id', id)
    loadAll()
  }

  async function createExam(e: React.FormEvent) {
    e.preventDefault()
    if (!examTitle.trim() || !examSubject) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    const { data: exam, error } = await supabase
      .from('exams')
      .insert({
        title: examTitle.trim(),
        subject_id: examSubject,
        duration_minutes: examDuration,
        teacher_id: user?.id,
        is_published: false,
      })
      .select()
      .single()

    if (error || !exam) return

    if (selectedQuestionIds.length > 0) {
      await supabase.from('exam_questions').insert(
        selectedQuestionIds.map((qid) => ({ exam_id: exam.id, question_id: qid }))
      )
    }

    setExamTitle('')
    setSelectedQuestionIds([])
    loadAll()
  }

  async function togglePublish(exam: Exam) {
    await supabase.from('exams').update({ is_published: !exam.is_published }).eq('id', exam.id)
    loadAll()
  }

  const subjectQuestions = questions.filter((q) => q.subject_id === examSubject)

  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
      <DashboardHeader title="لوحة تحكم المعلم" subtitle="Teacher" />

      <main className="flex-1 px-6 sm:px-12 py-10 max-w-4xl mx-auto w-full">
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab('questions')}
            className={`px-5 py-2 rounded-lg text-sm border transition ${
              tab === 'questions'
                ? 'bg-gold text-background border-gold font-bold'
                : 'border-navy-border text-zinc-500'
            }`}
          >
            بنك الأسئلة
          </button>
          <button
            onClick={() => setTab('exams')}
            className={`px-5 py-2 rounded-lg text-sm border transition ${
              tab === 'exams'
                ? 'bg-gold text-background border-gold font-bold'
                : 'border-navy-border text-zinc-500'
            }`}
          >
            الامتحانات
          </button>
          <button
            onClick={() => setTab('courses')}
            className={`px-5 py-2 rounded-lg text-sm border transition ${
              tab === 'courses'
                ? 'bg-gold text-background border-gold font-bold'
                : 'border-navy-border text-zinc-500'
            }`}
          >
            الكورسات
          </button>
        </div>

        {tab === 'questions' && (
          <div>
            <h2 className="text-xl font-bold mb-4">إضافة سؤال جديد</h2>
            <form
              onSubmit={addQuestion}
              className="bg-navy-card border border-navy-border rounded-xl p-6 space-y-4 mb-8"
            >
              <div>
                <label className="block text-sm mb-1 text-zinc-700">المادة</label>
                <select
                  value={selectedSubject}
                  onChange={(e) => setSelectedSubject(e.target.value)}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm mb-1 text-zinc-700">نص السؤال</label>
                <textarea
                  value={qText}
                  onChange={(e) => setQText(e.target.value)}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                  rows={2}
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm mb-1 text-zinc-700">
                  الاختيارات (حدد الإجابة الصح)
                </label>
                {choices.map((c, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <input
                      type="radio"
                      name="correct"
                      checked={correctAnswer === i}
                      onChange={() => setCorrectAnswer(i)}
                      className="accent-yellow-500"
                    />
                    <input
                      type="text"
                      value={c}
                      onChange={(e) => {
                        const newChoices = [...choices]
                        newChoices[i] = e.target.value
                        setChoices(newChoices)
                      }}
                      placeholder={`اختيار ${i + 1}`}
                      className="flex-1 bg-background border border-navy-border rounded-lg px-3 py-2"
                    />
                  </div>
                ))}
              </div>

              <button
                type="submit"
                className="bg-gold text-background font-bold px-6 py-2 rounded-lg hover:bg-gold-light transition"
              >
                إضافة السؤال
              </button>
            </form>

            <h3 className="text-lg font-bold mb-3">الأسئلة الموجودة</h3>
            <ul className="space-y-2">
              {questions.map((q) => (
                <li
                  key={q.id}
                  className="bg-navy-card border border-navy-border rounded-lg px-4 py-3 flex justify-between items-start"
                >
                  <div>
                    <p className="font-medium">{q.text}</p>
                    <p className="text-xs text-zinc-500 mt-1">
                      {subjects.find((s) => s.id === q.subject_id)?.name}
                    </p>
                  </div>
                  <button
                    onClick={() => deleteQuestion(q.id)}
                    className="text-red-600 hover:text-red-300 text-sm"
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'exams' && (
          <div>
            <h2 className="text-xl font-bold mb-4">إنشاء امتحان جديد</h2>
            <form
              onSubmit={createExam}
              className="bg-navy-card border border-navy-border rounded-xl p-6 space-y-4 mb-8"
            >
              <div>
                <label className="block text-sm mb-1 text-zinc-700">عنوان الامتحان</label>
                <input
                  type="text"
                  value={examTitle}
                  onChange={(e) => setExamTitle(e.target.value)}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-zinc-700">المادة</label>
                  <select
                    value={examSubject}
                    onChange={(e) => {
                      setExamSubject(e.target.value)
                      setSelectedQuestionIds([])
                    }}
                    className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                  >
                    {subjects.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-zinc-700">المدة (دقيقة)</label>
                  <input
                    type="number"
                    value={examDuration}
                    onChange={(e) => setExamDuration(Number(e.target.value))}
                    className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-700">
                  اختر الأسئلة من بنك أسئلة المادة دي
                </label>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {subjectQuestions.length === 0 && (
                    <p className="text-zinc-500 text-sm">مفيش أسئلة لسه في المادة دي</p>
                  )}
                  {subjectQuestions.map((q) => (
                    <label
                      key={q.id}
                      className="flex items-center gap-2 bg-background border border-navy-border rounded-lg px-3 py-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.includes(q.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQuestionIds([...selectedQuestionIds, q.id])
                          } else {
                            setSelectedQuestionIds(
                              selectedQuestionIds.filter((id) => id !== q.id)
                            )
                          }
                        }}
                      />
                      <span className="text-sm">{q.text}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="bg-gold text-background font-bold px-6 py-2 rounded-lg hover:bg-gold-light transition"
              >
                إنشاء الامتحان (كمسودة)
              </button>
            </form>

            <h3 className="text-lg font-bold mb-3">امتحاناتي</h3>
            <ul className="space-y-2">
              {exams.map((ex) => (
                <li
                  key={ex.id}
                  className="bg-navy-card border border-navy-border rounded-lg px-4 py-3 flex justify-between items-center"
                >
                  <div>
                    <p className="font-medium">{ex.title}</p>
                    <p className="text-xs text-zinc-500">
                      {ex.duration_minutes} دقيقة —{' '}
                      {ex.is_published ? (
                        <span className="text-green-600">منشور</span>
                      ) : (
                        <span className="text-zinc-500">مسودة</span>
                      )}
                    </p>
                  </div>
                  <button
                    onClick={() => togglePublish(ex)}
                    className={`text-sm px-4 py-1.5 rounded-lg border transition ${
                      ex.is_published
                        ? 'border-navy-border text-zinc-500'
                        : 'bg-gold text-background border-gold font-bold'
                    }`}
                  >
                    {ex.is_published ? 'إلغاء النشر' : 'نشر'}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'courses' && (
          <div>
            <h2 className="text-xl font-bold mb-4">إنشاء كورس جديد</h2>
            <form
              onSubmit={createCourse}
              className="bg-navy-card border border-navy-border rounded-xl p-6 space-y-4 mb-8"
            >
              <div>
                <label className="block text-sm mb-1 text-zinc-700">اسم الكورس</label>
                <input
                  type="text"
                  value={courseTitle}
                  onChange={(e) => setCourseTitle(e.target.value)}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-zinc-700">وصف مختصر</label>
                <textarea
                  value={courseDesc}
                  onChange={(e) => setCourseDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-zinc-700">المادة</label>
                <select
                  value={courseSubject}
                  onChange={(e) => setCourseSubject(e.target.value)}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                >
                  {subjects.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </div>
              <button
                type="submit"
                className="bg-gold text-background font-bold px-6 py-2 rounded-lg hover:bg-gold-light transition"
              >
                إنشاء الكورس
              </button>
            </form>

            <h3 className="text-lg font-bold mb-3">كورساتي</h3>
            <ul className="space-y-2">
              {courses.map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between items-center bg-navy-card border border-navy-border rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{c.title}</p>
                    <p className="text-xs text-zinc-500">
                      {subjects.find((s) => s.id === c.subject_id)?.name}
                    </p>
                  </div>
                  <Link
                    href={`/dashboard/teacher/course/${c.id}`}
                    className="text-sm bg-gold text-background font-bold px-4 py-1.5 rounded-lg hover:bg-gold-light transition relative"
                  >
                    إدارة الكورس
                    {pendingCount[c.id] > 0 && (
                      <span className="absolute -top-2 -left-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                        {pendingCount[c.id]}
                      </span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}
