import { Link, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchAdminBooking } from '../lib/api';
import { PageHeader } from '../components/layout/PageHeader';

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

export function BookingDetailRoute() {
  const params = useParams();
  const id = Number(params.id || 0);
  const detail = useQuery({
    queryKey: ['admin-booking', id],
    queryFn: () => fetchAdminBooking(id),
    enabled: id > 0
  });

  const item = detail.data?.item as Record<string, unknown> | undefined;

  return (
    <>
      <PageHeader
        title={`Booking #${id}`}
        description="Booking detail and event timeline"
        primaryActionLabel="Refresh"
        onPrimaryAction={() => void detail.refetch()}
      />

      <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-panel">
        <Link className="text-sm text-accent underline" to="/bookings">Back to bookings</Link>
      </section>

      <section className="mb-4 rounded-xl border border-stone-200 bg-white p-4 shadow-panel">
        <h2 className="mb-3 text-lg font-semibold text-ink">Detail</h2>
        {item ? (
          <div className="grid gap-2 text-sm md:grid-cols-2">
            <p><span className="font-semibold">Service:</span> {String(item.service_name || '-')}</p>
            <p><span className="font-semibold">Status:</span> {String(item.status || '-')}</p>
            <p><span className="font-semibold">Client:</span> {String(item.client_name || '-')}</p>
            <p><span className="font-semibold">Phone:</span> {String(item.client_phone || '-')}</p>
            <p><span className="font-semibold">Slot Start:</span> {fmt(String(item.start_at || ''))}</p>
            <p><span className="font-semibold">Slot End:</span> {fmt(String(item.end_at || ''))}</p>
            <p><span className="font-semibold">Pet Name:</span> {String(item.pet_name || '-')}</p>
            <p><span className="font-semibold">Pet Breed:</span> {String(item.pet_breed || '-')}</p>
            <p className="md:col-span-2"><span className="font-semibold">Notes:</span> {String(item.notes || '-')}</p>
          </div>
        ) : (
          <p className="text-sm text-stone-600">Loading...</p>
        )}
      </section>

      <section className="rounded-xl border border-stone-200 bg-white p-4 shadow-panel">
        <h2 className="mb-3 text-lg font-semibold text-ink">Events</h2>
        <div className="space-y-2">
          {(detail.data?.events || []).map((evt) => (
            <div key={evt.id} className="rounded-lg border border-stone-200 p-3 text-sm">
              <p className="font-semibold text-ink">{evt.event}</p>
              <p className="text-stone-600">{fmt(evt.at)}</p>
            </div>
          ))}
          {(detail.data?.events || []).length === 0 ? <p className="text-sm text-stone-500">No events.</p> : null}
        </div>
      </section>
    </>
  );
}
