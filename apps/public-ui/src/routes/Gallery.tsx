import { useQuery } from '@tanstack/react-query';
import { fetchPublishedGallery } from '../lib/api';

export function GalleryRoute() {
  const gallery = useQuery({ queryKey: ['public-gallery'], queryFn: fetchPublishedGallery });

  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Grooming Gallery</h1>
      <p className="text-slate-600">Recent published grooming photos.</p>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {(gallery.data || []).map((item) => (
          <article key={item.id} className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            {item.thumb_url ? (
              <img alt={item.alt_en} className="h-52 w-full object-cover" loading="lazy" src={item.thumb_url} />
            ) : null}
            <div className="space-y-1 p-3">
              <h2 className="font-semibold text-ink">{item.title_en}</h2>
              <p className="text-xs text-slate-600">{item.pet_type} {item.before_after ? '· Before/After' : ''}</p>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
