import { Link } from 'react-router-dom';

export function HomeRoute() {
  return (
    <section className="space-y-4">
      <h1 className="text-3xl font-semibold">Pet Grooming Knowledge Base</h1>
      <p className="text-slate-600">Browse service docs and grooming content maintained in D1.</p>
      <Link to="/search" className="inline-flex h-11 items-center rounded-lg bg-brand px-4 text-sm font-semibold text-white">
        Start Search
      </Link>
    </section>
  );
}
