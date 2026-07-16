'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LoginPage() {
  const router = useRouter()
  const supabase = createClient()

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setLoading(true)

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (error) {
      setError('البريد الإلكتروني أو كلمة المرور غير صحيحة')
      setLoading(false)
      return
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', data.user.id)
      .single()

    setLoading(false)

    if (profile?.role) {
      router.push(`/dashboard/${profile.role}`)
    } else {
      router.push('/dashboard')
    }
  }

  return (
    <div className="min-h-screen flex flex-col flex-1 items-center justify-center bg-background text-foreground px-4">
      <Link href="/" className="text-2xl font-bold text-gold-light mb-8">
        اتعلم
      </Link>

      <div className="w-full max-w-sm bg-navy-card border border-navy-border rounded-xl shadow-lg p-8">
        <h1 className="text-xl font-bold text-center mb-1">تسجيل الدخول</h1>
        <p className="text-center text-zinc-500 text-sm mb-6">
          ادخل ببياناتك للمتابعة
        </p>

        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-700">
              البريد الإلكتروني
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-background border border-navy-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1 text-zinc-700">
              كلمة المرور
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full bg-background border border-navy-border rounded-lg px-3 py-2 text-foreground focus:outline-none focus:ring-2 focus:ring-gold"
            />
          </div>

          {error && <p className="text-red-600 text-sm">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gold text-background rounded-lg py-2 font-bold hover:bg-gold-light transition disabled:opacity-50"
          >
            {loading ? 'جاري الدخول...' : 'دخول'}
          </button>
        </form>

        <p className="text-center text-sm text-zinc-500 mt-4">
          مفيش حساب؟{' '}
          <Link href="/signup" className="text-gold hover:text-gold-light">
            سجل الآن
          </Link>
        </p>
      </div>
    </div>
  )
}
