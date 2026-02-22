import { useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Link, useSearchParams } from 'react-router-dom';
import {
  createBooking,
  fetchBookingServices,
  fetchBookingSlots,
  fetchPublicWeekdays,
  type BookingService,
  type CreatedBooking
} from '../lib/api';

type ClientForm = {
  ownerName: string;
  mobile: string;
  petName: string;
  breed: string;
  notes: string;
};

type CalendarCell = {
  datePart: string;
};

const DAY_LABELS = ['SUN', 'MON', 'TUE', 'WED', 'THU', 'FRI', 'SAT'];
const STEPS = ['Service', 'Time', 'Details', 'Confirmed'];
const BORDER = 'border-[#E6E8EC]';
const AU_MOBILE_REGEX = /^(?:\+?61|0)4\d{8}$/;

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

function toDatePart(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
}

function dateFromDatePart(datePart: string): Date {
  const [year, month, day] = datePart.split('-').map((x) => Number.parseInt(x, 10));
  return new Date(Date.UTC(year, month - 1, day));
}

function addDays(datePart: string, days: number): string {
  const dt = dateFromDatePart(datePart);
  dt.setUTCDate(dt.getUTCDate() + days);
  return toDatePart(dt.getUTCFullYear(), dt.getUTCMonth() + 1, dt.getUTCDate());
}

function buildTwoWeekCells(todayDatePart: string): CalendarCell[] {
  const todayDate = dateFromDatePart(todayDatePart);
  const weekStart = addDays(todayDatePart, -todayDate.getUTCDay()); // Sunday start
  const cells: CalendarCell[] = [];
  for (let i = 0; i < 14; i += 1) cells.push({ datePart: addDays(weekStart, i) });
  return cells;
}

function weekdayFromDatePart(datePart: string): number {
  const [year, month, day] = datePart.split('-').map((x) => Number.parseInt(x, 10));
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function formatSlotTime(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true
  }).format(new Date(iso));
}

function formatDatePart(datePart: string): string {
  const [year, month, day] = datePart.split('-').map((x) => Number.parseInt(x, 10));
  return new Intl.DateTimeFormat('en-AU', {
    year: 'numeric',
    month: 'short',
    day: '2-digit'
  }).format(new Date(Date.UTC(year, month - 1, day)));
}

function formatSlotDateTime(iso: string): string {
  return new Intl.DateTimeFormat('en-AU', {
    timeZone: 'Australia/Melbourne',
    year: 'numeric',
    month: 'short',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  }).format(new Date(iso));
}

function normalizeMobile(input: string): string {
  return input.replace(/\s+/g, '');
}

function summaryTime(slotIso: string | null, datePart: string): string {
  if (slotIso) return formatSlotTime(slotIso);
  return `${formatDatePart(datePart)} (select time)`;
}

