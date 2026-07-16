import LogoutButton from './LogoutButton'
import Breadcrumbs from './Breadcrumbs'

export default function DashboardHeader({
  title,
  subtitle,
}: {
  title: string
  subtitle: string
}) {
  return (
    <header className="flex flex-col gap-2 px-6 sm:px-12 py-5 border-b border-navy-border">
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xl font-bold text-gold-light">اتعلم</span>
          <p className="text-xs text-zinc-500">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4">
          <h1 className="hidden sm:block text-sm text-zinc-300">{title}</h1>
          <LogoutButton />
        </div>
      </div>
      <Breadcrumbs />
    </header>
  )
}
