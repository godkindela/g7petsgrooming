import { createApiClient, type DocItem } from '@g7/shared';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787';
const client = createApiClient(API_BASE);

function adminRole(): 'staff' | 'editor' | 'admin' {
  const saved = localStorage.getItem('g7-admin-role');
  if (saved === 'staff' || saved === 'editor' || saved === 'admin') return saved;
  return 'admin';
}

async function adminFetch(path: string, init?: RequestInit): Promise<Response> {
  const headers = new Headers(init?.headers || {});
  headers.set('X-Admin-Role', adminRole());
  if (!headers.has('Content-Type') && init?.body && !(init.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  return fetch(`${API_BASE.replace(/\/$/, '')}${path}`, { ...init, headers });
}

export async function fetchDocs(params: { page: number; pageSize: number; tag: string; source: string }): Promise<{
  items: DocItem[];
  total: number;
}> {
  const data = await client.docs(params);
  return { items: data.items || [], total: data.pagination.total };
}

export async function fetchDoc(id: string): Promise<Record<string, unknown>> {
  return client.docById(id) as Promise<Record<string, unknown>>;
}

export async function enqueueReindex(payload: Record<string, unknown>): Promise<{ ok: boolean; jobId: number }> {
  const res = await fetch(`${API_BASE.replace(/\/$/, '')}/api/jobs/reindex`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to enqueue reindex');
  return (await res.json()) as { ok: boolean; jobId: number };
}

export async function fetchJobs(): Promise<Array<Record<string, unknown>>> {
  const res = await fetch(`${API_BASE.replace(/\/$/, '')}/api/jobs`);
  if (!res.ok) throw new Error('Failed to fetch jobs');
  const data = (await res.json()) as { items: Array<Record<string, unknown>> };
  return data.items || [];
}

export type AdminBookingRow = {
  booking_id: number;
  status: string;
  client_name: string;
  client_phone: string;
  created_at: string;
  start_at: string;
  end_at: string;
  service_name: string;
};

export type AdminBookingDetail = Record<string, unknown>;
export type AdminBookingEvent = { id: number; event: string; at: string; meta_json: string | null };

export async function fetchAdminBookings(params: { date: string; status: string; q: string }): Promise<AdminBookingRow[]> {
  const qs = new URLSearchParams();
  qs.set('date', params.date);
  if (params.status) qs.set('status', params.status);
  if (params.q) qs.set('q', params.q);

  const res = await adminFetch(`/api/admin/bookings?${qs.toString()}`);
  if (!res.ok) throw new Error('Failed to fetch bookings');
  const data = (await res.json()) as { items: AdminBookingRow[] };
  return data.items || [];
}

export async function fetchAdminBooking(id: number): Promise<{ item: AdminBookingDetail; events: AdminBookingEvent[] }> {
  const res = await adminFetch(`/api/admin/bookings/${id}`);
  if (!res.ok) throw new Error('Failed to fetch booking detail');
  return (await res.json()) as { item: AdminBookingDetail; events: AdminBookingEvent[] };
}

export async function confirmBooking(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/bookings/${id}/confirm`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to confirm booking');
}

export async function cancelBooking(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/bookings/${id}/cancel`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to cancel booking');
}

export async function completeBooking(id: number): Promise<void> {
  const res = await adminFetch(`/api/admin/bookings/${id}/complete`, { method: 'POST' });
  if (!res.ok) throw new Error('Failed to complete booking');
}

export type AdminSlot = {
  id: number;
  start_at: string;
  end_at: string;
  capacity: number;
  booked_count: number;
  is_open: number;
  service_id: number | null;
};

export async function fetchAdminSlots(date: string): Promise<AdminSlot[]> {
  const res = await adminFetch(`/api/admin/slots?date=${encodeURIComponent(date)}`);
  if (!res.ok) throw new Error('Failed to fetch slots');
  const data = (await res.json()) as { items: AdminSlot[] };
  return data.items || [];
}

export async function generateSlots(payload: {
  start_date?: string;
  end_date?: string;
  open_time?: string;
  close_time?: string;
  interval_min?: number;
  capacity?: number;
}): Promise<{ ok: boolean; inserted: number }> {
  const res = await adminFetch('/api/admin/slots/generate', {
    method: 'POST',
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to generate slots');
  return (await res.json()) as { ok: boolean; inserted: number };
}

export async function updateSlot(id: number, payload: {
  is_open?: number;
  capacity?: number;
  start_at?: string;
  end_at?: string;
}): Promise<void> {
  const res = await adminFetch(`/api/admin/slots/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  });
  if (!res.ok) throw new Error('Failed to update slot');
}

export type GalleryImage = {
  id: number;
  title_en: string;
  title_zh: string;
  alt_en: string;
  alt_zh: string;
  tags: string[];
  pet_type: string;
  before_after: number;
  featured: number;
  is_published: number;
  created_at: string;
  media_url: string | null;
  thumb_url: string | null;
};

export async function fetchGalleryImages(): Promise<GalleryImage[]> {
  const res = await adminFetch('/api/gallery/images?limit=200');
  if (!res.ok) throw new Error('Failed to fetch gallery images');
  const data = (await res.json()) as { items: GalleryImage[] };
  return data.items || [];
}

export async function uploadGalleryImage(formData: FormData): Promise<{ ok: boolean; id: number }> {
  const res = await adminFetch('/api/gallery/upload', {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload image');
  return (await res.json()) as { ok: boolean; id: number };
}

export async function updateGalleryImage(id: number, formData: FormData): Promise<{ ok: boolean; id: number }> {
  const res = await adminFetch(`/api/gallery/update/${id}`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to update image');
  return (await res.json()) as { ok: boolean; id: number };
}

export async function deleteGalleryImage(id: number): Promise<{ ok: boolean; id: number }> {
  const res = await adminFetch(`/api/gallery/delete/${id}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to delete image');
  return (await res.json()) as { ok: boolean; id: number };
}
