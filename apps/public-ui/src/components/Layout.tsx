import { Link, NavLink } from 'react-router-dom';
import type { PropsWithChildren } from 'react';
import { useEffect, useState } from 'react';

export function Layout({ children }: PropsWithChildren) {
  const [menuOpen, setMenuOpen] = useState(false);
  const logoUrl = '/assets/logo/g7-logo.webp';
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-full px-4 py-2 text-sm font-medium ${
      isActive ? 'bg-brand text-white' : 'text-slate-600 hover:bg-brandLight hover:text-brand'
    }`;

  useEffect(() => {
    const id = 'g7-petgrooming-jsonld';
    if (document.getElementById(id)) return;
    const script = document.createElement('script');
    script.id = id;
    script.type = 'application/ld+json';
    script.text = JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'PetGrooming',
      name: 'G7 Pets Grooming',
      url: 'https://20200604.net',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '81 Harp Rd',
        addressLocality: 'Kew East',
        addressRegion: 'VIC',
        postalCode: '3102',
        addressCountry: 'AU'
      },
      telephone: ['+61488668837', '+61490685668'],
      email: 'g7pets@gmail.com',
      openingHours: 'Th-Su 09:00-17:00'
    });
    document.head.appendChild(script);
  }, []);

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="sticky top-0 z-50 border-b border-[#E6E8EC] bg-white/95 backdrop-blur">
        <div className="mx-auto flex max-w-[1200px] items-center justify-between gap-3 px-4 py-3">
          <Link to="/" className="inline-flex items-center gap-3 text-lg font-semibold text-slate-900">
            <img src={logoUrl} alt="G7 Pets logo" className="h-10 w-10 rounded-full object-cover ring-2 ring-pink-100" loading="eager" />
            <span>G7 Pets Grooming</span>
          </Link>
          <nav className="hidden flex-wrap gap-2 md:flex">
            <NavLink to="/" className={navClass} end>
              Home
            </NavLink>
            <NavLink to="/book" className={navClass}>
              Book
            </NavLink>
            <NavLink to="/services" className={navClass}>
              Services
            </NavLink>
            <NavLink to="/gallery" className={navClass}>
              Gallery
            </NavLink>
            <NavLink to="/about" className={navClass}>
              About
            </NavLink>
            <NavLink to="/policies" className={navClass}>
              Policies
            </NavLink>
            <Link to="/book" className="inline-flex h-9 items-center rounded-full bg-brand px-4 text-sm font-semibold text-white">
              Book Now
            </Link>
          </nav>
          <button
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            className="inline-flex h-10 w-10 items-center justify-center rounded-lg border border-[#E6E8EC] md:hidden"
            aria-label="Toggle menu"
          >
            <span className="text-xl leading-none">≡</span>
          </button>
        </div>
        {menuOpen ? (
          <div className="border-t border-[#E6E8EC] bg-white px-4 py-3 md:hidden">
            <div className="grid gap-2">
              {[
                { to: '/', label: 'Home' },
                { to: '/book', label: 'Book' },
                { to: '/services', label: 'Services' },
                { to: '/gallery', label: 'Gallery' },
                { to: '/about', label: 'About' },
                { to: '/policies', label: 'Policies' }
              ].map((item) => (
                <NavLink
                  key={item.to}
                  to={item.to}
                  onClick={() => setMenuOpen(false)}
                  className={({ isActive }) =>
                    `rounded-lg px-3 py-2 text-sm font-medium ${
                      isActive ? 'bg-brandLight text-brand' : 'text-slate-700 hover:bg-slate-50'
                    }`
                  }
                >
                  {item.label}
                </NavLink>
              ))}
            </div>
          </div>
        ) : null}
      </header>
      <main className="mx-auto w-full max-w-[1200px] px-4 py-6">{children}</main>
      <footer className="border-t border-[#E6E8EC] bg-slate-50 px-4 py-8 text-sm text-slate-500">
        <div className="mx-auto flex max-w-[1200px] flex-wrap items-center justify-between gap-4">
          <span>G7 Pets Grooming · 81 Harp Rd, Kew East VIC 3102</span>
          <span className="text-slate-300">|</span>
          <Link className="hover:text-ink hover:underline" to="/policies">
            Policies
          </Link>
        </div>
      </footer>
    </div>
  );
}
