'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

const dayNames = ['الأحد', 'الإثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت']

type ScheduleItem = { id: string; day_of_week: number; start_time: string; duration_minutes: number }
type StudentRow = { id: string; name: string; student_code: string | null }
type AttendanceStatus = 'present' | 'absent' | null

export default function ManageGroupPage() {
  const { id: groupId } = useParams<{ id: string }>()
  const supabase = createClient()

  const [tab, setTab] = useState<'schedule' | 'students' | 'attendance'>('schedule')
  const [groupName, setGroupName] = useState('')

  const [schedule, setSchedule] = useState<ScheduleItem[]>([])
  const [dayOfWeek, setDayOfWeek] = useState(6)
  const [startTime, setStartTime] = useState('16:00')
  const [duration, setDuration] = useState(60)

  const [groupStudents, setGroupStudents] = useState<StudentRow[]>([])
  const [allStudents, setAllStudents] = useState<StudentRow[]>([])
  const [search, setSearch] = useState('')

  const [sessionDate, setSessionDate] = useState(
    new Date().toISOString().split('T')[0]
  )
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [attendanceMap, setAttendanceMap] = useState<Record<string, AttendanceStatus>>({})

  async function loadAll() {
    const { data: group } = await supabase
      .from('groups')
      .select('name')
      .eq('id', groupId)
      .single()
    setGroupName(group?.name ?? '')

    const { data: sched } = await supabase
      .from('group_schedule')
      .select('id, day_of_week, start_time, duration_minutes')
      .eq('group_id', groupId)
    setSchedule(sched ?? [])

    const { data: gs } = await supabase
      .from('group_students')
      .select('student_id')
      .eq('group_id', groupId)

    if (gs && gs.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name, student_code')
        .in('id', gs.map((r) => r.student_id))
      setGroupStudents(profiles ?? [])
    } else {
      setGroupStudents([])
    }

    const { data: students } = await supabase
      .from('profiles')
      .select('id, name, student_code')
      .eq('role', 'student')
    setAllStudents(students ?? [])
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [groupId])

  async function addSchedule(e: React.FormEvent) {
    e.preventDefault()
    await supabase.from('group_schedule').insert({
      group_id: groupId,
      day_of_week: dayOfWeek,
      start_time: startTime,
      duration_minutes: duration,
    })
    loadAll()
  }

  async function deleteSchedule(id: string) {
    await supabase.from('group_schedule').delete().eq('id', id)
    loadAll()
  }

  async function addStudent(studentId: string) {
    await supabase.from('group_students').insert({ group_id: groupId, student_id: studentId })
    loadAll()
  }

  async function removeStudent(studentId: string) {
    await supabase
      .from('group_students')
      .delete()
      .eq('group_id', groupId)
      .eq('student_id', studentId)
    loadAll()
  }

  async function openSession() {
    const { data: existing } = await supabase
      .from('sessions')
      .select('id')
      .eq('group_id', groupId)
      .eq('session_date', sessionDate)
      .maybeSingle()

    let sid = existing?.id
    if (!sid) {
      const { data: created } = await supabase
        .from('sessions')
        .insert({ group_id: groupId, session_date: sessionDate })
        .select()
        .single()
      sid = created?.id
    }
    setSessionId(sid ?? null)

    if (sid) {
      const { data: att } = await supabase
        .from('attendance')
        .select('student_id, status')
        .eq('session_id', sid)
      const map: Record<string, AttendanceStatus> = {}
      ;(att ?? []).forEach((a) => {
        map[a.student_id] = a.status as AttendanceStatus
      })
      setAttendanceMap(map)
    }
  }

  async function markAttendance(studentId: string, status: 'present' | 'absent') {
    if (!sessionId) return

    await supabase.from('attendance').upsert(
      {
        session_id: sessionId,
        student_id: studentId,
        status,
      },
      { onConflict: 'session_id,student_id' }
    )

    setAttendanceMap({ ...attendanceMap, [studentId]: status })

    if (status === 'absent') {
      fetch('/api/notify-absence', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentId, groupName, sessionDate }),
      }).catch(() => {})
    }
  }

  const filteredStudents = allStudents.filter(
    (s) =>
      !groupStudents.some((gsItem) => gsItem.id === s.id) &&
      (search === '' || s.name.includes(search))
  )

  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
      <DashboardHeader title={`إدارة مجموعة: ${groupName}`} subtitle="Teacher" />

      <main className="flex-1 px-6 sm:px-12 py-10 max-w-3xl mx-auto w-full">
        <div className="flex gap-2 mb-8">
          {[
            { key: 'schedule', label: 'الجدول' },
            { key: 'students', label: 'الطلاب' },
            { key: 'attendance', label: 'الحضور' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`px-5 py-2 rounded-lg text-sm border transition ${
                tab === t.key
                  ? 'bg-gold text-background border-gold font-bold'
                  : 'border-navy-border text-zinc-500'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'schedule' && (
          <div>
            <form
              onSubmit={addSchedule}
              className="bg-navy-card border border-navy-border rounded-xl p-6 space-y-4 mb-8"
            >
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm mb-1 text-zinc-700">اليوم</label>
                  <select
                    value={dayOfWeek}
                    onChange={(e) => setDayOfWeek(Number(e.target.value))}
                    className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                  >
                    {dayNames.map((d, i) => (
                      <option key={i} value={i}>
                        {d}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm mb-1 text-zinc-700">الساعة</label>
                  <input
                    type="time"
                    value={startTime}
                    onChange={(e) => setStartTime(e.target.value)}
                    className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm mb-1 text-zinc-700">مدة الحصة (دقيقة)</label>
                <input
                  type="number"
                  value={duration}
                  onChange={(e) => setDuration(Number(e.target.value))}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                />
              </div>
              <button
                type="submit"
                className="bg-gold text-background font-bold px-6 py-2 rounded-lg hover:bg-gold-light transition"
              >
                إضافة موعد
              </button>
            </form>

            <ul className="space-y-2">
              {schedule.map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between items-center bg-navy-card border border-navy-border rounded-lg px-4 py-3"
                >
                  <span>
                    {dayNames[s.day_of_week]} — {s.start_time} ({s.duration_minutes} دقيقة)
                  </span>
                  <button
                    onClick={() => deleteSchedule(s.id)}
                    className="text-red-600 hover:text-red-500 text-sm"
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'students' && (
          <div>
            <input
              type="text"
              placeholder="دور باسم الطالب عشان تضيفه..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-navy-card border border-navy-border rounded-lg px-4 py-2 mb-4"
            />

            {search && (
              <ul className="space-y-2 mb-8">
                {filteredStudents.slice(0, 5).map((s) => (
                  <li
                    key={s.id}
                    className="flex justify-between items-center bg-navy-card border border-navy-border rounded-lg px-4 py-2"
                  >
                    <span className="text-sm">{s.name}</span>
                    <button
                      onClick={() => addStudent(s.id)}
                      className="text-sm bg-gold text-background font-bold px-3 py-1 rounded-lg hover:bg-gold-light transition"
                    >
                      إضافة
                    </button>
                  </li>
                ))}
              </ul>
            )}

            <h3 className="text-lg font-bold mb-3">طلاب المجموعة ({groupStudents.length})</h3>
            <ul className="space-y-2">
              {groupStudents.map((s) => (
                <li
                  key={s.id}
                  className="flex justify-between items-center bg-navy-card border border-navy-border rounded-lg px-4 py-3"
                >
                  <span>{s.name}</span>
                  <button
                    onClick={() => removeStudent(s.id)}
                    className="text-red-600 hover:text-red-500 text-sm"
                  >
                    إزالة
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'attendance' && (
          <div>
            <div className="flex gap-3 mb-6">
              <input
                type="date"
                value={sessionDate}
                onChange={(e) => setSessionDate(e.target.value)}
                className="bg-navy-card border border-navy-border rounded-lg px-3 py-2"
              />
              <button
                onClick={openSession}
                className="bg-gold text-background font-bold px-5 py-2 rounded-lg hover:bg-gold-light transition"
              >
                فتح حصة اليوم ده
              </button>
            </div>

            {sessionId && (
              <ul className="space-y-2">
                {groupStudents.map((s) => (
                  <li
                    key={s.id}
                    className="flex justify-between items-center bg-navy-card border border-navy-border rounded-lg px-4 py-3"
                  >
                    <span>{s.name}</span>
                    <div className="flex gap-2">
                      <button
                        onClick={() => markAttendance(s.id, 'present')}
                        className={`w-9 h-9 rounded-full text-lg ${
                          attendanceMap[s.id] === 'present'
                            ? 'bg-green-500 text-white'
                            : 'bg-green-50 text-green-600'
                        }`}
                      >
                        🟢
                      </button>
                      <button
                        onClick={() => markAttendance(s.id, 'absent')}
                        className={`w-9 h-9 rounded-full text-lg ${
                          attendanceMap[s.id] === 'absent'
                            ? 'bg-red-500 text-white'
                            : 'bg-red-50 text-red-600'
                        }`}
                      >
                        🔴
                      </button>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}
      </main>
    </div>
  )
}
