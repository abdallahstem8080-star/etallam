'use client'

import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

type GroupWithSchedule = {
  id: string
  name: string
  schedule: { day_of_week: number; start_time: string; duration_minutes: number }[]
}

function getNextSessionDate(dayOfWeek: number, startTime: string) {
  const now = new Date()
  const [h, m] = startTime.split(':').map(Number)
  const result = new Date(now)
  const diff = (dayOfWeek - now.getDay() + 7) % 7
  result.setDate(now.getDate() + diff)
  result.setHours(h, m, 0, 0)
  if (result < now) result.setDate(result.getDate() + 7)
  return result
}

function formatCountdown(ms: number) {
  if (ms <= 0) return 'دلوقتي!'
  const totalMinutes = Math.floor(ms / 60000)
  const days = Math.floor(totalMinutes / (60 * 24))
  const hours = Math.floor((totalMinutes % (60 * 24)) / 60)
  const minutes = totalMinutes % 60
  if (days > 0) return `${days} يوم و ${hours} ساعة`
  if (hours > 0) return `${hours} ساعة و ${minutes} دقيقة`
  return `${minutes} دقيقة`
}

export default function StudentSchedulePage() {
  const supabase = createClient()
  const [groups, setGroups] = useState<GroupWithSchedule[]>([])
  const [loading, setLoading] = useState(true)
  const [now, setNow] = useState(new Date())

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: gs } = await supabase
        .from('group_students')
        .select('group_id')
        .eq('student_id', user?.id)

      if (!gs || gs.length === 0) {
        setLoading(false)
        return
      }

      const groupIds = gs.map((g) => g.group_id)
      const { data: grps } = await supabase
        .from('groups')
        .select('id, name')
        .in('id', groupIds)

      const result: GroupWithSchedule[] = []
      for (const g of grps ?? []) {
        const { data: sched } = await supabase
          .from('group_schedule')
          .select('day_of_week, start_time, duration_minutes')
          .eq('group_id', g.id)
        result.push({ ...g, schedule: sched ?? [] })
      }
      setGroups(result)
      setLoading(false)
    }
    load()
  }, [supabase])

  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30000)
    return () => clearInterval(timer)
  }, [])

  // نحسب أقرب حصة جاية من كل المجموعات
  const upcoming = groups
    .flatMap((g) =>
      g.schedule.map((s) => ({
        groupName: g.name,
        ...s,
        nextDate: getNextSessionDate(s.day_of_week, s.start_time),
      }))
    )
    .sort((a, b) => a.nextDate.getTime() - b.nextDate.getTime())

  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
      <DashboardHeader title="جدول حصصي" subtitle="Student" />

      <main className="flex-1 px-6 sm:px-12 py-10 max-w-2xl mx-auto w-full">
        <h2 className="text-2xl font-bold mb-6">جدول حصصي</h2>

        {loading ? (
          <p className="text-zinc-500">جاري التحميل...</p>
        ) : upcoming.length === 0 ? (
          <p className="text-zinc-500">مش مسجل في أي مجموعة لسه.</p>
        ) : (
          <div className="space-y-4">
            {upcoming[0] && (
              <div className="bg-gold text-background rounded-xl p-6 text-center">
                <p className="text-sm opacity-90 mb-1">حصتك الجاية</p>
                <p className="text-lg font-bold mb-2">{upcoming[0].groupName}</p>
                <p className="text-3xl font-extrabold">
                  {formatCountdown(upcoming[0].nextDate.getTime() - now.getTime())}
                </p>
              </div>
            )}

            <ul className="space-y-2">
              {upcoming.map((s, i) => (
                <li
                  key={i}
                  className="flex justify-between items-center bg-navy-card border border-navy-border rounded-lg px-4 py-3"
                >
                  <div>
                    <p className="font-medium">{s.groupName}</p>
                    <p className="text-xs text-zinc-500">
                      {dayNames[s.day_of_week]} — {s.start_time}
                    </p>
                  </div>
                  <span className="text-xs text-gold-light">
                    {formatCountdown(s.nextDate.getTime() - now.getTime())}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}
