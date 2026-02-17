import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { PageHeader } from '../components/layout/PageHeader';
import { enqueueReindex, fetchJobs } from '../lib/api';

export function JobsRoute() {
  const [source, setSource] = useState('admin-ui');
  const jobs = useQuery({ queryKey: ['jobs'], queryFn: fetchJobs });
  const reindex = useMutation({ mutationFn: enqueueReindex, onSuccess: () => void jobs.refetch() });

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Queue and inspect background jobs"
        primaryActionLabel="Run Reindex"
        onPrimaryAction={() => {
          reindex.mutate({ source, triggeredAt: new Date().toISOString() });
        }}
      />
      <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-panel">
        <label className="mb-2 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500">Payload Source</label>
        <input
          className="h-11 w-full rounded-lg border border-stone-300 bg-white px-3 text-sm text-ink outline-none ring-accent/40 focus:ring-2"
          value={source}
          onChange={(e) => setSource(e.target.value)}
        />
      </section>
      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-panel">
        <h2 className="mb-3 text-lg font-semibold">Recent Jobs</h2>
        <div className="space-y-2">
          {(jobs.data || []).map((job) => (
            <div className="rounded-lg border border-stone-200 p-3" key={String(job.id)}>
              <p className="text-sm font-semibold text-ink">#{String(job.id)} {String(job.job_type)}</p>
              <p className="text-xs text-stone-600">Status: {String(job.status)}</p>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
