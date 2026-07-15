'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

function generateStudentCode() {
  const num = Math.floor(1000 + Math.random() * 9000)
  return `ET-${num}`
}

export default function SignupPage() {
  const router = useRouter()
  const supabase = createClient()

  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [password, setPassword] = useState('')
  const [role, setRole] = useState<'student' | 'teacher' | 'parent'>('student')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error: signUpError } = await supabase.auth.signUp({
      email,
      password,
    })

    if (signUpError || !data.user) {
      setError(signUpError?.message || 'حدث خطأ أثناء إنشاء الحساب')
      setLoading(false)
      return
    }

    const profileData: Record<string, unknown> = {
      id: data.user.id,
      name,
      role,
      email,
      phone,
    }

    if (role === 'student') {
      profileData.student_code = generateStudentCode()
    }

    const { error: profileError } = await supabase.from('profiles').insert(profileData)

    setLoading(false)

    if (profileError) {
      setError('تم إنشاء الحساب لكن حدث خطأ في حفظ البيانات: ' + profileError.message)
      return
    }

    router.push(`/dashboard/${role}`)
  }

  return (
    <div className="min-h-screen flex flex-col flex-1 items-center justify-center bg-background text-foreground px-4 py-10">
      <Link href="/" className="text-2xl font-bold text-gold-light mb-8">
        اتعلم
      </Link>

      <div className="w-full max-w-sm bg-navy-card border border-navy-border rounded-xl shadow-lg p-8">
        <h1 className="text-xl font-bold text-center mb-1">إنشاء حساب جديد</h1>
        <p className="text-center text-zinc-400 text-sm mb-6">انضم للمنصة الآن</p>

        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-300">نوع الحساب</label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { value: 'student', label: 'طالب' },
                { value: 'teacher', label: 'معلم' },
                { value: 'parent', label: 'ولي أمر' },
              ].map((opt) => (
                <button
                  type="button"
                  key={opt.value}
                  onClick={() => setRole(opt.value as typeof role)}
                  className={`py-2 rounded-lg text-sm border transition ${
                    role === opt.value
                      ? 'bg-gold text-background border-gold font-bold'
                      : 'border-navy-border text-zinc-400'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-300">الاسم</label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full bg-background border border-navy-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-300">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-navy-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-300">
              رقم الهاتف (اختياري)
            </label>
            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="w-full bg-background border border-navy-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-300">كلمة المرور</label>
            <input
              type="password"
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-navy-border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          {error && <p className="text-red-400 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-background rounded-lg py-2 font-bold hover:bg-gold-light transition disabled:opacity-50"
          >
            {loading ? 'جاري الإنشاء...' : 'إنشاء الحساب'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-400 mt-4">
          عندك حساب بالفعل؟{' '}
          <Link href="/login" className="text-gold hover:text-gold-light">
            سجل دخول
          </Link>
        </p>
      </div>
    </div>
  )
}
