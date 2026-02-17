import { createApiClient } from '@g7/shared';

const baseUrl = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787';
export const api = createApiClient(baseUrl);

export type GalleryImage = {
  id: number;
  title_en: string;
  alt_en: string;
  thumb_url: string | null;
  media_url: string | null;
  pet_type: string;
  before_after: number;
};

export async function fetchPublishedGallery(): Promise<GalleryImage[]> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/gallery/images?published=1&limit=120`);
  if (!res.ok) throw new Error('Failed to fetch gallery');
  const data = (await res.json()) as { items: GalleryImage[] };
  return data.items || [];
}

export type BookingService = {
  id: number;
  name: string;
  duration_min: number;
  price_cents: number;
};

export type BookingSlot = {
  id: number;
  start_at: string;
  end_at: string;
  capacity: number;
  booked_count: number;
  is_open: number;
  service_id: number | null;
};

export type CreatedBooking = {
  id: number;
  status: string;
  start_at: string;
  end_at: string;
  service_name: string;
};

export async function fetchBookingServices(): Promise<BookingService[]> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/public/services`);
  if (!res.ok) throw new Error('Failed to fetch services');
  const data = (await res.json()) as { items: BookingService[] };
  return data.items || [];
}

export async function fetchBookingSlots(params: { date: string; serviceId: number }): Promise<BookingSlot[]> {
  const qs = new URLSearchParams();
  qs.set('date', params.date);
  qs.set('service_id', String(params.serviceId));

  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/public/slots?${qs.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch slots');
  const data = (await res.json()) as { items: BookingSlot[] };
  return data.items || [];
}

export async function createBooking(payload: {
  service_id: number;
  slot_id: number;
  client_name: string;
  client_phone: string;
  pet_name?: string;
  pet_breed?: string;
  notes?: string;
}): Promise<CreatedBooking> {
  const res = await fetch(`${baseUrl.replace(/\/$/, '')}/api/public/bookings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (res.status === 409) {
    const err = new Error('SLOT_CONFLICT');
    (err as Error & { code?: string }).code = 'SLOT_CONFLICT';
    throw err;
  }
  if (!res.ok) throw new Error('Failed to create booking');
  return (await res.json()) as CreatedBooking;
}
