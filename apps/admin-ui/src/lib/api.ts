import { createApiClient, type DocItem } from '@g7/shared';

const API_BASE = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787';
const client = createApiClient(API_BASE);

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
  const res = await fetch(`${API_BASE.replace(/\/$/, '')}/api/gallery/images?limit=200`);
  if (!res.ok) throw new Error('Failed to fetch gallery images');
  const data = (await res.json()) as { items: GalleryImage[] };
  return data.items || [];
}

export async function uploadGalleryImage(formData: FormData): Promise<{ ok: boolean; id: number }> {
  const res = await fetch(`${API_BASE.replace(/\/$/, '')}/api/gallery/upload`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to upload image');
  return (await res.json()) as { ok: boolean; id: number };
}

export async function updateGalleryImage(id: number, formData: FormData): Promise<{ ok: boolean; id: number }> {
  const res = await fetch(`${API_BASE.replace(/\/$/, '')}/api/gallery/update/${id}`, {
    method: 'POST',
    body: formData
  });
  if (!res.ok) throw new Error('Failed to update image');
  return (await res.json()) as { ok: boolean; id: number };
}

export async function deleteGalleryImage(id: number): Promise<{ ok: boolean; id: number }> {
  const res = await fetch(`${API_BASE.replace(/\/$/, '')}/api/gallery/delete/${id}`, {
    method: 'POST'
  });
  if (!res.ok) throw new Error('Failed to delete image');
  return (await res.json()) as { ok: boolean; id: number };
}
