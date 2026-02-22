export function AboutRoute() {
  return (
    <section className="space-y-8 pb-8">
      <header className="rounded-[24px] border border-[#E6E8EC] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">About Us</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">Gentle, Professional Grooming in Kew East</h1>
        <p className="mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          G7 Pets Grooming focuses on calm handling, transparent service options, and reliable appointment scheduling.
          We want every pet to feel safe and every owner to know exactly what to expect.
        </p>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'Care-First Approach', desc: 'Low-stress grooming flow tailored to each pet temperament.' },
          { title: 'Clear Communication', desc: 'You get confirmed details by SMS before your appointment.' },
          { title: 'Practical Experience', desc: 'Support for routine clips, special handling, and coat maintenance.' }
        ].map((item) => (
          <article key={item.title} className="rounded-2xl border border-[#E6E8EC] bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[24px] border border-[#E6E8EC] bg-pink-50 p-6">
        <h2 className="text-xl font-bold text-slate-900">Visit Us</h2>
        <p className="mt-2 text-sm text-slate-700">81 Harp Rd, Kew East VIC 3102</p>
        <p className="mt-1 text-sm text-slate-700">Thursday – Sunday · 9:00 AM – 5:00 PM</p>
        <p className="mt-1 text-sm text-slate-700">
          Phone:{' '}
          <a className="font-semibold text-brand hover:underline" href="tel:0488668837">
            0488 668 837
          </a>
        </p>
      </section>
    </section>
  );
}
