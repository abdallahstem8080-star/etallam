'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { motion, AnimatePresence } from 'framer-motion'
import { createClient } from '@/lib/supabase/client'

type Course = {
  id: string
  title: string
  description: string | null
  thumbnail_url: string | null
  price: number | null
  original_price: number | null
  is_free: boolean
  subject_id: string
}
type Subject = { id: string; name: string }

const teacherSlides = [
  {
    name: 'أ/ محمد عبدالله',
    subject: 'اللغة العربية',
    tagline: 'مستقبلك في إيدك... هنبسّط أصعب قواعد النحو والبلاغة',
    bio: 'مدرس لغة عربية بخبرة سنوات طويلة في تدريس المرحلة الثانوية، متخصص في تبسيط القواعد المعقدة بأسلوب عملي وممتع.',
  },
  {
    name: 'أ/ فاطمة أحمد',
    subject: 'العلوم الشرعية',
    tagline: 'خليك قريب من دينك بأسلوب سهل وممتع',
    bio: 'مدرّسة علوم شرعية متخصصة في تبسيط الفقه والتفسير للطلاب بأسلوب واضح ومترابط.',
  },
]

export default function Home() {
  const supabase = createClient()
  const [courses, setCourses] = useState<Course[]>([])
  const [subjects, setSubjects] = useState<Subject[]>([])
  const [slide, setSlide] = useState(0)
  const [bioOpen, setBioOpen] = useState(false)

  useEffect(() => {
    async function load() {
      const { data: crs } = await supabase
        .from('courses')
        .select('id, title, description, thumbnail_url, price, original_price, is_free, subject_id')
        .limit(6)
      setCourses(crs ?? [])
      const { data: subs } = await supabase.from('subjects').select('id, name')
      setSubjects(subs ?? [])
    }
    load()
  }, [])

  useEffect(() => {
    const timer = setInterval(() => {
      setSlide((s) => (s + 1) % teacherSlides.length)
    }, 6000)
    return () => clearInterval(timer)
  }, [])

  const current = teacherSlides[slide]

  return (
    <div className="flex flex-col flex-1 bg-background text-foreground">
      {/* الهيدر */}
      <header className="flex items-center justify-between px-6 sm:px-12 py-4 bg-white shadow-sm sticky top-0 z-20">
        <Link href="/" className="text-2xl font-bold text-gold">
          اتعلم
        </Link>

        <nav className="hidden md:flex items-center gap-8 text-sm text-zinc-600">
          <Link href="/" className="hover:text-gold transition">الرئيسية</Link>
          <a href="#about" className="hover:text-gold transition">عن المنصة</a>
          <a href="#contact" className="hover:text-gold transition">تواصل معنا</a>
        </nav>

        <div className="flex items-center gap-3">
          <Link
            href="/login"
            className="border border-gold text-gold px-5 py-2 rounded-lg text-sm hover:bg-gold hover:text-white transition"
          >
            تسجيل الدخول
          </Link>
          <Link
            href="/signup"
            className="bg-gold text-white px-5 py-2 rounded-lg text-sm font-bold hover:bg-gold-light transition"
          >
            إنشاء حساب جديد
          </Link>
        </div>
      </header>

      {/* سلايدر المدرسين */}
      <section className="relative bg-gold overflow-hidden">
        <AnimatePresence mode="wait">
          <motion.div
            key={slide}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.5 }}
            className="flex flex-col-reverse md:flex-row items-center justify-between px-6 sm:px-16 py-16 gap-10"
          >
            <div className="text-white max-w-lg text-center md:text-right">
              <p className="text-sm text-white/70 mb-2">{current.subject}</p>
              <h1 className="text-3xl sm:text-4xl font-extrabold mb-4">{current.name}</h1>
              <p className="text-white/90 mb-6">{current.tagline}</p>
              <button
                onClick={() => setBioOpen(true)}
                className="bg-white text-gold font-bold px-6 py-2.5 rounded-lg hover:bg-gold-light hover:text-white transition"
              >
                من هو الدكتور؟
              </button>
            </div>

            <div className="w-40 h-40 sm:w-56 sm:h-56 rounded-full bg-white/10 border-4 border-white/20 flex items-center justify-center text-6xl">
              👨‍🏫
            </div>
          </motion.div>
        </AnimatePresence>

        <div className="flex justify-center gap-2 pb-4">
          {teacherSlides.map((_, i) => (
            <button
              key={i}
              onClick={() => setSlide(i)}
              className={`w-2 h-2 rounded-full transition ${
                i === slide ? 'bg-white' : 'bg-white/30'
              }`}
            />
          ))}
        </div>
      </section>

      {/* نافذة السيرة الذاتية */}
      <AnimatePresence>
        {bioOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 px-4"
            onClick={() => setBioOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white rounded-xl shadow-lg max-w-md w-full p-8"
            >
              <h3 className="text-xl font-bold text-gold mb-3">{current.name}</h3>
              <p className="text-zinc-600 leading-relaxed">{current.bio}</p>
              <button
                onClick={() => setBioOpen(false)}
                className="mt-6 bg-gold text-white px-5 py-2 rounded-lg text-sm hover:bg-gold-light transition"
              >
                إغلاق
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* المميزات */}
      <section id="about" className="px-6 sm:px-12 py-16">
        <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            { icon: '🎓', title: 'للطلاب', desc: 'شرح تفاعلي، كويزات سريعة، ومتابعة لحظية لإنجازك' },
            { icon: '👨‍🏫', title: 'للمعلمين', desc: 'توفير الوقت وإدارة مجموعات الحصص بسهولة' },
            { icon: '👪', title: 'لأولياء الأمور', desc: 'متابعة الأبناء لحظة بلحظة وتقارير فورية' },
          ].map((f) => (
            <div key={f.title} className="bg-white border border-navy-border rounded-xl p-6 shadow-sm">
              <div className="text-3xl mb-3">{f.icon}</div>
              <h3 className="font-bold text-lg mb-2">{f.title}</h3>
              <p className="text-zinc-500 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* كروت الكورسات */}
      <section className="px-6 sm:px-12 py-16 bg-white">
        <h2 className="text-2xl font-bold text-center mb-10">الكورسات المتاحة</h2>

        {courses.length === 0 ? (
          <p className="text-center text-zinc-500">مفيش كورسات متاحة دلوقتي.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {courses.map((c) => (
              <motion.div
                key={c.id}
                whileHover={{ y: -4 }}
                transition={{ duration: 0.2 }}
                className="bg-white border border-navy-border rounded-xl overflow-hidden shadow-sm"
              >
                <div className="relative h-36 bg-gradient-to-br from-gold to-gold-light flex items-center justify-center text-white text-4xl">
                  📘
                  <span className="absolute top-3 right-3 bg-gold-light text-white text-xs font-bold px-3 py-1 rounded-full">
                    {c.is_free ? 'كورس مجاني' : 'مدفوع'}
                  </span>
                  <button className="absolute top-3 left-3 text-white/80 hover:text-white">
                    ♡
                  </button>
                </div>

                <div className="p-4">
                  <h3 className="font-bold mb-1">{c.title}</h3>
                  <p className="text-xs text-zinc-500 mb-3">
                    {subjects.find((s) => s.id === c.subject_id)?.name}
                  </p>

                  <div className="mb-3">
                    {c.is_free || !c.price ? (
                      <span className="text-gold-light font-bold text-sm">مجاني</span>
                    ) : (
                      <span className="text-sm">
                        {c.original_price && (
                          <span className="line-through text-zinc-400 ml-2">
                            {c.original_price} جنيه
                          </span>
                        )}
                        <span className="text-gold font-bold">{c.price} جنيه</span>
                      </span>
                    )}
                  </div>

                  <Link
                    href="/signup"
                    className="block text-center bg-gold text-white font-bold py-2 rounded-lg text-sm hover:bg-gold-light transition"
                  >
                    الاشتراك في الكورس !
                  </Link>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </section>

      <footer id="contact" className="px-6 sm:px-12 py-8 border-t border-navy-border text-center text-zinc-500 text-sm bg-white">
        © {new Date().getFullYear()} منصة اتعلم
      </footer>
    </div>
  )
}
