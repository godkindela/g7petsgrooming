import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { DataTable } from '../components/layout/DataTable';
import { EntityDrawer } from '../components/layout/EntityDrawer';
import { FilterBar } from '../components/layout/FilterBar';
import { PageHeader } from '../components/layout/PageHeader';
import { fetchDoc, fetchDocs } from '../lib/api';
import type { DocItem } from '@g7/shared';

export function DocsRoute() {
  const [page] = useState(1);
  const [selected, setSelected] = useState<DocItem | null>(null);
  const [filter, setFilter] = useState({ query: '', tag: '', source: '' });

  const docs = useQuery({
    queryKey: ['docs', page, filter.tag, filter.source],
    queryFn: () => fetchDocs({ page, pageSize: 50, tag: filter.tag, source: filter.source })
  });

  const detail = useQuery({
    queryKey: ['doc', selected?.id],
    queryFn: () => fetchDoc(selected!.id),
    enabled: Boolean(selected)
  });

  const filteredRows = useMemo(() => {
    const rows = docs.data?.items || [];
    if (!filter.query.trim()) return rows;
    const q = filter.query.toLowerCase();
    return rows.filter((r) => [r.slug, r.title, r.intro].join(' ').toLowerCase().includes(q));
  }, [docs.data?.items, filter.query]);

  return (
    <>
      <PageHeader
        title="Documents"
        description={`Total ${docs.data?.total || 0} docs`}
        primaryActionLabel="Refresh"
        onPrimaryAction={() => {
          void docs.refetch();
        }}
      />
      <FilterBar query={filter.query} tag={filter.tag} source={filter.source} onChange={setFilter} />
      <DataTable rows={filteredRows} onSelect={setSelected} />
      <EntityDrawer
        open={Boolean(selected)}
        title={selected?.title || 'Entity'}
        detail={detail.data || null}
        onOpenChange={(open) => {
          if (!open) setSelected(null);
        }}
      />
    </>
  );
}
