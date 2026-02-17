import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../lib/api';

export function SearchRoute() {
  const [q, setQ] = useState('');

  const result = useQuery({
    queryKey: ['search', q],
    queryFn: () => api.search({ q, type: 'doc', pageSize: 30 }),
    enabled: q.trim().length > 0
  });

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">Search</h1>
      <input
        className="h-11 w-full rounded-lg border border-slate-300 px-3"
        value={q}
        placeholder="Search docs"
        onChange={(e) => setQ(e.target.value)}
      />
      <div className="grid gap-3">
        {(result.data?.items || []).map((item) => (
          <article key={item.id} className="rounded-lg border border-slate-200 p-4">
            <h2 className="text-lg font-semibold">{item.title}</h2>
            <p className="mt-1 text-sm text-slate-600">{item.snippet}</p>
            <Link className="mt-3 inline-block text-sm font-semibold text-brand" to={`/results/${item.id}`}>
              View Detail
            </Link>
          </article>
        ))}
      </div>
    </section>
  );
}
