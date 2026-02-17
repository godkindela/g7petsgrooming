export type DocItem = {
  id: string;
  slug: string;
  title: string;
  intro: string;
  canonicalPath: string;
  updatedAt: string;
};

export type PaginatedDocs = {
  items: DocItem[];
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filters: {
    tag: string;
    source: string;
    from: string;
    to: string;
  };
};

export type SearchItem = {
  id: string;
  type: 'doc' | 'person' | 'event' | string;
  title: string;
  snippet: string;
  occurredAt?: string;
};
