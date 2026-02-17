import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import {
  cancelBooking,
  completeBooking,
  confirmBooking,
  fetchAdminBookings,
  type AdminBookingRow
} from '../lib/api';
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

function role(): 'staff' | 'editor' | 'admin' {
  const saved = localStorage.getItem('g7-admin-role');
  if (saved === 'staff' || saved === 'editor' || saved === 'admin') return saved;
  return 'admin';
}

export function BookingsRoute() {
  const [date, setDate] = useState(melbourneDatePart(new Date()));
  const [status, setStatus] = useState('');
  const [q, setQ] = useState('');

  const bookings = useQuery({
    queryKey: ['admin-bookings', date, status, q],
    queryFn: () => fetchAdminBookings({ date, status, q })
  });

  const confirmMut = useMutation({ mutationFn: confirmBooking, onSuccess: () => void bookings.refetch() });
  const cancelMut = useMutation({ mutationFn: cancelBooking, onSuccess: () => void bookings.refetch() });
  const completeMut = useMutation({ mutationFn: completeBooking, onSuccess: () => void bookings.refetch() });

  const canEdit = useMemo(() => {
    const r = role();
    return r === 'editor' || r === 'admin';
  }, [bookings.data]);

  return (
    <>
      <PageHeader
        title="Bookings"
        description="Manage appointments"
        primaryActionLabel="Refresh"
        onPrimaryAction={() => void bookings.refetch()}
      />

      <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-panel">
        <div className="grid gap-3 md:grid-cols-4">
          <input className="h-11 rounded-lg border border-stone-300 px-3" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
          <select className="h-11 rounded-lg border border-stone-300 px-3" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All status</option>
            <option value="pending">pending</option>
            <option value="confirmed">confirmed</option>
            <option value="cancelled">cancelled</option>
            <option value="completed">completed</option>
          </select>
          <input
            className="h-11 rounded-lg border border-stone-300 px-3 md:col-span-2"
            placeholder="Search client or phone"
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      </section>

      <section className="overflow-x-auto rounded-xl border border-stone-200 bg-white shadow-panel">
        <table className="w-full min-w-[760px] text-left text-sm">
          <thead className="bg-sand text-ink">
            <tr>
              <th className="px-4 py-3">Time</th>
              <th className="px-4 py-3">Service</th>
              <th className="px-4 py-3">Client</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(bookings.data || []).map((row: AdminBookingRow) => (
              <tr key={row.booking_id} className="border-t border-stone-200">
                <td className="px-4 py-3">{fmt(row.start_at)}</td>
                <td className="px-4 py-3">{row.service_name}</td>
                <td className="px-4 py-3">{row.client_name}</td>
                <td className="px-4 py-3">{row.client_phone}</td>
                <td className="px-4 py-3">{row.status}</td>
                <td className="px-4 py-3">
                  <div className="flex flex-wrap gap-2">
                    <Link className="rounded border border-stone-300 px-2 py-1 text-xs" to={`/bookings/${row.booking_id}`}>
                      View
                    </Link>
                    {canEdit ? (
                      <>
                        <button className="rounded border border-stone-300 px-2 py-1 text-xs" onClick={() => confirmMut.mutate(row.booking_id)} type="button">Confirm</button>
                        <button className="rounded border border-stone-300 px-2 py-1 text-xs" onClick={() => cancelMut.mutate(row.booking_id)} type="button">Cancel</button>
                        <button className="rounded border border-stone-300 px-2 py-1 text-xs" onClick={() => completeMut.mutate(row.booking_id)} type="button">Complete</button>
                      </>
                    ) : null}
                  </div>
                </td>
              </tr>
            ))}
            {(bookings.data || []).length === 0 ? (
              <tr>
                <td className="px-4 py-8 text-center text-stone-500" colSpan={6}>No bookings</td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </section>
    </>
  );
}
