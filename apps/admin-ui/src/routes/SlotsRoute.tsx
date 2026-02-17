import { useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { fetchAdminSlots, generateSlots, updateSlot } from '../lib/api';
import { PageHeader } from '../components/layout/PageHeader';

function melbourneDatePart(date: Date): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const year = parts.find((x) => x.type === 'year')?.value || '1970';
  const month = parts.find((x) => x.type === 'month')?.value || '01';
  const day = parts.find((x) => x.type === 'day')?.value || '01';
  return `${year}-${month}-${day}`;
}

function plusDays(datePart: string, days: number): string {
  const dt = new Date(`${datePart}T00:00:00.000Z`);
  dt.setUTCDate(dt.getUTCDate() + days);
  return dt.toISOString().slice(0, 10);
}

function fmt(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(iso));
}

export function SlotsRoute() {
  const today = melbourneDatePart(new Date());
  const [date, setDate] = useState(today);
  const [genStart, setGenStart] = useState(today);
  const [genEnd, setGenEnd] = useState(plusDays(today, 13));

  const slots = useQuery({ queryKey: ['admin-slots', date], queryFn: () => fetchAdminSlots(date) });
  const generateMutation = useMutation({
    mutationFn: generateSlots,
    onSuccess: () => {
      void slots.refetch();
    }
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number; payload: { is_open?: number; capacity?: number } }) => updateSlot(id, payload),
    onSuccess: () => {
      void slots.refetch();
    }
  });

  return (
    <>
      <PageHeader
        title="Slots"
        description="Open/close and capacity management"
        primaryActionLabel="Refresh"
        onPrimaryAction={() => void slots.refetch()}
      />

      <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-panel">
        <h2 className="mb-3 text-lg font-semibold text-ink">Generate Slots</h2>
        <form
          className="grid gap-3 md:grid-cols-6"
          onSubmit={(e) => {
            e.preventDefault();
            generateMutation.mutate({
              start_date: genStart,
              end_date: genEnd,
              open_time: '09:00',
              close_time: '17:00',
              interval_min: 30,
              capacity: 1
            });
          }}
        >
          <input className="h-11 rounded-lg border border-stone-300 px-3" type="date" value={genStart} onChange={(e) => setGenStart(e.target.value)} />
          <input className="h-11 rounded-lg border border-stone-300 px-3" type="date" value={genEnd} onChange={(e) => setGenEnd(e.target.value)} />
          <button className="h-11 rounded-lg bg-accent px-4 text-sm font-semibold text-white md:col-span-2" type="submit">
            {generateMutation.isPending ? 'Generating...' : 'Generate (09:00-17:00 / 30min / cap1)'}
          </button>
          <input className="h-11 rounded-lg border border-stone-300 px-3 md:col-span-2" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
        </form>
      </section>

      <section className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-panel">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-sand text-ink">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Open</th>
              <th className="px-4 py-3">Capacity</th>
              <th className="px-4 py-3">Booked</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(slots.data || []).map((slot) => (
              <tr key={slot.id} className="border-t border-stone-200">
                <td className="px-4 py-3">{fmt(slot.start_at)}</td>
                <td className="px-4 py-3">{slot.is_open ? 'Yes' : 'No'}</td>
                <td className="px-4 py-3">{slot.capacity}</td>
                <td className="px-4 py-3">{slot.booked_count}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <button
                      className="rounded border border-stone-300 px-2 py-1 text-xs"
                      type="button"
                      onClick={() => updateMutation.mutate({ id: slot.id, payload: { is_open: slot.is_open ? 0 : 1 } })}
                    >
                      {slot.is_open ? 'Close' : 'Open'}
                    </button>
                    <button
                      className="rounded border border-stone-300 px-2 py-1 text-xs"
                      type="button"
                      onClick={() => updateMutation.mutate({ id: slot.id, payload: { capacity: Math.max(1, slot.capacity + 1) } })}
                    >
                      + Capacity
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {(slots.data || []).length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-stone-500" colSpan={5}>No slots</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
