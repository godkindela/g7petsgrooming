import { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { fetchServiceCatalog, type ServiceCatalogItem } from '../lib/api';

const CATEGORY_ORDER = ['dog', 'cat', 'extra', 'care', 'general'] as const;

const CATEGORY_LABEL: Record<string, string> = {
  dog: 'Dog Grooming',
  cat: 'Cat Grooming',
  extra: 'Special Extras',
  care: 'Daycare & Boarding',
  general: 'Services'
};

const SIZE_GUIDE = ['XS 1-6kgs', 'S 6.1-12kgs', 'M 12.1-18kgs', 'L 18.1-25kgs', 'XL > 25.1kgs'];

export function ServicesRoute() {
  const catalog = useQuery({ queryKey: ['service-catalog'], queryFn: fetchServiceCatalog });

  const grouped = useMemo(() => {
    const map = new Map<string, ServiceCatalogItem[]>();
    for (const item of catalog.data || []) {
      const key = item.category || 'general';
      const group = map.get(key) || [];
      group.push(item);
      map.set(key, group);
    }
    return CATEGORY_ORDER.map((key) => ({ key, label: CATEGORY_LABEL[key], items: map.get(key) || [] })).filter((x) => x.items.length > 0);
  }, [catalog.data]);

  return (
    <section className="space-y-10 pb-8">
      <header className="rounded-[24px] border border-[#E6E8EC] bg-white p-6 text-center">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-brand">What We Do</p>
        <h1 className="mt-3 text-3xl font-extrabold text-slate-900 sm:text-4xl">Professional Grooming Services for All Breeds</h1>
        <p className="mx-auto mt-3 max-w-3xl text-sm leading-relaxed text-slate-600">
          Every pet is unique. Our grooming experts are trained to handle all temperaments and coat types with patience and care.
        </p>
      </header>

      <section className="rounded-[24px] border border-[#E6E8EC] bg-pink-50 p-5">
        <h2 className="text-lg font-bold text-slate-900">Size Guide</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {SIZE_GUIDE.map((size) => (
            <span key={size} className="rounded-full border border-pink-200 bg-white px-3 py-1 text-xs font-semibold text-slate-700">
              {size}
            </span>
          ))}
        </div>
      </section>

      {grouped.map((group) => (
        <section key={group.key} className="space-y-4">
          <h2 className="text-2xl font-bold text-slate-900">{group.label}</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
            {group.items.map((item) => (
              <article key={item.id} className="flex h-full flex-col rounded-[20px] border border-[#E6E8EC] bg-white p-5 shadow-sm">
                <h3 className="text-xl font-bold text-slate-900">{item.name}</h3>
                {item.subtitle ? <p className="mt-1 text-sm font-semibold text-brand">{item.subtitle}</p> : null}
                {item.summary ? <p className="mt-3 text-sm text-slate-600">{item.summary}</p> : null}

                {item.features.length > 0 ? (
                  <ul className="mt-4 space-y-2 text-sm text-slate-700">
                    {item.features.map((feature) => (
                      <li key={feature} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-brand" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                ) : null}

                {item.pricing.length > 0 ? (
                  <div className="mt-4 flex flex-wrap gap-2">
                    {item.pricing.map((price) => (
                      <span key={`${item.id}-${price.label}`} className="rounded-xl border border-pink-200 bg-pink-50 px-2 py-1 text-xs font-semibold text-slate-700">
                        {price.label}: {price.value}
                      </span>
                    ))}
                  </div>
                ) : null}

                {item.note ? <p className="mt-3 text-xs text-slate-500">{item.note}</p> : null}
                <div className="mt-5">
                  <Link
                    to={`/book?serviceId=${item.id}`}
                    className="inline-flex h-10 items-center justify-center rounded-xl border border-pink-200 px-4 text-sm font-semibold text-brand hover:bg-pink-50"
                  >
                    Select This
                  </Link>
                </div>
              </article>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-[24px] border border-[#E6E8EC] bg-brand p-6 text-white">
        <h3 className="text-2xl font-extrabold">Want a specific style or special handling?</h3>
        <p className="mt-2 text-sm text-pink-50">
          We can tailor grooming plans for anxiety, senior pets, and coat-specific requirements.
        </p>
        <a
          href="tel:0488668837"
          className="mt-4 inline-flex h-11 items-center rounded-xl bg-white px-4 text-sm font-semibold text-brand"
        >
          Call 0488 668 837
        </a>
      </section>

      {catalog.isLoading ? <p className="text-sm text-slate-600">Loading services...</p> : null}
    </section>
  );
}
