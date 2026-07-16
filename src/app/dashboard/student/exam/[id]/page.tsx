'use client'

import { useEffect, useState, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

type Question = {
  id: string
  text: string
  image_url: string | null
  choices: string[]
}

export default function TakeExamPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [questions, setQuestions] = useState<Question[]>([])
  const [answers, setAnswers] = useState<Record<string, number>>({})
  const [tabSwitches, setTabSwitches] = useState(0)
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [result, setResult] = useState<number | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data, error } = await supabase.rpc('get_exam_questions', {
        p_exam_id: id,
      })
      if (error) {
        setError('الامتحان غير متاح')
      } else {
        setQuestions(data ?? [])
      }
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  // رصد خروج الطالب من التبويب أثناء الامتحان
  useEffect(() => {
    function handleVisibility() {
      if (document.visibilityState === 'hidden') {
        setTabSwitches((prev) => prev + 1)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    return () => document.removeEventListener('visibilitychange', handleVisibility)
  }, [])

  const handleSubmit = useCallback(async () => {
    setSubmitting(true)
    const { data, error } = await supabase.rpc('submit_exam', {
      p_exam_id: id,
      p_answers: answers,
      p_tab_switches: tabSwitches,
    })

    setSubmitting(false)

    if (error) {
      setError(error.message)
      return
    }

    setResult(data as number)
  }, [answers, id, supabase, tabSwitches])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
        <DashboardHeader title="الامتحان" subtitle="Student" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500">جاري تحميل الامتحان...</p>
        </main>
      </div>
    )
  }

  if (error && result === null) {
    return (
      <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
        <DashboardHeader title="الامتحان" subtitle="Student" />
        <main className="flex-1 flex items-center justify-center px-4">
          <p className="text-red-600 text-center">{error}</p>
        </main>
      </div>
    )
  }

  if (result !== null) {
    return (
      <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
        <DashboardHeader title="الامتحان" subtitle="Student" />
        <main className="flex-1 flex flex-col items-center justify-center px-4 gap-6">
          <p className="text-zinc-500">تم تسليم الامتحان بنجاح</p>
          <p className="text-5xl font-extrabold text-gold-light">{result}%</p>
          <button
            onClick={() => router.push('/dashboard/student')}
            className="bg-gold text-background font-bold px-6 py-2 rounded-lg hover:bg-gold-light transition"
          >
            العودة للوحة التحكم
          </button>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
      <DashboardHeader title="الامتحان" subtitle="Student" />

      <main className="flex-1 px-6 sm:px-12 py-10 max-w-2xl mx-auto w-full">
        <div className="space-y-6 mb-10">
          {questions.map((q, i) => (
            <div
              key={q.id}
              className="bg-navy-card border border-navy-border rounded-xl p-6"
            >
              <p className="font-bold mb-4">
                {i + 1}. {q.text}
              </p>
              {q.image_url && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={q.image_url} alt="" className="rounded-lg mb-4 max-h-60" />
              )}
              <div className="space-y-2">
                {q.choices.map((choice, ci) => (
                  <label
                    key={ci}
                    className="flex items-center gap-2 bg-background border border-navy-border rounded-lg px-3 py-2 cursor-pointer"
                  >
                    <input
                      type="radio"
                      name={q.id}
                      checked={answers[q.id] === ci}
                      onChange={() => setAnswers({ ...answers, [q.id]: ci })}
                    />
                    <span className="text-sm">{choice}</span>
                  </label>
                ))}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={handleSubmit}
          disabled={submitting || Object.keys(answers).length !== questions.length}
          className="w-full bg-gold text-background font-bold py-3 rounded-lg hover:bg-gold-light transition disabled:opacity-50"
        >
          {submitting ? 'جاري التسليم...' : 'تسليم الامتحان'}
        </button>
      </main>
    </div>
  )
}
