'use client'

import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'

export default function LogoutButton() {
  const router = useRouter()
  const supabase = createClient()

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  return (
    <button
      onClick={handleLogout}
      className="text-sm border border-navy-border text-zinc-700 px-4 py-2 rounded-lg hover:border-gold hover:text-gold transition"
    >
      تسجيل الخروج
    </button>
  )
}
