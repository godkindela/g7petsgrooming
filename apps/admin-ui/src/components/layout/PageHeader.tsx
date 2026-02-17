import { Button } from '../ui/button';

type Props = {
  title: string;
  description: string;
  primaryActionLabel: string;
  onPrimaryAction: () => void;
};

export function PageHeader({ title, description, primaryActionLabel, onPrimaryAction }: Props) {
  return (
    <header className="mb-6 rounded-2xl border border-stone-200/80 bg-white/90 p-6 shadow-panel">
      <p className="text-xs font-semibold uppercase tracking-[0.1em] text-stone-500">Admin Workspace</p>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl text-ink">{title}</h1>
          <p className="mt-1 text-sm text-stone-600">{description}</p>
        </div>
        <Button onClick={onPrimaryAction}>{primaryActionLabel}</Button>
      </div>
    </header>
  );
}
