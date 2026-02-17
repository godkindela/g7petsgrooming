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
