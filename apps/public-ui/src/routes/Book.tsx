import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { createBooking, fetchBookingServices, fetchBookingSlots, type BookingService, type CreatedBooking } from '../lib/api';

type ClientForm = {
  client_name: string;
  client_phone: string;
  pet_name: string;
  pet_breed: string;
  notes: string;
};

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

function formatSlotTime(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false
  }).format(new Date(iso));
}

function formatSlotDateTime(iso: string): string {
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

const STEPS = ['Service', 'Time', 'Client', 'Confirm'];

export function BookRoute() {
  const today = melbourneDatePart(new Date());
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<number | null>(null);
  const [date, setDate] = useState(today);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [client, setClient] = useState<ClientForm>({
    client_name: '',
    client_phone: '',
    pet_name: '',
    pet_breed: '',
    notes: ''
  });
  const [created, setCreated] = useState<CreatedBooking | null>(null);
  const [error, setError] = useState('');

  const services = useQuery({ queryKey: ['booking-services'], queryFn: fetchBookingServices });
  const slots = useQuery({
    queryKey: ['booking-slots', date, serviceId],
    queryFn: () => fetchBookingSlots({ date, serviceId: serviceId! }),
    enabled: Boolean(serviceId)
  });

  const selectedService = useMemo<BookingService | null>(
    () => (services.data || []).find((x) => x.id === serviceId) || null,
    [services.data, serviceId]
  );

  const selectedSlot = useMemo(
    () => (slots.data || []).find((x) => x.id === slotId) || null,
    [slots.data, slotId]
  );

  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      setCreated(data);
      setStep(5);
      setError('');
    },
    onError: (err) => {
      const code = (err as Error & { code?: string }).code;
      if (code === 'SLOT_CONFLICT') {
        setError('该时间刚被预约，请重新选择');
        setStep(2);
      } else {
        setError('提交失败，请稍后重试');
      }
    }
  });

  const dateOptions = useMemo(() => {
    const list: string[] = [];
    for (let i = 0; i < 14; i += 1) list.push(plusDays(today, i));
    return list;
  }, [today]);

  return (
    <section className="space-y-4">
      <header className="rounded-xl border border-slate-200 bg-slate-50 p-4">
        <h1 className="text-2xl font-semibold">Book Appointment</h1>
        <p className="mt-1 text-sm text-slate-600">Australia/Melbourne time zone, next 14 days.</p>
        <ol className="mt-3 flex flex-wrap gap-2 text-xs">
          {STEPS.map((label, idx) => (
            <li key={label} className={`rounded-full px-3 py-1 ${step >= idx + 1 ? 'bg-brand text-white' : 'bg-slate-200 text-slate-700'}`}>
              {idx + 1}. {label}
            </li>
          ))}
        </ol>
      </header>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {step === 1 ? (
        <section className="grid gap-3 sm:grid-cols-2">
          {(services.data || []).map((svc) => (
            <button
              key={svc.id}
              type="button"
              onClick={() => {
                setServiceId(svc.id);
                setSlotId(null);
                setStep(2);
                setError('');
              }}
              className="rounded-lg border border-slate-200 p-4 text-left hover:border-brand"
            >
              <p className="text-base font-semibold">{svc.name}</p>
              <p className="mt-1 text-sm text-slate-600">{svc.duration_min} min</p>
            </button>
          ))}
          {services.isLoading ? <p className="text-sm text-slate-600">Loading services...</p> : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className="space-y-3 rounded-xl border border-slate-200 p-4">
          <div className="flex flex-wrap gap-2">
            {dateOptions.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => {
                  setDate(d);
                  setSlotId(null);
                }}
                className={`rounded-md border px-3 py-2 text-sm ${date === d ? 'border-brand bg-brand text-white' : 'border-slate-300'}`}
              >
                {d}
              </button>
            ))}
          </div>
          <div className="grid gap-2 sm:grid-cols-3">
            {(slots.data || []).map((slot) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSlotId(slot.id)}
                className={`rounded-md border px-3 py-2 text-sm ${slotId === slot.id ? 'border-brand bg-brand text-white' : 'border-slate-300'}`}
              >
                {formatSlotTime(slot.start_at)}
              </button>
            ))}
          </div>
          {!slots.isLoading && (slots.data || []).length === 0 ? <p className="text-sm text-slate-600">No slots available.</p> : null}
          <div className="flex gap-2">
            <button className="rounded-md border px-4 py-2 text-sm" type="button" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              type="button"
              disabled={!slotId}
              onClick={() => setStep(3)}
            >
              Continue
            </button>
          </div>
        </section>
      ) : null}

      {step === 3 ? (
        <section className="rounded-xl border border-slate-200 p-4">
          <form
            className="grid gap-3 sm:grid-cols-2"
            onSubmit={(e) => {
              e.preventDefault();
              if (!client.client_name.trim() || !client.client_phone.trim()) {
                setError('请填写姓名和电话');
                return;
              }
              setError('');
              setStep(4);
            }}
          >
            <input
              className="h-11 rounded-lg border border-slate-300 px-3"
              placeholder="Client Name *"
              value={client.client_name}
              onChange={(e) => setClient((prev) => ({ ...prev, client_name: e.target.value }))}
            />
            <input
              className="h-11 rounded-lg border border-slate-300 px-3"
              placeholder="Phone *"
              value={client.client_phone}
              onChange={(e) => setClient((prev) => ({ ...prev, client_phone: e.target.value }))}
            />
            <input
              className="h-11 rounded-lg border border-slate-300 px-3"
              placeholder="Pet Name"
              value={client.pet_name}
              onChange={(e) => setClient((prev) => ({ ...prev, pet_name: e.target.value }))}
            />
            <input
              className="h-11 rounded-lg border border-slate-300 px-3"
              placeholder="Pet Breed"
              value={client.pet_breed}
              onChange={(e) => setClient((prev) => ({ ...prev, pet_breed: e.target.value }))}
            />
            <textarea
              className="min-h-[96px] rounded-lg border border-slate-300 px-3 py-2 text-sm sm:col-span-2"
              placeholder="Notes"
              value={client.notes}
              onChange={(e) => setClient((prev) => ({ ...prev, notes: e.target.value }))}
            />
            <div className="flex gap-2 sm:col-span-2">
              <button className="rounded-md border px-4 py-2 text-sm" type="button" onClick={() => setStep(2)}>
                Back
              </button>
              <button className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white" type="submit">
                Continue
              </button>
            </div>
          </form>
        </section>
      ) : null}

      {step === 4 ? (
        <section className="space-y-3 rounded-xl border border-slate-200 p-4">
          <h2 className="text-lg font-semibold">Confirm</h2>
          <p className="text-sm text-slate-700">Service: {selectedService?.name || '-'}</p>
          <p className="text-sm text-slate-700">Time: {selectedSlot ? formatSlotDateTime(selectedSlot.start_at) : '-'}</p>
          <p className="text-sm text-slate-700">Client: {client.client_name} / {client.client_phone}</p>
          <div className="flex gap-2">
            <button className="rounded-md border px-4 py-2 text-sm" type="button" onClick={() => setStep(3)}>
              Back
            </button>
            <button
              className="rounded-md bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-60"
              type="button"
              disabled={!serviceId || !slotId || createMutation.isPending}
              onClick={() => {
                if (!serviceId || !slotId) return;
                createMutation.mutate({
                  service_id: serviceId,
                  slot_id: slotId,
                  client_name: client.client_name,
                  client_phone: client.client_phone,
                  pet_name: client.pet_name || undefined,
                  pet_breed: client.pet_breed || undefined,
                  notes: client.notes || undefined
                });
              }}
            >
              {createMutation.isPending ? 'Submitting...' : 'Submit Booking'}
            </button>
          </div>
        </section>
      ) : null}

      {step === 5 && created ? (
        <section className="space-y-2 rounded-xl border border-emerald-200 bg-emerald-50 p-4">
          <h2 className="text-lg font-semibold text-emerald-800">Booking Confirmed</h2>
          <p className="text-sm text-emerald-700">Booking ID: {created.id}</p>
          <p className="text-sm text-emerald-700">Service: {created.service_name}</p>
          <p className="text-sm text-emerald-700">Time: {formatSlotDateTime(created.start_at)}</p>
          <p className="text-sm text-emerald-700">Phone: {client.client_phone}</p>
        </section>
      ) : null}
    </section>
  );
}
