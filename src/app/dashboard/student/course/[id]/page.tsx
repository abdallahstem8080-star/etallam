'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

type ModuleRow = { id: string; title: string }
type Video = { id: string; title: string; youtube_url: string; video_source: string }
type Material = { id: string; title: string; file_url: string }
type ExamRow = { id: string; title: string }

function extractYoutubeId(url: string) {
  const match = url.match(/(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/)
  return match ? match[1] : null
}

function extractDriveId(url: string) {
  const match = url.match(/\/d\/([\w-]+)/) || url.match(/id=([\w-]+)/)
  return match ? match[1] : null
}

function getEmbedUrl(video: Video) {
  if (video.video_source === 'drive') {
    const id = extractDriveId(video.youtube_url)
    return id ? `https://drive.google.com/file/d/${id}/preview` : null
  }
  const id = extractYoutubeId(video.youtube_url)
  return id ? `https://www.youtube.com/embed/${id}` : null
}

export default function StudentCoursePage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [modules, setModules] = useState<ModuleRow[]>([])
  const [activeModule, setActiveModule] = useState<string | null>(null)
  const [videos, setVideos] = useState<Video[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [exam, setExam] = useState<ExamRow | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: mods, error: mErr } = await supabase
        .from('modules')
        .select('id, title')
        .eq('course_id', id)
        .order('order_index')

      if (mErr) {
        setError('مش مسموحلك تشوف الكورس ده')
        setLoading(false)
        return
      }

      setModules(mods ?? [])
      if (mods && mods.length > 0) setActiveModule(mods[0].id)
      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  useEffect(() => {
    async function loadModuleContent() {
      if (!activeModule) return

      const { data: vids } = await supabase
        .from('course_videos')
        .select('id, title, youtube_url, video_source')
        .eq('module_id', activeModule)
        .order('order_index')
      setVideos(vids ?? [])

      const { data: mats } = await supabase
        .from('course_materials')
        .select('id, title, file_url')
        .eq('module_id', activeModule)
      setMaterials(mats ?? [])

      const { data: ex } = await supabase
        .from('exams')
        .select('id, title')
        .eq('module_id', activeModule)
        .eq('is_published', true)
        .maybeSingle()
      setExam(ex ?? null)
    }
    loadModuleContent()
  }, [activeModule, supabase])

  if (loading) {
    return (
      <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
        <DashboardHeader title="الكورس" subtitle="Student" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-zinc-500">جاري التحميل...</p>
        </main>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
        <DashboardHeader title="الكورس" subtitle="Student" />
        <main className="flex-1 flex items-center justify-center">
          <p className="text-red-400">{error}</p>
        </main>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
      <DashboardHeader title="الكورس" subtitle="Student" />

      <main className="flex-1 px-6 sm:px-12 py-10 max-w-4xl mx-auto w-full grid sm:grid-cols-[220px_1fr] gap-8">
        <aside className="space-y-2">
          <h3 className="text-sm text-zinc-500 mb-2">المديولات</h3>
          {modules.length === 0 && (
            <p className="text-zinc-500 text-sm">مفيش مديولات لسه.</p>
          )}
          {modules.map((m) => (
            <button
              key={m.id}
              onClick={() => setActiveModule(m.id)}
              className={`w-full text-right px-4 py-2 rounded-lg text-sm border transition ${
                activeModule === m.id
                  ? 'bg-gold text-background border-gold font-bold'
                  : 'border-navy-border text-zinc-300'
              }`}
            >
              {m.title}
            </button>
          ))}
        </aside>

        <div className="space-y-10">
          <div>
            <h2 className="text-xl font-bold mb-4">الفيديوهات</h2>
            {videos.length === 0 ? (
              <p className="text-zinc-500 text-sm">مفيش فيديوهات لسه.</p>
            ) : (
              <div className="space-y-6">
                {videos.map((v) => {
                  const embedUrl = getEmbedUrl(v)
                  return (
                    <div key={v.id}>
                      <p className="font-medium mb-2">{v.title}</p>
                      {embedUrl ? (
                        <div className="aspect-video rounded-xl overflow-hidden border border-navy-border">
                          <iframe
                            className="w-full h-full"
                            src={embedUrl}
                            title={v.title}
                            allow="autoplay"
                            allowFullScreen
                          />
                        </div>
                      ) : (
                        <p className="text-red-400 text-sm">رابط الفيديو غير صحيح</p>
                      )}
                    </div>
                  )
                })}
              </div>
            )}
          </div>

          <div>
            <h2 className="text-xl font-bold mb-4">الملفات والمرفقات</h2>
            {materials.length === 0 ? (
              <p className="text-zinc-500 text-sm">مفيش ملفات لسه.</p>
            ) : (
              <ul className="space-y-2">
                {materials.map((m) => (
                  <li
                    key={m.id}
                    className="bg-navy-card border border-navy-border rounded-lg px-4 py-3"
                  >
                    <a
                      href={m.file_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-gold hover:text-gold-light"
                    >
                      {m.title}
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {exam && (
            <div>
              <h2 className="text-xl font-bold mb-4">الكويز</h2>
              <Link
                href={`/dashboard/student/exam/${exam.id}`}
                className="inline-block bg-gold text-background font-bold px-6 py-3 rounded-lg hover:bg-gold-light transition"
              >
                ابدأ كويز: {exam.title}
              </Link>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
