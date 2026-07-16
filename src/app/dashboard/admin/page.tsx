'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

type Subject = { id: string; name: string }

export default function AdminDashboard() {
  const supabase = createClient()
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [newSubject, setNewSubject] = useState('')
  const [loading, setLoading] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')

  async function loadSubjects() {
    setLoading(true)
    const { data } = await supabase
      .from('subjects')
      .select('id, name')
      .order('created_at', { ascending: true })
    setSubjects(data ?? [])
    setLoading(false)
  }

  useEffect(() => {
    loadSubjects()
  }, [])

  async function addSubject(e: React.FormEvent) {
    e.preventDefault()
    if (!newSubject.trim()) return
    const { error } = await supabase.from('subjects').insert({ name: newSubject.trim() })
    if (!error) {
      setNewSubject('')
      loadSubjects()
    }
  }

  async function deleteSubject(id: string) {
    if (!confirm('متأكد من حذف المادة دي؟ هيتحذف معاها كل الأسئلة المرتبطة بيها.')) return
    await supabase.from('subjects').delete().eq('id', id)
    loadSubjects()
  }

  async function saveEdit(id: string) {
    if (!editingName.trim()) return
    await supabase.from('subjects').update({ name: editingName.trim() }).eq('id', id)
    setEditingId(null)
    loadSubjects()
  }

  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
      <DashboardHeader title="لوحة تحكم المدير" subtitle="Admin" />

      <main className="flex-1 px-6 sm:px-12 py-10 max-w-3xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-6">إدارة المواد الدراسية</h2>

        <form onSubmit={addSubject} className="flex gap-3 mb-8">
          <input
            type="text"
            placeholder="اسم المادة الجديدة"
            value={newSubject}
            onChange={(e) => setNewSubject(e.target.value)}
            className="flex-1 bg-navy-card border border-navy-border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-gold"
          />
          <button
            type="submit"
            className="bg-gold text-background font-bold px-6 py-2 rounded-lg hover:bg-gold-light transition"
          >
            إضافة
          </button>
        </form>

        {loading ? (
          <p className="text-zinc-500">جاري التحميل...</p>
        ) : subjects.length === 0 ? (
          <p className="text-zinc-500">مفيش مواد لسه، ضيف أول مادة من فوق.</p>
        ) : (
          <ul className="space-y-3">
            {subjects.map((s) => (
              <li
                key={s.id}
                className="flex items-center justify-between bg-navy-card border border-navy-border rounded-lg px-4 py-3"
              >
                {editingId === s.id ? (
                  <input
                    value={editingName}
                    onChange={(e) => setEditingName(e.target.value)}
                    className="flex-1 bg-background border border-navy-border rounded px-2 py-1 ml-3"
                  />
                ) : (
                  <span>{s.name}</span>
                )}

                <div className="flex gap-2">
                  {editingId === s.id ? (
                    <button
                      onClick={() => saveEdit(s.id)}
                      className="text-sm text-gold hover:text-gold-light"
                    >
                      حفظ
                    </button>
                  ) : (
                    <button
                      onClick={() => {
                        setEditingId(s.id)
                        setEditingName(s.name)
                      }}
                      className="text-sm text-zinc-500 hover:text-gold"
                    >
                      تعديل
                    </button>
                  )}
                  <button
                    onClick={() => deleteSubject(s.id)}
                    className="text-sm text-red-600 hover:text-red-300"
                  >
                    حذف
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </main>
    </div>
  )
}
