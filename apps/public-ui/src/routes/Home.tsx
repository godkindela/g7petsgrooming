import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api, fetchPublishedGallery } from '../lib/api';

export function HomeRoute() {
  const docs = useQuery({ queryKey: ['home-docs'], queryFn: () => api.docs({ page: 1, pageSize: 6 }) });
  const gallery = useQuery({ queryKey: ['home-gallery'], queryFn: fetchPublishedGallery });

  return (
    <section className="space-y-6">
      <div className="space-y-3">
        <h1 className="text-3xl font-semibold">G7 Pets Grooming</h1>
        <p className="text-slate-600">Professional grooming in Kew East, Melbourne. Services, FAQ, and gallery are all back online.</p>
        <div className="flex gap-2">
          <Link to="/gallery" className="inline-flex h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white">
            View Gallery
          </Link>
          <Link to="/search" className="inline-flex h-11 items-center rounded-lg border border-slate-300 px-4 text-sm font-semibold text-ink">
            Search Content
          </Link>
        </div>
      </div>

      <section className="rounded-xl border border-slate-200 p-4">
        <h2 className="mb-3 text-xl font-semibold">Site Content</h2>
        <div className="grid gap-2">
          {(docs.data?.items || []).map((d) => (
            <Link className="rounded-lg border border-slate-200 px-3 py-2 text-sm hover:bg-slate-50" key={d.id} to={`/results/${d.id}`}>
              {d.title}
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-xl border border-slate-200 p-4">
        <h2 className="mb-3 text-xl font-semibold">Recent Gallery</h2>
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {(gallery.data || []).slice(0, 6).map((item) => (
            <article className="overflow-hidden rounded-lg border border-slate-200" key={item.id}>
              {item.thumb_url ? <img alt={item.alt_en} className="h-40 w-full object-cover" src={item.thumb_url} /> : null}
              <div className="p-2 text-sm font-medium">{item.title_en}</div>
            </article>
          ))}
        </div>
      </section>
    </section>
  );
}
