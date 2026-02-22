import { useEffect } from 'react';

type Props = {
  title: string;
  description?: string;
  canonical?: string;
};

export function SeoMeta({ title, description, canonical }: Props) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = title;

    const descEl = document.querySelector('meta[name="description"]');
    const prevDesc = descEl?.getAttribute('content') || '';
    if (description) {
      if (descEl) {
        descEl.setAttribute('content', description);
      } else {
        const created = document.createElement('meta');
        created.setAttribute('name', 'description');
        created.setAttribute('content', description);
        document.head.appendChild(created);
      }
    }

    let canonicalEl = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    const prevCanonical = canonicalEl?.getAttribute('href') || '';
    if (canonical) {
      if (!canonicalEl) {
        canonicalEl = document.createElement('link');
        canonicalEl.setAttribute('rel', 'canonical');
        document.head.appendChild(canonicalEl);
      }
      canonicalEl.setAttribute('href', canonical);
    }

    return () => {
      document.title = prevTitle;
      if (description && descEl) {
        descEl.setAttribute('content', prevDesc);
      }
      if (description && !descEl) {
        const created = document.querySelector('meta[name="description"]');
        if (created && created.getAttribute('content') === description) {
          created.remove();
        }
      }
      if (canonicalEl) {
        if (prevCanonical) canonicalEl.setAttribute('href', prevCanonical);
        else canonicalEl.remove();
      }
    };
  }, [canonical, description, title]);

  return null;
}
