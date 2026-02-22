import { SeoMeta } from '../components/SeoMeta';

export function PoliciesRoute() {
  return (
    <section className="mx-auto max-w-[960px] space-y-6">
      <SeoMeta
        title="Booking Policies | G7 Pets Grooming"
        description="Read G7 Pets Grooming booking policies for cancellations, late arrivals, no-shows, and health/safety requirements."
        canonical="https://20200604.net/policies"
      />

      <header className="space-y-3">
        <h1 className="text-3xl font-semibold text-ink">Booking Policies</h1>
        <p className="text-sm leading-6 text-slate-600">
          These policies help us provide a safe, comfortable experience for every pet. If you have questions, please contact us.
        </p>
      </header>

      <section className="space-y-2 rounded-lg border border-slate-200 p-5">
        <h2 className="text-xl font-semibold">Booking confirmation</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>Online bookings are requests. We’ll confirm your appointment by SMS or phone.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 p-5">
        <h2 className="text-xl font-semibold">Cancellations &amp; no-shows</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>Please provide at least 24 hours’ notice to cancel or reschedule.</li>
          <li>No-shows may require a deposit for future bookings.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 p-5">
        <h2 className="text-xl font-semibold">Late arrivals</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>If you are more than 10 minutes late, we may need to shorten or reschedule your appointment.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 p-5">
        <h2 className="text-xl font-semibold">Health &amp; safety</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>Pets must be healthy enough for grooming.</li>
          <li>
            Please ensure your pet is up to date with flea/tick treatment. If fleas are found, an additional cleaning fee may
            apply.
          </li>
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 p-5">
        <h2 className="text-xl font-semibold">Matted coats / special handling</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>Severe matting may require extra time or clipping for your pet’s comfort. We’ll discuss options before proceeding.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 p-5">
        <h2 className="text-xl font-semibold">Behaviour</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>We use gentle handling. If a pet becomes unsafe to groom, we may stop the service.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 p-5">
        <h2 className="text-xl font-semibold">Payment</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>Payment is due at pickup.</li>
        </ul>
      </section>

      <section className="space-y-2 rounded-lg border border-slate-200 p-5">
        <h2 className="text-xl font-semibold">Contact</h2>
        <ul className="list-inside list-disc space-y-1 text-sm text-slate-700">
          <li>Address: 81 Harp Rd, Kew East VIC 3102</li>
          <li>(Add phone/opening hours here when ready)</li>
        </ul>
      </section>

      <p className="pb-2 text-xs text-slate-500">Last updated: 21 February 2026</p>
    </section>
  );
}
