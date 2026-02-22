import { useQuery } from '@tanstack/react-query';
import { fetchPublishedGallery } from '../lib/api';

export function GalleryRoute() {
  const gallery = useQuery({ queryKey: ['public-gallery'], queryFn: fetchPublishedGallery });

  return (
    <section className="space-y-8 pb-8">
      <header className="rounded-[24px] border border-[#E6E8EC] bg-white p-6">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">Our Gallery</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">See the G7 Pets Difference</h1>
        <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-600">
          Browse recent grooming results and see how we help pets look and feel their best.
        </p>
      </header>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {(gallery.data || []).map((item) => (
          <article key={item.id} className="group overflow-hidden rounded-[24px] border border-[#E6E8EC] bg-white shadow-sm">
            {item.thumb_url ? (
              <img
                alt={item.alt_en}
                className="h-64 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
                src={item.thumb_url}
              />
            ) : null}
            <div className="space-y-1 p-4">
              <h2 className="text-base font-semibold text-slate-900">{item.title_en}</h2>
              <p className="text-xs font-medium uppercase tracking-wide text-slate-500">
                {item.pet_type || 'Pet'} {item.before_after ? '· Before/After' : ''}
              </p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
