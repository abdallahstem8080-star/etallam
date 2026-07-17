'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Report = {
  student_name: string
  exams: { title: string; score: number; date: string }[]
  attendance: { group_name: string; date: string; status: string }[]
}

export default function FollowStudentPage() {
  const { code } = useParams<{ code: string }>()
  const supabase = createClient()

  const [phone, setPhone] = useState('')
  const [report, setReport] = useState<Report | null>(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: rpcError } = await supabase.rpc('follow_student', {
      p_code: code,
      p_phone: phone.trim(),
    })

    setLoading(false)

    if (rpcError) {
      setError(rpcError.message)
      return
    }

    setReport(data as Report)
  }

  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground px-4 py-10">
      <Link href="/" className="text-2xl font-bold text-gold text-center mb-8">
        اتعلم
      </Link>

      {!report ? (
        <div className="w-full max-w-sm mx-auto bg-navy-card border border-navy-border rounded-xl p-8">
          <h1 className="text-lg font-bold text-center mb-1">متابعة سريعة بدون حساب</h1>
          <p className="text-center text-zinc-500 text-sm mb-6">
            أدخل رقم الهاتف المسجل لدى الطالب للمتابعة
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              type="tel"
              required
              placeholder="رقم الهاتف"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-background border border-navy-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
            />
            {error && <p className="text-red-600 text-sm">{error}</p>}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gold text-background rounded-lg py-2 font-bold hover:bg-gold-light transition disabled:opacity-50"
            >
              {loading ? 'جاري التحقق...' : 'عرض المتابعة'}
            </button>
          </form>
        </div>
      ) : (
        <div className="w-full max-w-lg mx-auto space-y-8">
          <h1 className="text-xl font-bold text-center">تقرير متابعة: {report.student_name}</h1>

          <div>
            <h2 className="font-bold mb-3">نتائج الامتحانات</h2>
            {report.exams.length === 0 ? (
              <p className="text-zinc-500 text-sm">مفيش نتايج امتحانات لسه.</p>
            ) : (
              <ul className="space-y-2">
                {report.exams.map((ex, i) => (
                  <li
                    key={i}
                    className="flex justify-between bg-navy-card border border-navy-border rounded-lg px-4 py-3 text-sm"
                  >
                    <span>{ex.title}</span>
                    <span className="text-gold-light font-bold">{ex.score}%</span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div>
            <h2 className="font-bold mb-3">سجل الحضور</h2>
            {report.attendance.length === 0 ? (
              <p className="text-zinc-500 text-sm">مفيش سجل حضور لسه.</p>
            ) : (
              <ul className="space-y-2">
                {report.attendance.map((a, i) => (
                  <li
                    key={i}
                    className="flex justify-between bg-navy-card border border-navy-border rounded-lg px-4 py-3 text-sm"
                  >
                    <span>
                      {a.group_name} — {a.date}
                    </span>
                    <span className={a.status === 'present' ? 'text-green-600' : 'text-red-600'}>
                      {a.status === 'present' ? 'حاضر 🟢' : 'غائب 🔴'}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
