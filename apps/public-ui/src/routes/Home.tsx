import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { fetchBookingServices, fetchPublishedGallery } from '../lib/api';

function dollars(cents: number): string {
  return `$${Math.round(cents / 100)}`;
}

export function HomeRoute() {
  const gallery = useQuery({ queryKey: ['home-gallery'], queryFn: fetchPublishedGallery });
  const services = useQuery({ queryKey: ['home-services'], queryFn: fetchBookingServices });
  const featuredServices = useMemo(() => (services.data || []).slice(0, 4), [services.data]);

  return (
    <section className="space-y-14 pb-8">
      <section className="relative overflow-hidden rounded-[24px] border border-[#E6E8EC] bg-white px-4 py-10 sm:px-8 sm:py-14">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-pink-50" />
        <div className="absolute -bottom-16 -left-16 h-48 w-48 rounded-full bg-pink-50" />
        <div className="relative grid items-center gap-10 md:grid-cols-2">
          <div>
            <p className="mb-4 inline-flex rounded-full bg-pink-100 px-3 py-1 text-xs font-semibold uppercase tracking-wider text-pink-600">
              The Best Grooming in Kew East
            </p>
            <h1 className="text-4xl font-extrabold leading-tight text-slate-900 sm:text-5xl">
              Pamper Your Pet
              <span className="block text-brand">Like Royalty</span>
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-slate-600">
              Gentle care, transparent pricing, and easy online booking for every pet.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link to="/book" className="inline-flex h-12 items-center rounded-2xl bg-brand px-6 text-sm font-semibold text-white shadow-sm">
                Book an Appointment
              </Link>
              <a
                href="tel:0488668837"
                className="inline-flex h-12 items-center rounded-2xl border border-[#E6E8EC] bg-white px-6 text-sm font-semibold text-slate-800"
              >
                Call Us
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-xs font-semibold uppercase tracking-wider text-slate-500">
              <div>
                <p className="text-2xl font-extrabold text-slate-900">10+</p>
                <p>Years Experience</p>
              </div>
              <div className="h-8 w-px bg-slate-200" />
              <div>
                <p className="text-2xl font-extrabold text-slate-900">5k+</p>
                <p>Happy Paws</p>
              </div>
            </div>
          </div>

          <div className="relative overflow-hidden rounded-[24px] border border-[#E6E8EC] bg-slate-50">
            <img
              src="https://images.unsplash.com/photo-1713996240147-7a2f77d2871b?auto=format&fit=crop&w=1200&q=80"
              alt="Groomed dog"
              className="h-full w-full object-cover"
              loading="lazy"
            />
            <div className="absolute right-4 top-4 rounded-xl border border-[#E6E8EC] bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700">
              Safety First
            </div>
            <div className="absolute bottom-4 left-4 rounded-xl border border-[#E6E8EC] bg-white/95 px-3 py-2 text-xs font-semibold text-slate-700">
              Full Grooming
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        {[
          { title: 'Gentle Handling', desc: 'Calm, low-stress grooming focused on comfort first.' },
          { title: 'Clear Pricing', desc: 'Service pricing is visible before you confirm booking.' },
          { title: 'Easy Online Booking', desc: 'Choose service and time quickly from any device.' }
        ].map((item) => (
          <article key={item.title} className="rounded-2xl border border-[#E6E8EC] bg-white p-5">
            <h2 className="text-lg font-semibold text-slate-900">{item.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{item.desc}</p>
          </article>
        ))}
      </section>

      <section className="rounded-[24px] border border-[#E6E8EC] bg-slate-50 p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Top Services</h2>
          <Link className="text-sm font-semibold text-brand hover:underline" to="/services">
            View all
          </Link>
        </div>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {featuredServices.map((service) => (
            <article key={service.id} className="flex h-full flex-col rounded-2xl border border-[#E6E8EC] bg-white p-5">
              <h3 className="text-lg font-bold text-slate-900">{service.name}</h3>
              <p className="mt-1 text-sm text-slate-600">{service.duration_min} min</p>
              <p className="mt-1 text-sm font-semibold text-brand">From {dollars(service.price_cents)}</p>
              <Link
                className="mt-5 inline-flex h-10 items-center justify-center rounded-xl border border-pink-200 text-sm font-semibold text-brand hover:bg-pink-50"
                to={`/book?serviceId=${service.id}`}
              >
                Select This
              </Link>
            </article>
          ))}
          {services.isLoading ? <p className="text-sm text-slate-600">Loading services...</p> : null}
        </div>
      </section>

      <section className="rounded-[24px] border border-[#E6E8EC] bg-white p-5 sm:p-6">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-2xl font-bold text-slate-900">Gallery Preview</h2>
          <Link className="text-sm font-semibold text-brand hover:underline" to="/gallery">
            Open gallery
          </Link>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {(gallery.data || []).slice(0, 6).map((item) => (
            <article key={item.id} className="overflow-hidden rounded-2xl border border-[#E6E8EC]">
              {item.thumb_url ? (
                <img alt={item.alt_en} className="h-48 w-full object-cover" loading="lazy" src={item.thumb_url} />
              ) : null}
              <div className="p-3 text-sm font-medium text-slate-700">{item.title_en}</div>
            </article>
          ))}
        </div>
      </section>

      <section className="grid gap-5 rounded-[24px] border border-[#E6E8EC] bg-white p-5 sm:p-6 lg:grid-cols-2">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">Location & Contact</h2>
          <p className="mt-3 text-sm text-slate-700">81 Harp Rd, Kew East VIC 3102</p>
          <p className="mt-1 text-sm text-slate-700">
            <a href="tel:0488668837" className="font-semibold text-brand hover:underline">
              0488 668 837
            </a>
            {' / '}
            <a href="tel:0490685668" className="font-semibold text-brand hover:underline">
              0490 685 668
            </a>
          </p>
          <div className="mt-3 text-sm text-slate-700">
            <p className="font-medium">Opening Hours</p>
            <p>Thursday – Sunday</p>
            <p>9:00 AM – 5:00 PM</p>
          </div>
          <a
            className="mt-4 inline-flex h-11 items-center rounded-xl bg-brand px-4 text-sm font-semibold text-white"
            href="https://www.google.com/maps/search/?api=1&query=81+Harp+Rd,+Kew+East+VIC+3102"
            target="_blank"
            rel="noreferrer"
          >
            Get Directions
          </a>
        </div>

        <div className="overflow-hidden rounded-2xl border border-[#E6E8EC]">
          <iframe
            title="G7 Pets Grooming map"
            src="https://www.google.com/maps?q=81%20Harp%20Rd%2C%20Kew%20East%20VIC%203102&output=embed"
            className="h-[320px] w-full"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          />
        </div>
      </section>
    </section>
  );
}
