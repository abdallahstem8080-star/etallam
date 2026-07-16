'use client'

import { usePathname } from 'next/navigation'
import Link from 'next/link'

// خريطة ترجمة أجزاء الرابط لأسماء عربية مفهومة
const labelMap: Record<string, string> = {
  dashboard: 'الرئيسية',
  admin: 'لوحة الأدمن',
  teacher: 'لوحة المعلم',
  student: 'لوحة الطالب',
  parent: 'لوحة ولي الأمر',
  courses: 'الكورسات',
  course: 'الكورس',
  module: 'المديول',
  exam: 'الامتحان',
}

export default function Breadcrumbs() {
  const pathname = usePathname()
  const segments = pathname.split('/').filter(Boolean)

  // نتجاهل الأجزاء اللي هي IDs (uuid) من العرض، نعرض بس الأجزاء المعروفة
  const isId = (s: string) => /^[0-9a-f]{8}-[0-9a-f]{4}/i.test(s)

  const crumbs = segments
    .map((seg, i) => {
      const href = '/' + segments.slice(0, i + 1).join('/')
      const label = isId(seg) ? null : labelMap[seg] ?? seg
      return label ? { href, label } : null
    })
    .filter(Boolean) as { href: string; label: string }[]

  if (crumbs.length === 0) return null

  return (
    <nav className="text-xs sm:text-sm text-zinc-500 flex items-center gap-1.5 flex-wrap">
      {crumbs.map((c, i) => {
        const isLast = i === crumbs.length - 1
        return (
          <span key={c.href} className="flex items-center gap-1.5">
            {isLast ? (
              <span className="text-gold-light font-medium">{c.label}</span>
            ) : (
              <Link href={c.href} className="hover:text-gold transition-colors">
                {c.label}
              </Link>
            )}
            {!isLast && <span className="text-zinc-700">/</span>}
          </span>
        )
      })}
    </nav>
  )
}
