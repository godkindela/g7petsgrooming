import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { api } from '../lib/api';

export function ResultDetailRoute() {
  const params = useParams();
  const id = params.id || '';

  const doc = useQuery({ queryKey: ['doc', id], queryFn: () => api.docById(id), enabled: Boolean(id) });
  const render = useQuery({ queryKey: ['render', id], queryFn: () => api.render(id), enabled: Boolean(id) });

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Result Detail</h1>
      <article className="rounded-lg border border-slate-200 p-4">
        <h2 className="text-lg font-semibold">{(doc.data?.item?.title as string) || id}</h2>
        <p className="mt-1 text-sm text-slate-600">{(doc.data?.item?.intro as string) || ''}</p>
      </article>
      <pre className="overflow-auto rounded-lg border border-slate-200 bg-slate-50 p-4 text-sm">{render.data || ''}</pre>
    </section>
  );
}
