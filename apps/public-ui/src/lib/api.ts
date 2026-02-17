import { createApiClient } from '@g7/shared';

const baseUrl = import.meta.env.VITE_API_BASE || 'http://127.0.0.1:8787';
export const api = createApiClient(baseUrl);
