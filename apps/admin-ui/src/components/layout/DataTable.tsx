import {
  type ColumnDef,
  flexRender,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type SortingState
} from '@tanstack/react-table';
import { useMemo, useState } from 'react';
import type { DocItem } from '@g7/shared';

type Props = {
  rows: DocItem[];
  onSelect: (row: DocItem) => void;
};

export function DataTable({ rows, onSelect }: Props) {
  const [sorting, setSorting] = useState<SortingState>([{ id: 'updatedAt', desc: true }]);
  const [dense, setDense] = useState(false);

  const columns = useMemo<ColumnDef<DocItem>[]>(
    () => [
      { accessorKey: 'slug', header: 'Slug' },
      { accessorKey: 'title', header: 'Title' },
      { accessorKey: 'canonicalPath', header: 'Path' },
      { accessorKey: 'updatedAt', header: 'Updated' }
    ],
    []
  );

  const table = useReactTable({
    data: rows,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    initialState: { pagination: { pageSize: 10 } }
  });

  const cellPadding = dense ? 'px-3 py-2' : 'px-4 py-3';

  return (
    <section className="overflow-hidden rounded-xl border border-stone-200 bg-white shadow-panel">
      <div className="flex items-center justify-between border-b border-stone-200 px-4 py-3 text-sm">
        <div className="font-medium text-stone-700">{rows.length} rows</div>
        <button
          className="rounded-md border border-stone-300 px-3 py-1 text-xs font-semibold text-ink"
          onClick={() => setDense((v) => !v)}
          type="button"
        >
          Density: {dense ? 'Compact' : 'Comfortable'}
        </button>
      </div>
      <table className="w-full border-collapse text-left text-sm">
        <thead className="bg-sand">
          {table.getHeaderGroups().map((headerGroup) => (
            <tr key={headerGroup.id}>
              {headerGroup.headers.map((header) => (
                <th
                  key={header.id}
                  className={`${cellPadding} cursor-pointer font-semibold text-ink`}
                  onClick={header.column.getToggleSortingHandler()}
                >
                  {flexRender(header.column.columnDef.header, header.getContext())}
                </th>
              ))}
            </tr>
          ))}
        </thead>
        <tbody>
          {table.getRowModel().rows.map((row) => (
            <tr
              key={row.id}
              className="cursor-pointer border-t border-stone-200 transition hover:bg-stone-50"
              onClick={() => onSelect(row.original)}
            >
              {row.getVisibleCells().map((cell) => (
                <td key={cell.id} className={`${cellPadding} text-stone-700`}>
                  {flexRender(cell.column.columnDef.cell, cell.getContext())}
                </td>
              ))}
            </tr>
          ))}
          {rows.length === 0 ? (
            <tr>
              <td className="px-4 py-8 text-center text-stone-500" colSpan={4}>
                No rows
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className="flex items-center justify-end gap-2 border-t border-stone-200 px-4 py-3">
        <button
          className="rounded-md border border-stone-300 px-3 py-1 text-xs"
          onClick={() => table.previousPage()}
          disabled={!table.getCanPreviousPage()}
          type="button"
        >
          Prev
        </button>
        <button
          className="rounded-md border border-stone-300 px-3 py-1 text-xs"
          onClick={() => table.nextPage()}
          disabled={!table.getCanNextPage()}
          type="button"
        >
          Next
        </button>
      </div>
    </section>
  );
}
