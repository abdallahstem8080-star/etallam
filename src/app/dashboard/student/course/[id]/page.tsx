'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

type Video = { id: string; title: string; youtube_url: string }
type Material = { id: string; title: string; file_url: string }

function extractYoutubeId(url: string) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/
  )
  return match ? match[1] : null
}

export default function StudentCoursePage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [videos, setVideos] = useState<Video[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    async function load() {
      const { data: vids, error: vErr } = await supabase
        .from('course_videos')
        .select('id, title, youtube_url')
        .eq('course_id', id)
        .order('order_index')

      if (vErr) {
        setError('مش مسموحلك تشوف الكورس ده')
        setLoading(false)
        return
      }

      setVideos(vids ?? [])

      const { data: mats } = await supabase
        .from('course_materials')
        .select('id, title, file_url')
        .eq('course_id', id)
      setMaterials(mats ?? [])

      setLoading(false)
    }
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

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

      <main className="flex-1 px-6 sm:px-12 py-10 max-w-3xl mx-auto w-full space-y-10">
        <div>
          <h2 className="text-xl font-bold mb-4">الفيديوهات</h2>
          {videos.length === 0 ? (
            <p className="text-zinc-500 text-sm">مفيش فيديوهات لسه.</p>
          ) : (
            <div className="space-y-6">
              {videos.map((v) => {
                const ytId = extractYoutubeId(v.youtube_url)
                return (
                  <div key={v.id}>
                    <p className="font-medium mb-2">{v.title}</p>
                    {ytId ? (
                      <div className="aspect-video rounded-xl overflow-hidden border border-navy-border">
                        <iframe
                          className="w-full h-full"
                          src={`https://www.youtube.com/embed/${ytId}`}
                          title={v.title}
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
      </main>
    </div>
  )
}
