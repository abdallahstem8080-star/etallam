'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

type Video = { id: string; title: string; youtube_url: string }
type Material = { id: string; title: string; file_url: string }
type Request = {
  id: string
  student_id: string
  status: string
  student_name?: string
}

function extractYoutubeId(url: string) {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/)|youtu\.be\/)([\w-]{11})/
  )
  return match ? match[1] : null
}

export default function ManageCoursePage() {
  const { id } = useParams<{ id: string }>()
  const supabase = createClient()

  const [tab, setTab] = useState<'videos' | 'materials' | 'requests'>('videos')
  const [videos, setVideos] = useState<Video[]>([])
  const [materials, setMaterials] = useState<Material[]>([])
  const [requests, setRequests] = useState<Request[]>([])

  const [videoTitle, setVideoTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [materialTitle, setMaterialTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)

  async function loadAll() {
    const { data: vids } = await supabase
      .from('course_videos')
      .select('id, title, youtube_url')
      .eq('course_id', id)
      .order('order_index')
    setVideos(vids ?? [])

    const { data: mats } = await supabase
      .from('course_materials')
      .select('id, title, file_url')
      .eq('course_id', id)
    setMaterials(mats ?? [])

    const { data: reqs } = await supabase
      .from('course_subscriptions')
      .select('id, student_id, status')
      .eq('course_id', id)

    if (reqs && reqs.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in(
          'id',
          reqs.map((r) => r.student_id)
        )
      const withNames = reqs.map((r) => ({
        ...r,
        student_name: profiles?.find((p) => p.id === r.student_id)?.name ?? 'طالب',
      }))
      setRequests(withNames)
    } else {
      setRequests([])
    }
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  async function addVideo(e: React.FormEvent) {
    e.preventDefault()
    if (!videoTitle.trim() || !videoUrl.trim()) return
    await supabase.from('course_videos').insert({
      course_id: id,
      title: videoTitle.trim(),
      youtube_url: videoUrl.trim(),
    })
    setVideoTitle('')
    setVideoUrl('')
    loadAll()
  }

  async function deleteVideo(vid: string) {
    await supabase.from('course_videos').delete().eq('id', vid)
    loadAll()
  }

  async function uploadMaterial(e: React.FormEvent) {
    e.preventDefault()
    if (!file || !materialTitle.trim()) return
    setUploading(true)

    const filePath = `${id}/${Date.now()}-${file.name}`
    const { error: uploadError } = await supabase.storage
      .from('course-materials')
      .upload(filePath, file)

    if (uploadError) {
      alert('حدث خطأ أثناء رفع الملف: ' + uploadError.message)
      setUploading(false)
      return
    }

    const { data: publicUrl } = supabase.storage
      .from('course-materials')
      .getPublicUrl(filePath)

    await supabase.from('course_materials').insert({
      course_id: id,
      title: materialTitle.trim(),
      file_url: publicUrl.publicUrl,
    })

    setMaterialTitle('')
    setFile(null)
    setUploading(false)
    loadAll()
  }

  async function deleteMaterial(mid: string) {
    await supabase.from('course_materials').delete().eq('id', mid)
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
          {[
            { key: 'videos', label: 'الفيديوهات' },
            { key: 'materials', label: 'الملفات' },
            { key: 'requests', label: 'طلبات الاشتراك' },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key as typeof tab)}
              className={`px-5 py-2 rounded-lg text-sm border transition ${
                tab === t.key
                  ? 'bg-gold text-background border-gold font-bold'
                  : 'border-navy-border text-zinc-400'
              }`}
            >
              {t.label}
              {t.key === 'requests' &&
                requests.filter((r) => r.status === 'pending').length > 0 && (
                  <span className="mr-2 bg-red-500 text-white text-xs rounded-full px-1.5">
                    {requests.filter((r) => r.status === 'pending').length}
                  </span>
                )}
            </button>
          ))}
        </div>

        {tab === 'videos' && (
          <div>
            <form
              onSubmit={addVideo}
              className="bg-navy-card border border-navy-border rounded-xl p-6 space-y-4 mb-8"
            >
              <div>
                <label className="block text-sm mb-1 text-zinc-300">عنوان الفيديو</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-zinc-300">
                  رابط يوتيوب (Unlisted أو عام)
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder="https://youtube.com/watch?v=..."
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                />
              </div>
              <button
                type="submit"
                className="bg-gold text-background font-bold px-6 py-2 rounded-lg hover:bg-gold-light transition"
              >
                إضافة الفيديو
              </button>
            </form>

            <ul className="space-y-2">
              {videos.map((v) => (
                <li
                  key={v.id}
                  className="flex justify-between items-center bg-navy-card border border-navy-border rounded-lg px-4 py-3"
                >
                  <span>{v.title}</span>
                  <button
                    onClick={() => deleteVideo(v.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'materials' && (
          <div>
            <form
              onSubmit={uploadMaterial}
              className="bg-navy-card border border-navy-border rounded-xl p-6 space-y-4 mb-8"
            >
              <div>
                <label className="block text-sm mb-1 text-zinc-300">عنوان الملف</label>
                <input
                  type="text"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-zinc-300">اختر الملف</label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-zinc-300"
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="bg-gold text-background font-bold px-6 py-2 rounded-lg hover:bg-gold-light transition disabled:opacity-50"
              >
                {uploading ? 'جاري الرفع...' : 'رفع الملف'}
              </button>
            </form>

            <ul className="space-y-2">
              {materials.map((m) => (
                <li
                  key={m.id}
                  className="flex justify-between items-center bg-navy-card border border-navy-border rounded-lg px-4 py-3"
                >
                  <span>{m.title}</span>
                  <button
                    onClick={() => deleteMaterial(m.id)}
                    className="text-red-400 hover:text-red-300 text-sm"
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
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
                    {r.status === 'approved' && (
                      <span className="text-green-400">مقبول</span>
                    )}
                    {r.status === 'rejected' && (
                      <span className="text-red-400">مرفوض</span>
                    )}
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
