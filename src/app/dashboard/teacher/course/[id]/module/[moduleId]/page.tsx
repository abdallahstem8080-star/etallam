'use client'

import { useEffect, useState } from 'react'
import { useParams } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import DashboardHeader from '@/components/DashboardHeader'

type Video = { id: string; title: string; youtube_url: string; video_source: string }
type Material = { id: string; title: string; file_url: string }
type ExamRow = { id: string; title: string; is_published: boolean }
type Question = { id: string; text: string; subject_id: string }
type Assignment = { id: string; title: string; description: string | null; due_date: string | null }
type Submission = {
  id: string
  student_id: string
  student_name?: string
  file_url: string
  submitted_at: string
  grade: number | null
  feedback: string | null
}

export default function ManageModulePage() {
  const { id: courseId, moduleId } = useParams<{ id: string; moduleId: string }>()
  const supabase = createClient()

  const [tab, setTab] = useState<'videos' | 'materials' | 'quiz' | 'assignments'>('videos')

  const [videos, setVideos] = useState<Video[]>([])
  const [videoTitle, setVideoTitle] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [videoSource, setVideoSource] = useState<'youtube' | 'drive'>('youtube')

  const [materials, setMaterials] = useState<Material[]>([])
  const [materialTitle, setMaterialTitle] = useState('')
  const [file, setFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')

  const [exam, setExam] = useState<ExamRow | null>(null)
  const [examTitle, setExamTitle] = useState('')
  const [examDuration, setExamDuration] = useState(15)
  const [subjectId, setSubjectId] = useState('')
  const [bankQuestions, setBankQuestions] = useState<Question[]>([])
  const [selectedQuestionIds, setSelectedQuestionIds] = useState<string[]>([])

  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [assignTitle, setAssignTitle] = useState('')
  const [assignDesc, setAssignDesc] = useState('')
  const [assignDue, setAssignDue] = useState('')
  const [activeAssignment, setActiveAssignment] = useState<string | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])

  async function loadAll() {
    const { data: vids } = await supabase
      .from('course_videos')
      .select('id, title, youtube_url, video_source')
      .eq('module_id', moduleId)
      .order('order_index')
    setVideos(vids ?? [])

    const { data: mats } = await supabase
      .from('course_materials')
      .select('id, title, file_url')
      .eq('module_id', moduleId)
    setMaterials(mats ?? [])

    const { data: existingExam } = await supabase
      .from('exams')
      .select('id, title, is_published')
      .eq('module_id', moduleId)
      .maybeSingle()
    setExam(existingExam ?? null)

    // نجيب مادة الكورس عشان بنك الأسئلة يبقى مناسب
    const { data: course } = await supabase
      .from('courses')
      .select('subject_id')
      .eq('id', courseId)
      .single()
    if (course) {
      setSubjectId(course.subject_id)
      const { data: qs } = await supabase
        .from('questions')
        .select('id, text, subject_id')
        .eq('subject_id', course.subject_id)
      setBankQuestions(qs ?? [])
    }

    if (existingExam) {
      const { data: examQs } = await supabase
        .from('exam_questions')
        .select('question_id')
        .eq('exam_id', existingExam.id)
      setSelectedQuestionIds((examQs ?? []).map((q) => q.question_id))
    }

    const { data: assigns } = await supabase
      .from('assignments')
      .select('id, title, description, due_date')
      .eq('module_id', moduleId)
    setAssignments(assigns ?? [])
  }

  useEffect(() => {
    loadAll()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [moduleId])

  async function addVideo(e: React.FormEvent) {
    e.preventDefault()
    if (!videoTitle.trim() || !videoUrl.trim()) return
    await supabase.from('course_videos').insert({
      module_id: moduleId,
      title: videoTitle.trim(),
      youtube_url: videoUrl.trim(),
      video_source: videoSource,
      order_index: videos.length,
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
    setUploadError('')

    if (!materialTitle.trim()) {
      setUploadError('اكتب عنوان للملف الأول')
      return
    }
    if (!file) {
      setUploadError('لازم تختار ملف فعلي بالضغط على "اختر الملف" تحت — كتابة العنوان بس مش كفاية')
      return
    }

    setUploading(true)

    const filePath = `${moduleId}/${Date.now()}-${file.name}`
    const { error: uploadErr } = await supabase.storage
      .from('course-materials')
      .upload(filePath, file)

    if (uploadErr) {
      setUploadError('فشل رفع الملف: ' + uploadErr.message)
      setUploading(false)
      return
    }

    const { data: publicUrl } = supabase.storage
      .from('course-materials')
      .getPublicUrl(filePath)

    const { error: insertErr } = await supabase.from('course_materials').insert({
      module_id: moduleId,
      title: materialTitle.trim(),
      file_url: publicUrl.publicUrl,
    })

    if (insertErr) {
      setUploadError('اترفع الملف لكن حصل خطأ في الحفظ: ' + insertErr.message)
      setUploading(false)
      return
    }

    setMaterialTitle('')
    setFile(null)
    setUploading(false)
    loadAll()
  }

  async function deleteMaterial(mid: string) {
    await supabase.from('course_materials').delete().eq('id', mid)
    loadAll()
  }

  async function createOrUpdateExam(e: React.FormEvent) {
    e.preventDefault()

    if (!exam) {
      if (!examTitle.trim()) return
      const {
        data: { user },
      } = await supabase.auth.getUser()

      const { data: newExam, error } = await supabase
        .from('exams')
        .insert({
          title: examTitle.trim(),
          subject_id: subjectId,
          module_id: moduleId,
          duration_minutes: examDuration,
          teacher_id: user?.id,
          is_published: false,
        })
        .select()
        .single()

      if (error || !newExam) return

      if (selectedQuestionIds.length > 0) {
        await supabase.from('exam_questions').insert(
          selectedQuestionIds.map((qid) => ({ exam_id: newExam.id, question_id: qid }))
        )
      }
      loadAll()
    } else {
      // تحديث الأسئلة المختارة للكويز الموجود
      await supabase.from('exam_questions').delete().eq('exam_id', exam.id)
      if (selectedQuestionIds.length > 0) {
        await supabase.from('exam_questions').insert(
          selectedQuestionIds.map((qid) => ({ exam_id: exam.id, question_id: qid }))
        )
      }
      loadAll()
    }
  }

  async function togglePublish() {
    if (!exam) return
    await supabase
      .from('exams')
      .update({ is_published: !exam.is_published })
      .eq('id', exam.id)
    loadAll()
  }

  async function createAssignment(e: React.FormEvent) {
    e.preventDefault()
    if (!assignTitle.trim()) return
    await supabase.from('assignments').insert({
      module_id: moduleId,
      title: assignTitle.trim(),
      description: assignDesc.trim() || null,
      due_date: assignDue || null,
    })
    setAssignTitle('')
    setAssignDesc('')
    setAssignDue('')
    loadAll()
  }

  async function deleteAssignment(aid: string) {
    if (!confirm('حذف الواجب ده؟')) return
    await supabase.from('assignments').delete().eq('id', aid)
    if (activeAssignment === aid) setActiveAssignment(null)
    loadAll()
  }

  async function openSubmissions(assignmentId: string) {
    setActiveAssignment(assignmentId)
    const { data: subs } = await supabase
      .from('assignment_submissions')
      .select('id, student_id, file_url, submitted_at, grade, feedback')
      .eq('assignment_id', assignmentId)

    if (subs && subs.length > 0) {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('id, name')
        .in('id', subs.map((s) => s.student_id))
      setSubmissions(
        subs.map((s) => ({
          ...s,
          student_name: profiles?.find((p) => p.id === s.student_id)?.name ?? 'طالب',
        }))
      )
    } else {
      setSubmissions([])
    }
  }

  async function gradeSubmission(subId: string, grade: string, feedback: string) {
    await supabase
      .from('assignment_submissions')
      .update({
        grade: grade ? Number(grade) : null,
        feedback: feedback || null,
        graded_at: new Date().toISOString(),
      })
      .eq('id', subId)
    if (activeAssignment) openSubmissions(activeAssignment)
  }

  return (
    <div className="min-h-screen flex flex-col flex-1 bg-background text-foreground">
      <DashboardHeader title="إدارة المديول" subtitle="Teacher" />

      <main className="flex-1 px-6 sm:px-12 py-10 max-w-3xl mx-auto w-full">
        <div className="flex gap-2 mb-8">
          {[
            { key: 'videos', label: 'الفيديوهات' },
            { key: 'materials', label: 'الملفات' },
            { key: 'quiz', label: 'الكويز' },
            { key: 'assignments', label: 'الواجبات' },
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

        {tab === 'videos' && (
          <div>
            <form
              onSubmit={addVideo}
              className="bg-navy-card border border-navy-border rounded-xl p-6 space-y-4 mb-8"
            >
              <div>
                <label className="block text-sm mb-1 text-zinc-700">عنوان الفيديو</label>
                <input
                  type="text"
                  value={videoTitle}
                  onChange={(e) => setVideoTitle(e.target.value)}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                />
              </div>

              <div>
                <label className="block text-sm mb-2 text-zinc-700">مصدر الفيديو</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setVideoSource('youtube')}
                    className={`px-4 py-2 rounded-lg text-sm border ${
                      videoSource === 'youtube'
                        ? 'bg-gold text-background border-gold font-bold'
                        : 'border-navy-border text-zinc-500'
                    }`}
                  >
                    يوتيوب
                  </button>
                  <button
                    type="button"
                    onClick={() => setVideoSource('drive')}
                    className={`px-4 py-2 rounded-lg text-sm border ${
                      videoSource === 'drive'
                        ? 'bg-gold text-background border-gold font-bold'
                        : 'border-navy-border text-zinc-500'
                    }`}
                  >
                    جوجل درايف
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-sm mb-1 text-zinc-700">
                  {videoSource === 'youtube' ? 'رابط اليوتيوب' : 'رابط جوجل درايف (لازم يكون Anyone with the link)'}
                </label>
                <input
                  type="text"
                  value={videoUrl}
                  onChange={(e) => setVideoUrl(e.target.value)}
                  placeholder={
                    videoSource === 'youtube'
                      ? 'https://youtube.com/watch?v=...'
                      : 'https://drive.google.com/file/d/.../view'
                  }
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
                  <span>
                    {v.title}{' '}
                    <span className="text-xs text-zinc-500">
                      ({v.video_source === 'drive' ? 'درايف' : 'يوتيوب'})
                    </span>
                  </span>
                  <button
                    onClick={() => deleteVideo(v.id)}
                    className="text-red-600 hover:text-red-300 text-sm"
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
                <label className="block text-sm mb-1 text-zinc-700">عنوان الملف</label>
                <input
                  type="text"
                  value={materialTitle}
                  onChange={(e) => setMaterialTitle(e.target.value)}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-zinc-700">
                  اضغط هنا لاختيار الملف من جهازك
                </label>
                <input
                  type="file"
                  onChange={(e) => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-zinc-700 bg-background border border-navy-border rounded-lg px-3 py-2"
                />
                {file && (
                  <p className="text-xs text-green-600 mt-1">تم اختيار: {file.name}</p>
                )}
              </div>

              {uploadError && <p className="text-red-600 text-sm">{uploadError}</p>}

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
                    className="text-red-600 hover:text-red-300 text-sm"
                  >
                    حذف
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {tab === 'quiz' && (
          <div>
            <form
              onSubmit={createOrUpdateExam}
              className="bg-navy-card border border-navy-border rounded-xl p-6 space-y-4 mb-8"
            >
              {!exam && (
                <>
                  <div>
                    <label className="block text-sm mb-1 text-zinc-700">عنوان الكويز</label>
                    <input
                      type="text"
                      value={examTitle}
                      onChange={(e) => setExamTitle(e.target.value)}
                      className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                    />
                  </div>
                  <div>
                    <label className="block text-sm mb-1 text-zinc-700">المدة (دقيقة)</label>
                    <input
                      type="number"
                      value={examDuration}
                      onChange={(e) => setExamDuration(Number(e.target.value))}
                      className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                    />
                  </div>
                </>
              )}

              <div>
                <label className="block text-sm mb-2 text-zinc-700">
                  اختر الأسئلة من بنك أسئلة المادة
                </label>
                <div className="space-y-2 max-h-52 overflow-y-auto">
                  {bankQuestions.length === 0 && (
                    <p className="text-zinc-500 text-sm">
                      مفيش أسئلة لسه في بنك أسئلة المادة دي، ضيف أسئلة من تبويب "بنك الأسئلة" في لوحتك الرئيسية.
                    </p>
                  )}
                  {bankQuestions.map((q) => (
                    <label
                      key={q.id}
                      className="flex items-center gap-2 bg-background border border-navy-border rounded-lg px-3 py-2 cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedQuestionIds.includes(q.id)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedQuestionIds([...selectedQuestionIds, q.id])
                          } else {
                            setSelectedQuestionIds(
                              selectedQuestionIds.filter((qid) => qid !== q.id)
                            )
                          }
                        }}
                      />
                      <span className="text-sm">{q.text}</span>
                    </label>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                className="bg-gold text-background font-bold px-6 py-2 rounded-lg hover:bg-gold-light transition"
              >
                {exam ? 'حفظ التعديلات' : 'إنشاء الكويز'}
              </button>
            </form>

            {exam && (
              <div className="flex justify-between items-center bg-navy-card border border-navy-border rounded-lg px-4 py-3">
                <div>
                  <p className="font-medium">{exam.title}</p>
                  <p className="text-xs text-zinc-500">
                    {exam.is_published ? (
                      <span className="text-green-600">منشور</span>
                    ) : (
                      'مسودة'
                    )}
                  </p>
                </div>
                <button
                  onClick={togglePublish}
                  className={`text-sm px-4 py-1.5 rounded-lg border transition ${
                    exam.is_published
                      ? 'border-navy-border text-zinc-500'
                      : 'bg-gold text-background border-gold font-bold'
                  }`}
                >
                  {exam.is_published ? 'إلغاء النشر' : 'نشر'}
                </button>
              </div>
            )}
          </div>
        )}

        {tab === 'assignments' && (
          <div>
            <form
              onSubmit={createAssignment}
              className="bg-navy-card border border-navy-border rounded-xl p-6 space-y-4 mb-8"
            >
              <div>
                <label className="block text-sm mb-1 text-zinc-700">عنوان الواجب</label>
                <input
                  type="text"
                  value={assignTitle}
                  onChange={(e) => setAssignTitle(e.target.value)}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-zinc-700">الوصف / المطلوب</label>
                <textarea
                  value={assignDesc}
                  onChange={(e) => setAssignDesc(e.target.value)}
                  rows={2}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                />
              </div>
              <div>
                <label className="block text-sm mb-1 text-zinc-700">آخر موعد للتسليم (اختياري)</label>
                <input
                  type="datetime-local"
                  value={assignDue}
                  onChange={(e) => setAssignDue(e.target.value)}
                  className="w-full bg-background border border-navy-border rounded-lg px-3 py-2"
                />
              </div>
              <button
                type="submit"
                className="bg-gold text-white font-bold px-6 py-2 rounded-lg hover:bg-gold-light transition"
              >
                إنشاء الواجب
              </button>
            </form>

            <ul className="space-y-2 mb-8">
              {assignments.map((a) => (
                <li
                  key={a.id}
                  className="bg-navy-card border border-navy-border rounded-lg px-4 py-3"
                >
                  <div className="flex justify-between items-center">
                    <div>
                      <p className="font-medium">{a.title}</p>
                      {a.due_date && (
                        <p className="text-xs text-zinc-500">
                          آخر موعد: {new Date(a.due_date).toLocaleString('ar-EG')}
                        </p>
                      )}
                    </div>
                    <div className="flex gap-3 items-center">
                      <button
                        onClick={() => openSubmissions(a.id)}
                        className="text-sm bg-gold text-white font-bold px-4 py-1.5 rounded-lg hover:bg-gold-light transition"
                      >
                        عرض التسليمات
                      </button>
                      <button
                        onClick={() => deleteAssignment(a.id)}
                        className="text-red-600 hover:text-red-500 text-sm"
                      >
                        حذف
                      </button>
                    </div>
                  </div>

                  {activeAssignment === a.id && (
                    <div className="mt-4 space-y-3 border-t border-navy-border pt-4">
                      {submissions.length === 0 ? (
                        <p className="text-zinc-500 text-sm">مفيش تسليمات لسه.</p>
                      ) : (
                        submissions.map((s) => (
                          <SubmissionRow key={s.id} submission={s} onGrade={gradeSubmission} />
                        ))
                      )}
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}
      </main>
    </div>
  )
}

function SubmissionRow({
  submission,
  onGrade,
}: {
  submission: Submission
  onGrade: (id: string, grade: string, feedback: string) => void
}) {
  const [grade, setGrade] = useState(submission.grade?.toString() ?? '')
  const [feedback, setFeedback] = useState(submission.feedback ?? '')

  return (
    <div className="bg-background border border-navy-border rounded-lg p-3">
      <div className="flex justify-between items-center mb-2">
        <p className="font-medium text-sm">{submission.student_name}</p>
        <a
          href={submission.file_url}
          target="_blank"
          rel="noopener noreferrer"
          className="text-gold text-xs hover:text-gold-light"
        >
          تحميل الملف
        </a>
      </div>
      <div className="flex gap-2">
        <input
          type="number"
          placeholder="الدرجة"
          value={grade}
          onChange={(e) => setGrade(e.target.value)}
          className="w-20 bg-navy-card border border-navy-border rounded-lg px-2 py-1 text-sm"
        />
        <input
          type="text"
          placeholder="ملاحظات (اختياري)"
          value={feedback}
          onChange={(e) => setFeedback(e.target.value)}
          className="flex-1 bg-navy-card border border-navy-border rounded-lg px-2 py-1 text-sm"
        />
        <button
          onClick={() => onGrade(submission.id, grade, feedback)}
          className="bg-gold text-white text-sm font-bold px-3 py-1 rounded-lg hover:bg-gold-light transition"
        >
          حفظ
        </button>
      </div>
    </div>
  )
}
