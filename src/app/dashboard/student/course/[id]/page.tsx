'use client'

import { useEffect, useState } from 'react'
import { useRouter, useParams } from 'next/navigation'
import Link from 'next/link'
import { createClient } from '@/lib/supabase/client'

type Course = { id: string; title: string; subject_id: string }
type Subject = { id: string; name: string }
type ModuleRow = { id: string; title: string; order_index: number }
type Video = {
  id: string
  module_id: string
  title: string
  youtube_url: string
  video_source: string
  order_index: number
}
type Material = { id: string; title: string; file_url: string }
type ExamRow = { id: string; title: string }
type Comment = { id: string; text: string; author_id: string; author_name?: string; created_at: string }

function extractYoutubeId(url: string) {
  const m = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  return m ? m[1] : null
}
function extractDriveId(url: string) {
  const m = url.match(/\/d\/([\w-]+)/) || url.match(/id=([\w-]+)/)
  return m ? m[1] : null
}
function getEmbedUrl(v: Video) {
  if (v.video_source === 'drive') {
    const id = extractDriveId(v.youtube_url)
    return id ? `https://drive.google.com/file/d/${id}/preview` : null
  }
  const id = extractYoutubeId(v.youtube_url)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

export default function CoursePlayerPage() {
  const { id: courseId } = useParams<{ id: string }>()
  const router = useRouter()
  const supabase = createClient()

  const [course, setCourse] = useState<Course | null>(null)
  const [subject, setSubject] = useState<Subject | null>(null)
  const [modules, setModules] = useState<ModuleRow[]>([])
  const [videosByModule, setVideosByModule] = useState<Record<string, Video[]>>({})
  const [examByModule, setExamByModule] = useState<Record<string, ExamRow | null>>({})
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({})

  const [activeVideo, setActiveVideo] = useState<Video | null>(null)
  const [activeExam, setActiveExam] = useState<{ moduleId: string; exam: ExamRow } | null>(null)
  const [contentTab, setContentTab] = useState<'files' | 'discussion' | 'ai'>('files')

  const [materials, setMaterials] = useState<Material[]>([])
  const [comments, setComments] = useState<Comment[]>([])
  const [newComment, setNewComment] = useState('')

  const [completedIds, setCompletedIds] = useState<string[]>([])
  const [userName, setUserName] = useState('')
  const [avatarOpen, setAvatarOpen] = useState(false)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const allVideos = Object.values(videosByModule).flat()
  const totalCount = allVideos.length
  const progressPercent =
    totalCount === 0 ? 0 : Math.round((completedIds.length / totalCount) * 100)

  async function loadStructure() {
    setLoading(true)

    const { data: c } = await supabase
      .from('courses')
      .select('id, title, subject_id')
      .eq('id', courseId)
      .single()
    if (!c) {
      setError('الكورس غير موجود')
      setLoading(false)
      return
    }
    setCourse(c)

    const { data: subj } = await supabase
      .from('subjects')
      .select('id, name')
      .eq('id', c.subject_id)
      .single()
    setSubject(subj ?? null)

    const { data: mods, error: mErr } = await supabase
      .from('modules')
      .select('id, title, order_index')
      .eq('course_id', courseId)
      .order('order_index')

    if (mErr) {
      setError('مش مسموحلك تشوف الكورس ده')
      setLoading(false)
      return
    }
    setModules(mods ?? [])

    const videosMap: Record<string, Video[]> = {}
    const examsMap: Record<string, ExamRow | null> = {}

    for (const m of mods ?? []) {
      const { data: vids } = await supabase
        .from('course_videos')
        .select('id, module_id, title, youtube_url, video_source, order_index')
        .eq('module_id', m.id)
        .order('order_index')
      videosMap[m.id] = vids ?? []

      const { data: ex } = await supabase
        .from('exams')
        .select('id, title')
        .eq('module_id', m.id)
        .eq('is_published', true)
        .maybeSingle()
      examsMap[m.id] = ex ?? null
    }
    setVideosByModule(videosMap)
    setExamByModule(examsMap)

    if (mods && mods.length > 0) {
      setOpenModules({ [mods[0].id]: true })
      const firstVideos = videosMap[mods[0].id]
      if (firstVideos && firstVideos.length > 0) {
        setActiveVideo(firstVideos[0])
      }
    }

    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (user) {
      const { data: profile } = await supabase
        .from('profiles')
        .select('name')
        .eq('id', user.id)
        .single()
      setUserName(profile?.name ?? '')

      const allVids = Object.values(videosMap).flat()
      if (allVids.length > 0) {
        const { data: progress } = await supabase
          .from('lesson_progress')
          .select('video_id')
          .eq('student_id', user.id)
          .in('video_id', allVids.map((v) => v.id))
        setCompletedIds((progress ?? []).map((p) => p.video_id))
      }
    }

    setLoading(false)
  }

  useEffect(() => {
    loadStructure()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId])

  useEffect(() => {
    async function loadVideoExtras() {
      if (!activeVideo) return
      setContentTab('files')

      const { data: mats } = await supabase
        .from('course_materials')
        .select('id, title, file_url')
        .eq('module_id', activeVideo.module_id)
      setMaterials(mats ?? [])

      await loadComments(activeVideo.id)
    }
    loadVideoExtras()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeVideo])

  async function loadComments(videoId: string) {
    const { data: cms } = await supabase
      .from('lesson_comments')
      .select('id, text, author_id, created_at')
      .eq('video_id', videoId)
      .order('created_at')

    if (cms && cms.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', cms.map((c) => c.author_id))
      setComments(
        cms.map((c) => ({
          ...c,
          author_name: profiles?.find((p) => p.id === c.author_id)?.name ?? 'مستخدم',
        }))
      )
    } else {
      setComments([])
    }
  }

  async function submitComment(e: React.FormEvent) {
    e.preventDefault()
    if (!newComment.trim() || !activeVideo) return

    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from('lesson_comments').insert({
      video_id: activeVideo.id,
      author_id: user?.id,
      text: newComment.trim(),
    })
    setNewComment('')
    loadComments(activeVideo.id)
  }

  async function toggleComplete() {
    if (!activeVideo) return
    const {
      data: { user },
    } = await supabase.auth.getUser()

    if (completedIds.includes(activeVideo.id)) {
      await supabase
        .from('lesson_progress')
        .delete()
        .eq('student_id', user?.id)
        .eq('video_id', activeVideo.id)
      setCompletedIds(completedIds.filter((id) => id !== activeVideo.id))
    } else {
      await supabase.from('lesson_progress').insert({
        student_id: user?.id,
        video_id: activeVideo.id,
      })
      setCompletedIds([...completedIds, activeVideo.id])
    }
  }

  function selectVideo(v: Video) {
    setActiveVideo(v)
    setActiveExam(null)
  }

  function selectExam(moduleId: string, exam: ExamRow) {
    setActiveExam({ moduleId, exam })
    setActiveVideo(null)
  }

  async function handleLogout() {
    await supabase.auth.signOut()
    router.push('/login')
  }

  if (loading) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-zinc-500">جاري تحميل الكورس...</p>
      </div>
    )
  }

  if (error) {
    return (
      <div className="h-screen flex items-center justify-center bg-background text-foreground">
        <p className="text-red-400">{error}</p>
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
      <header className="h-[60px] shrink-0 flex items-center justify-between px-6 border-b border-navy-border">
        <div className="flex items-center gap-3 min-w-0">
          <Link href="/" className="text-lg font-bold text-gold-light shrink-0">
            اتعلم
          </Link>
          <span className="text-zinc-600 hidden sm:inline">/</span>
          <span className="text-xs sm:text-sm text-zinc-400 truncate hidden sm:inline">
            الكورسات {subject && `> ${subject.name}`} {course && `> ${course.title}`}
          </span>
        </div>

        <div className="hidden md:flex items-center gap-3 flex-1 max-w-xs mx-6">
          <div className="flex-1 h-2 bg-navy-card rounded-full overflow-hidden border border-navy-border">
            <div
              className="h-full bg-gold transition-all"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="text-xs text-zinc-400 shrink-0">{progressPercent}%</span>
        </div>

        <div className="flex items-center gap-4 shrink-0 relative">
          <button className="text-zinc-400 hover:text-gold transition text-lg">🔔</button>
          <button
            onClick={() => setAvatarOpen(!avatarOpen)}
            className="w-8 h-8 rounded-full bg-gold text-background font-bold flex items-center justify-center text-sm"
          >
            {userName ? userName[0] : '?'}
          </button>

          {avatarOpen && (
            <div className="absolute left-0 top-12 bg-navy-card border border-navy-border rounded-lg shadow-lg w-44 py-2 z-20">
              <Link
                href="/dashboard/student"
                className="block px-4 py-2 text-sm text-zinc-300 hover:text-gold"
              >
                لوحتي الرئيسية
              </Link>
              <button
                onClick={handleLogout}
                className="w-full text-right px-4 py-2 text-sm text-red-400 hover:text-red-300"
              >
                تسجيل الخروج
              </button>
            </div>
          )}
        </div>
      </header>

      <div className="flex-1 min-h-0 grid grid-cols-1 md:grid-cols-[1fr_300px]">
        <div className="min-h-0 overflow-y-auto p-6">
          {activeVideo && (
            <div className="max-w-3xl">
              <div className="aspect-video rounded-xl overflow-hidden border border-navy-border mb-4">
                {getEmbedUrl(activeVideo) ? (
                  <iframe
                    className="w-full h-full"
                    src={getEmbedUrl(activeVideo)!}
                    title={activeVideo.title}
                    allow="autoplay"
                    allowFullScreen
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-red-400">
                    رابط الفيديو غير صحيح
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between mb-4">
                <h1 className="text-xl font-bold">{activeVideo.title}</h1>
                <button
                  onClick={toggleComplete}
                  className={`text-sm px-4 py-1.5 rounded-lg border transition ${
                    completedIds.includes(activeVideo.id)
                      ? 'bg-green-500/10 border-green-500 text-green-400'
                      : 'border-navy-border text-zinc-400 hover:border-gold hover:text-gold'
                  }`}
                >
                  {completedIds.includes(activeVideo.id) ? '✓ تم الإكمال' : 'تحديد كمكتمل'}
                </button>
              </div>

              <div className="flex gap-2 border-b border-navy-border mb-4">
                {[
                  { key: 'files', label: 'الملفات والمرفقات' },
                  { key: 'discussion', label: 'نقاش الدرس' },
                  { key: 'ai', label: 'ملخص الذكاء الاصطناعي' },
                ].map((t) => (
                  <button
                    key={t.key}
                    onClick={() => setContentTab(t.key as typeof contentTab)}
                    className={`px-4 py-2 text-sm border-b-2 transition ${
                      contentTab === t.key
                        ? 'border-gold text-gold-light font-bold'
                        : 'border-transparent text-zinc-400'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {contentTab === 'files' && (
                <div className="space-y-2">
                  {materials.length === 0 ? (
                    <p className="text-zinc-500 text-sm">مفيش ملفات مرفقة لهذا المديول.</p>
                  ) : (
                    materials.map((m) => (
                      <a
                        key={m.id}
                        href={m.file_url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-between bg-navy-card border border-navy-border rounded-lg px-4 py-3 hover:border-gold transition"
                      >
                        <span className="text-sm">📄 {m.title}</span>
                        <span className="text-xs text-gold">تحميل</span>
                      </a>
                    ))
                  )}
                </div>
              )}

              {contentTab === 'discussion' && (
                <div>
                  <form onSubmit={submitComment} className="flex gap-2 mb-4">
                    <input
                      type="text"
                      value={newComment}
                      onChange={(e) => setNewComment(e.target.value)}
                      placeholder="اكتب سؤالك عن الدرس..."
                      className="flex-1 bg-navy-card border border-navy-border rounded-lg px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      className="bg-gold text-background font-bold px-4 py-2 rounded-lg text-sm hover:bg-gold-light transition"
                    >
                      إرسال
                    </button>
                  </form>
                  <div className="space-y-3">
                    {comments.length === 0 ? (
                      <p className="text-zinc-500 text-sm">مفيش أسئلة لسه، ابدأ النقاش.</p>
                    ) : (
                      comments.map((c) => (
                        <div
                          key={c.id}
                          className="bg-navy-card border border-navy-border rounded-lg px-4 py-3"
                        >
                          <p className="text-xs text-gold-light font-bold mb-1">
                            {c.author_name}
                          </p>
                          <p className="text-sm text-zinc-300">{c.text}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {contentTab === 'ai' && (
                <div className="bg-navy-card border border-navy-border rounded-lg px-6 py-8 text-center">
                  <p className="text-zinc-400 text-sm">
                    ✨ ميزة الملخص الذكي هتتفعل قريبًا في مرحلة الذكاء الاصطناعي بالمنصة.
                  </p>
                </div>
              )}
            </div>
          )}

          {activeExam && (
            <div className="max-w-lg mx-auto text-center py-16">
              <div className="text-4xl mb-4">📝</div>
              <h2 className="text-xl font-bold mb-2">{activeExam.exam.title}</h2>
              <p className="text-zinc-400 text-sm mb-6">
                اضغط ابدأ عشان تدخل واجهة الاختبار الكاملة، بعداد وقت ونتيجة فورية.
              </p>
              <Link
                href={`/dashboard/student/exam/${activeExam.exam.id}`}
                className="inline-block bg-gold text-background font-bold px-8 py-3 rounded-lg hover:bg-gold-light transition"
              >
                ابدأ الاختبار
              </Link>
            </div>
          )}

          {!activeVideo && !activeExam && (
            <p className="text-zinc-500 text-center py-16">اختر درس من القائمة للبدء</p>
          )}
        </div>

        <aside className="border-r-0 md:border-r border-t md:border-t-0 border-navy-border overflow-y-auto p-4 bg-navy-card/40">
          {modules.map((m) => {
            const videos = videosByModule[m.id] ?? []
            const exam = examByModule[m.id]
            const doneInModule = videos.filter((v) => completedIds.includes(v.id)).length
            const isOpen = openModules[m.id]

            return (
              <div key={m.id} className="mb-3">
                <button
                  onClick={() => setOpenModules({ ...openModules, [m.id]: !isOpen })}
                  className="w-full flex items-center justify-between bg-navy-card border border-navy-border rounded-lg px-3 py-2.5 text-sm"
                >
                  <span className="font-bold">{m.title}</span>
                  <span className="text-xs text-zinc-500 flex items-center gap-2">
                    {doneInModule}/{videos.length}
                    <span>{isOpen ? '▾' : '◂'}</span>
                  </span>
                </button>

                {isOpen && (
                  <div className="mt-1 space-y-1">
                    {videos.map((v) => (
                      <button
                        key={v.id}
                        onClick={() => selectVideo(v)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-right transition ${
                          activeVideo?.id === v.id
                            ? 'bg-gold/15 text-gold-light font-bold'
                            : 'text-zinc-400 hover:bg-navy-border/40'
                        }`}
                      >
                        <span
                          className={`w-4 h-4 rounded-full border flex items-center justify-center shrink-0 ${
                            completedIds.includes(v.id)
                              ? 'bg-green-500 border-green-500 text-background'
                              : 'border-zinc-600'
                          }`}
                        >
                          {completedIds.includes(v.id) && '✓'}
                        </span>
                        <span>▶</span>
                        <span className="truncate">{v.title}</span>
                      </button>
                    ))}

                    {exam && (
                      <button
                        onClick={() => selectExam(m.id, exam)}
                        className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-xs text-right transition ${
                          activeExam?.exam.id === exam.id
                            ? 'bg-gold/15 text-gold-light font-bold'
                            : 'text-zinc-400 hover:bg-navy-border/40'
                        }`}
                      >
                        <span className="w-4 h-4 rounded-full border border-zinc-600 shrink-0" />
                        <span>📝</span>
                        <span className="truncate">{exam.title}</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            )
          })}
        </aside>
      </div>
    </div>
  )
}