export function BookRoute() {
  const [searchParams] = useSearchParams();
  const today = melbourneDatePart(new Date());
  const presetService = Number.parseInt(searchParams.get('serviceId') || '', 10);
  const presetIsValid = Number.isFinite(presetService);
  const [step, setStep] = useState(presetIsValid ? 2 : 1);
  const [serviceId, setServiceId] = useState<number | null>(presetIsValid ? presetService : null);
  const [date, setDate] = useState(today);
  const [slotId, setSlotId] = useState<number | null>(null);
  const [client, setClient] = useState<ClientForm>({
    ownerName: '',
    mobile: '',
    petName: '',
    breed: '',
    notes: ''
  });
  const [created, setCreated] = useState<CreatedBooking | null>(null);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');

  const services = useQuery({ queryKey: ['booking-services'], queryFn: fetchBookingServices });
  const weekdays = useQuery({ queryKey: ['public-weekdays'], queryFn: fetchPublicWeekdays });
  const slots = useQuery({
    queryKey: ['booking-slots', date, serviceId],
    queryFn: () => fetchBookingSlots({ date, serviceId: serviceId! }),
    enabled: Boolean(serviceId)
  });

  const selectedService = useMemo<BookingService | null>(
    () => (services.data || []).find((x) => x.id === serviceId) || null,
    [services.data, serviceId]
  );
  const selectedSlot = useMemo(() => (slots.data || []).find((x) => x.id === slotId) || null, [slots.data, slotId]);
  const calendarCells = useMemo(() => buildTwoWeekCells(today), [today]);
  const enabledWeekdays = useMemo(() => {
    const set = new Set<number>();
    for (const row of weekdays.data || []) {
      if (row.is_enabled === 1) set.add(row.weekday);
    }
    return set;
  }, [weekdays.data]);

  const createMutation = useMutation({
    mutationFn: createBooking,
    onSuccess: (data) => {
      setCreated(data);
      setStep(4);
      setError('');
      setFormError('');
    },
    onError: (err) => {
      const code = (err as Error & { code?: string }).code;
      if (code === 'SLOT_CONFLICT') {
        setError('That time slot was just booked. Please choose another time.');
        setStep(2);
        setSlotId(null);
      } else {
        setError('Something went wrong while submitting. Please try again.');
      }
    }
  });

  const currentStep = step === 4 ? 4 : step;

  function validateStep3(): boolean {
    if (!selectedService) {
      setError('Please select a service.');
      setStep(1);
      return false;
    }
    if (!slotId || !selectedSlot) {
      setError('Please select a time slot.');
      setStep(2);
      return false;
    }
    if (date < today) {
      setFormError('Selected date cannot be in the past.');
      return false;
    }
    if (!client.ownerName.trim() || !client.petName.trim()) {
      setFormError('Owner name and pet name are required.');
      return false;
    }
    const mobile = normalizeMobile(client.mobile);
    if (!AU_MOBILE_REGEX.test(mobile)) {
      setFormError('Please enter a valid Australian mobile number (e.g. 04XXXXXXXX).');
      return false;
    }
    setFormError('');
    return true;
  }

  const renderCell = (cell: CalendarCell) => {
    const day = Number(cell.datePart.slice(8, 10));
    const selected = date === cell.datePart;
    const isPast = cell.datePart < today;
    const isWeekdayEnabled = enabledWeekdays.size === 0 ? true : enabledWeekdays.has(weekdayFromDatePart(cell.datePart));
    const disabled = isPast || !isWeekdayEnabled;

    return (
      <button
        key={cell.datePart}
        type="button"
        disabled={disabled}
        onClick={() => {
          if (disabled) return;
          setDate(cell.datePart);
          setSlotId(null);
          setError('');
        }}
        className={`h-10 rounded-lg text-sm font-medium ${
          selected ? 'bg-brand text-white' : disabled ? 'text-slate-300' : 'text-slate-800 hover:border-brand hover:text-brand'
        }`}
      >
        {day}
      </button>
    );
  };

  return (
    <section className="rounded-[24px] border border-[#E6E8EC] bg-slate-50 p-4 sm:p-6">
      <div className="mx-auto max-w-3xl space-y-6 rounded-[24px] border border-[#E6E8EC] bg-white p-4 shadow-sm sm:p-6">
      <header className={`rounded-[20px] border ${BORDER} bg-white p-6`}>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">Book an Appointment</h1>
        <p className="mt-2 text-sm text-slate-600">Australia/Melbourne timezone. Fast confirmation by SMS.</p>
        <ol className="mt-5 flex items-center justify-between gap-2">
          {STEPS.map((label, idx) => (
            <li
              key={label}
              className="flex flex-col items-center gap-1"
            >
              <span
                className={`inline-flex h-8 w-8 items-center justify-center rounded-full text-xs font-semibold ${
                  currentStep >= idx + 1 ? 'bg-brand text-white' : 'bg-slate-100 text-slate-600'
                }`}
              >
                {idx + 1}
              </span>
              <span className={`text-[10px] font-semibold uppercase tracking-wide ${currentStep >= idx + 1 ? 'text-brand' : 'text-slate-400'}`}>
                {label}
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-slate-600">
          <Link className="underline hover:text-slate-900" to="/policies">
            View booking policies
          </Link>
        </p>
      </header>

      {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">{error}</p> : null}

      {step === 1 ? (
        <section className="grid gap-4 sm:grid-cols-2">
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
              className={`rounded-2xl border ${BORDER} bg-white p-5 text-left shadow-sm transition hover:border-pink-200`}
            >
              <p className="text-base font-semibold text-slate-900">{svc.name}</p>
              <p className="mt-1 text-sm text-slate-600">{svc.duration_min} min</p>
              <p className="mt-1 text-sm font-medium text-slate-800">From ${Math.round(svc.price_cents / 100)}</p>
            </button>
          ))}
          {services.isLoading ? <p className="text-sm text-slate-600">Loading services...</p> : null}
        </section>
      ) : null}

      {step === 2 ? (
        <section className={`space-y-4 rounded-[24px] border ${BORDER} bg-white p-5 sm:p-6 shadow-sm`}>
          <div className="flex items-center justify-center">
            <p className="text-base font-semibold text-slate-900">This week and next week</p>
          </div>

          <div className={`rounded-2xl border ${BORDER} p-3`}>
            <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold tracking-wide text-slate-500">
              {DAY_LABELS.map((label) => (
                <p key={label}>{label}</p>
              ))}
            </div>
            <div className="mt-2 grid grid-cols-7 gap-1">{calendarCells.map(renderCell)}</div>
          </div>

          <article className={`rounded-2xl border ${BORDER} bg-pink-50 p-4`}>
            <p className="text-xs uppercase tracking-wide text-slate-500">Service</p>
            <h3 className="mt-1 text-lg font-semibold text-slate-900">{selectedService?.name || '-'}</h3>
            <p className="mt-1 text-sm text-slate-600">Duration: {selectedService?.duration_min || '-'} min</p>
          </article>

          <div>
            <h3 className="mb-2 text-base font-semibold text-slate-900">Available time slots</h3>
            <div className="grid gap-2 sm:grid-cols-3">
              {(slots.data || []).map((slot) => (
                <button
                  key={slot.id}
                  type="button"
                  onClick={() => {
                    setSlotId(slot.id);
                    setError('');
                  }}
                  className={`h-10 rounded-lg border text-sm font-medium ${
                    slotId === slot.id
                      ? 'border-brand bg-brand text-white'
                      : `${BORDER} bg-white text-slate-800 hover:border-pink-200`
                  }`}
                >
                  {formatSlotTime(slot.start_at)}
                </button>
              ))}
            </div>
            {slots.isLoading ? <p className="mt-2 text-sm text-slate-600">Loading slots...</p> : null}
            {!slots.isLoading && (slots.data || []).length === 0 ? <p className="mt-2 text-sm text-slate-600">No slots available for this date.</p> : null}
          </div>

          <div className="flex gap-2">
            <button className={`rounded-lg border ${BORDER} px-4 py-2 text-sm`} type="button" onClick={() => setStep(1)}>
              Back
            </button>
            <button
              className="rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
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
        <section className="space-y-4">
          <article className={`rounded-2xl border ${BORDER} bg-pink-50 p-4`}>
            <p className="text-xs uppercase tracking-wide text-slate-500">Booking summary</p>
            <div className="mt-2 grid gap-2 text-sm text-slate-700 sm:grid-cols-3">
              <p>
                <span className="font-medium text-slate-900">Service:</span> {selectedService?.name || '-'}
              </p>
              <p>
                <span className="font-medium text-slate-900">Date:</span> {formatDatePart(date)}
              </p>
              <p>
                <span className="font-medium text-slate-900">Time:</span> {summaryTime(selectedSlot?.start_at || null, date)}
              </p>
            </div>
          </article>

          <section className={`rounded-[24px] border ${BORDER} bg-white p-5 sm:p-6 shadow-sm`}>
            <h2 className="text-lg font-semibold text-slate-900">Your details</h2>
            <form
              className="mt-4 grid gap-3 sm:grid-cols-2"
              onSubmit={(e) => {
                e.preventDefault();
                if (!validateStep3() || !serviceId || !slotId) return;
                createMutation.mutate({
                  service_id: serviceId,
                  slot_id: slotId,
                  client_name: client.ownerName.trim(),
                  client_phone: normalizeMobile(client.mobile),
                  pet_name: client.petName.trim(),
                  pet_breed: client.breed.trim() || undefined,
                  notes: client.notes.trim() || undefined
                });
              }}
            >
              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="ownerName">
                  Owner name
                </label>
                <input
                  id="ownerName"
                  name="ownerName"
                  autoComplete="name"
                  required
                  className={`h-11 w-full rounded-xl border ${BORDER} px-3 text-sm outline-none focus:border-pink-300`}
                  value={client.ownerName}
                  onChange={(e) => setClient((prev) => ({ ...prev, ownerName: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="mobile">
                  Mobile
                </label>
                <input
                  id="mobile"
                  name="mobile"
                  autoComplete="tel"
                  inputMode="tel"
                  required
                  className={`h-11 w-full rounded-xl border ${BORDER} px-3 text-sm outline-none focus:border-pink-300`}
                  value={client.mobile}
                  onChange={(e) => setClient((prev) => ({ ...prev, mobile: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="petName">
                  Pet name
                </label>
                <input
                  id="petName"
                  name="petName"
                  required
                  className={`h-11 w-full rounded-xl border ${BORDER} px-3 text-sm outline-none focus:border-pink-300`}
                  value={client.petName}
                  onChange={(e) => setClient((prev) => ({ ...prev, petName: e.target.value }))}
                />
              </div>

              <div>
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="breed">
                  Breed (optional)
                </label>
                <input
                  id="breed"
                  name="breed"
                  className={`h-11 w-full rounded-xl border ${BORDER} px-3 text-sm outline-none focus:border-pink-300`}
                  value={client.breed}
                  onChange={(e) => setClient((prev) => ({ ...prev, breed: e.target.value }))}
                />
              </div>

              <div className="sm:col-span-2">
                <label className="mb-1 block text-sm font-medium text-slate-700" htmlFor="notes">
                  Notes (optional)
                </label>
                <textarea
                  id="notes"
                  name="notes"
                  rows={4}
                  className={`w-full rounded-xl border ${BORDER} px-3 py-2 text-sm outline-none focus:border-pink-300`}
                  value={client.notes}
                  onChange={(e) => setClient((prev) => ({ ...prev, notes: e.target.value }))}
                />
              </div>

              <input type="hidden" name="serviceId" value={serviceId ?? ''} readOnly />
              <input type="hidden" name="selectedDate" value={date} readOnly />
              <input type="hidden" name="selectedTime" value={selectedSlot?.start_at || ''} readOnly />

              {formError ? <p className="sm:col-span-2 text-sm text-rose-600">{formError}</p> : null}
              <p className="sm:col-span-2 text-xs text-slate-500">We’ll confirm your booking by SMS.</p>

              <div className="sm:col-span-2 flex gap-2">
                <button className={`rounded-lg border ${BORDER} px-4 py-2 text-sm`} type="button" onClick={() => setStep(2)}>
                  Back
                </button>
                <button
                  className="inline-flex items-center gap-2 rounded-xl bg-brand px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
                  type="submit"
                  disabled={createMutation.isPending}
                >
                  {createMutation.isPending ? (
                    <>
                      <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                      Submitting...
                    </>
                  ) : (
                    'Submit booking'
                  )}
                </button>
              </div>
            </form>
          </section>
        </section>
      ) : null}

      {step === 4 && created ? (
        <section className={`space-y-4 rounded-[24px] border ${BORDER} bg-white p-5 sm:p-6 shadow-sm`}>
          <h2 className="text-2xl font-semibold text-slate-900">Booking confirmed</h2>
          <p className="text-sm text-slate-600">Reference number: #{created.id}</p>
          <div className={`grid gap-2 rounded-2xl border ${BORDER} bg-pink-50 p-4 text-sm text-slate-700`}>
            <p>
              <span className="font-medium text-slate-900">Service:</span> {created.service_name}
            </p>
            <p>
              <span className="font-medium text-slate-900">Date & time:</span> {formatSlotDateTime(created.start_at)}
            </p>
            <p>
              <span className="font-medium text-slate-900">Address:</span> 81 Harp Rd, Kew East VIC 3102
            </p>
          </div>
          <a
            href="tel:0488668837"
            className="inline-flex h-11 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white"
          >
            Call 0488 668 837
          </a>
        </section>
      ) : null}
      </div>
    </section>
  );
}
