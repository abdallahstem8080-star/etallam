'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

type ModuleRow = { id: string; title: string; order_index: number }
type Request = {
  id: string
  student_id: string
  status: string
  student_name?: string
}

export default function ManageCoursePage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [tab, setTab] = useState<'modules' | 'requests'>('modules')
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [requests, setRequests] = useState<Request[]>([])
  const [newModuleTitle, setNewModuleTitle] = useState('')

  async function loadAll() {
    const { data: mods } = await supabase
      .from('modules')
      .select('id, title, order_index')
      .eq('course_id', id)
      .order('order_index')
    setModules(mods ?? [])

    const { data: reqs } = await supabase
      .from('course_subscriptions')
      .select('id, student_id, status')
      .eq('course_id', id)

    if (reqs && reqs.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', reqs.map((r) => r.student_id))
      setRequests(
        reqs.map((r) => ({
          ...r,
          student_name: profiles?.find((p) => p.id === r.student_id)?.name ?? 'طالب',
        }))
      )
    } else {
      setRequests([])
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function addModule(e: React.FormEvent) {
    e.preventDefault()
    if (!newModuleTitle.trim()) return
    await supabase.from('modules').insert({
      course_id: id,
      title: newModuleTitle.trim(),
      order_index: modules.length,
    })
    setNewModuleTitle('')
    loadAll()
  }

  async function deleteModule(mid: string) {
    if (!confirm('حذف المديول ده؟ هيتحذف معاه كل الفيديوهات والملفات والكويز بتاعه.')) return
    await supabase.from('modules').delete().eq('id', mid)
    loadAll()
  }

  async function respondRequest(reqId: string, status: 'approved' | 'rejected') {
    await supabase
      .from('course_subscriptions')
      .update({ status, responded_at: new Date().toISOString() })
      .eq('id', reqId)
    loadAll()
  }

  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
      <DashboardHeader title="إدارة الكورس" subtitle="Teacher" />

      <main className="flex-1 px-6 sm:px-12 py-10 max-w-3xl mx-auto w-full">
        <div className="flex gap-2 mb-8">
          <button
            onClick={() => setTab('modules')}
            className={`px-5 py-2 rounded-lg text-sm border transition ${
              tab === 'modules'
                ? 'bg-gold text-background border-gold font-bold'
                : 'border-navy-border text-zinc-400'
            }`}
          >
            المديولات
          </button>
          <button
            onClick={() => setTab('requests')}
            className={`px-5 py-2 rounded-lg text-sm border transition relative ${
              tab === 'requests'
                ? 'bg-gold text-background border-gold font-bold'
                : 'border-navy-border text-zinc-400'
            }`}
          >
            طلبات الاشتراك
            {requests.filter((r) => r.status === 'pending').length > 0 && (
              <span className="mr-2 bg-red-500 text-white text-xs rounded-full px-1.5">
                {requests.filter((r) => r.status === 'pending').length}
              </span>
            )}
          </button>
        </div>

        {tab === 'modules' && (
          <div>
            <form onSubmit={addModule} className="flex gap-3 mb-8">
              <input
                type="text"
                placeholder="اسم المديول الجديد (مثال: المديول الأول)"
                value={newModuleTitle}
                onChange={(e) => setNewModuleTitle(e.target.value)}
                className="flex-1 bg-navy-card border border-navy-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
              />
              <button
                type="submit"
                className="bg-gold text-background font-bold px-6 py-2 rounded-lg hover:bg-gold-light transition"
              >
                إضافة مديول
              </button>
            </form>

            {modules.length === 0 ? (
              <p className="text-zinc-500">مفيش مديولات لسه، ضيف أول مديول من فوق.</p>
            ) : (
              <ul className="space-y-2">
                {modules.map((m, i) => (
                  <li
                    key={m.id}
                    className="flex justify-between items-center bg-navy-card border border-navy-border rounded-lg px-4 py-3"
                  >
                    <span className="font-medium">
                      {i + 1}. {m.title}
                    </span>
                    <div className="flex gap-3 items-center">
                      <Link
                        href={`/dashboard/teacher/course/${id}/module/${m.id}`}
                        className="text-sm bg-gold text-background font-bold px-4 py-1.5 rounded-lg hover:bg-gold-light transition"
                      >
                        إدارة المديول
                      </Link>
                      <button
                        onClick={() => deleteModule(m.id)}
                        className="text-red-400 hover:text-red-300 text-sm"
                      >
                        حذف
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        {tab === 'requests' && (
          <ul className="space-y-2">
            {requests.length === 0 && (
              <p className="text-zinc-500">مفيش طلبات اشتراك لسه.</p>
            )}
            {requests.map((r) => (
              <li
                key={r.id}
                className="flex justify-between items-center bg-navy-card border border-navy-border rounded-lg px-4 py-3"
              >
                <div>
                  <p className="font-medium">{r.student_name}</p>
                  <p className="text-xs text-zinc-500">
                    {r.status === 'pending' && 'معلّق'}
                    {r.status === 'approved' && <span className="text-green-400">مقبول</span>}
                    {r.status === 'rejected' && <span className="text-red-400">مرفوض</span>}
                  </p>
                </div>
                {r.status === 'pending' && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => respondRequest(r.id, 'approved')}
                      className="text-sm bg-gold text-background font-bold px-4 py-1.5 rounded-lg hover:bg-gold-light transition"
                    >
                      قبول
                    </button>
                    <button
                      onClick={() => respondRequest(r.id, 'rejected')}
                      className="text-sm border border-navy-border text-zinc-400 px-4 py-1.5 rounded-lg hover:border-red-400 hover:text-red-400 transition"
                    >
                      رفض
                    </button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
