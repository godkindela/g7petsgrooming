import type { PaginatedDocs, SearchItem } from './types';

export type ApiClient = {
  health: () => Promise<{ ok: boolean; env: string; timestamp: string }>;
  docs: (params?: Record<string, string | number | undefined>) => Promise<PaginatedDocs>;
  docById: (id: string) => Promise<{ item: Record<string, unknown>; tags: Array<{ id: number; name: string }> }>;
  search: (params: Record<string, string | number | undefined>) => Promise<{ items: SearchItem[] }>;
  render: (id: string) => Promise<string>;
};

export function createApiClient(baseUrl: string): ApiClient {
  const base = baseUrl.replace(/\/$/, '');

  const getJson = async <T>(path: string, params?: Record<string, string | number | undefined>): Promise<T> => {
    const url = new URL(`${base}${path}`);
    if (params) {
      Object.entries(params).forEach(([k, v]) => {
        if (v === undefined || v === null || v === '') return;
        url.searchParams.set(k, String(v));
      });
    }

    const res = await fetch(url.toString());
    if (!res.ok) throw new Error(`Request failed: ${res.status}`);
    return (await res.json()) as T;
  };

  return {
    health: () => getJson('/api/health'),
    docs: (params) => getJson<PaginatedDocs>('/api/docs', params),
    docById: (id) => getJson(`/api/docs/${id}`),
    search: (params) => getJson('/api/search', params),
    render: async (id) => {
      const res = await fetch(`${base}/api/render/${id}`);
      if (!res.ok) throw new Error(`Request failed: ${res.status}`);
      return res.text();
    }
  };
}
