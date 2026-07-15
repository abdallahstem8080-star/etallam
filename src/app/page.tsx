import Link from "next/link";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 bg-background text-foreground">
      {/* Navbar */}
      <header className="flex items-center justify-between px-6 sm:px-12 py-5 border-b border-navy-border">
        <span className="text-2xl font-bold text-gold-light">اتعلم</span>
        <Link
          href="/login"
          className="border border-gold text-gold px-5 py-2 rounded-lg hover:bg-gold hover:text-background transition"
        >
          تسجيل الدخول
        </Link>
      </header>

      {/* Hero */}
      <section className="flex flex-col items-center text-center px-6 py-24 sm:py-32">
        <span className="text-gold-light mb-4 tracking-widest text-sm">
          منصة تعليمية متكاملة
        </span>
        <h1 className="text-4xl sm:text-6xl font-extrabold max-w-3xl leading-tight">
          اتعلم <span className="text-gold">صح</span>، وتابع تقدمك
          <br className="hidden sm:block" /> خطوة بخطوة
        </h1>
        <p className="mt-6 max-w-xl text-lg text-zinc-400">
          امتحانات إلكترونية، تصحيح فوري، وتقارير مباشرة لولي الأمر —
          في مادتي اللغة العربية والعلوم الشرعية
        </p>
        <div className="mt-10 flex gap-4 flex-wrap justify-center">
          <Link
            href="/login"
            className="bg-gold text-background font-bold px-8 py-3 rounded-lg hover:bg-gold-light transition"
          >
            ابدأ الآن
          </Link>
        </div>
      </section>

      {/* Features */}
      <section className="px-6 sm:px-12 py-16 border-t border-navy-border">
        <div className="grid sm:grid-cols-3 gap-6 max-w-5xl mx-auto">
          {[
            {
              title: "امتحانات إلكترونية",
              desc: "أسئلة متنوعة وتصحيح فوري لحظة انتهاء الطالب",
            },
            {
              title: "متابعة أولياء الأمور",
              desc: "تقارير ونتائج تصل فورًا بربط بسيط بكود الطالب",
            },
            {
              title: "لوحة تحكم للمعلم",
              desc: "بنك أسئلة، تقارير أداء، ونشر الامتحانات بسهولة",
            },
          ].map((f) => (
            <div
              key={f.title}
              className="bg-navy-card border border-navy-border rounded-xl p-6"
            >
              <h3 className="text-gold-light font-bold text-lg mb-2">
                {f.title}
              </h3>
              <p className="text-zinc-400 text-sm leading-relaxed">{f.desc}</p>
            </div>
          ))}
        </div>
      </section>

      <footer className="mt-auto px-6 sm:px-12 py-6 border-t border-navy-border text-center text-zinc-500 text-sm">
        © {new Date().getFullYear()} منصة اتعلم
      </footer>
    </div>
  );
}
