import { Input } from '../ui/input';

type Props = {
  query: string;
  tag: string;
  source: string;
  onChange: (next: { query: string; tag: string; source: string }) => void;
};

export function FilterBar({ query, tag, source, onChange }: Props) {
  return (
    <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-panel">
      <details open>
        <summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.08em] text-stone-500">Filters</summary>
        <div className="mt-3 grid gap-3 md:grid-cols-3">
          <Input
            value={query}
            onChange={(e) => onChange({ query: e.target.value, tag, source })}
            placeholder="Search in current page"
          />
          <Input
            value={tag}
            onChange={(e) => onChange({ query, tag: e.target.value, source })}
            placeholder="Tag"
          />
          <Input
            value={source}
            onChange={(e) => onChange({ query, tag, source: e.target.value })}
            placeholder="Source"
          />
        </div>
      </details>
    </section>
  );
}
