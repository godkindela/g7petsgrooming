import { Link, NavLink } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

export function Layout({ children }: PropsWithChildren) {
  const logoUrl = '/assets/logo/g7-logo.webp';
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm ${isActive ? 'bg-brand text-white' : 'text-ink hover:bg-brandLight'}`;

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="inline-flex items-center gap-3 text-lg font-semibold text-brand">
            <img src={logoUrl} alt="G7 Pets logo" className="h-10 w-10 rounded-full object-cover" loading="eager" />
            <span>G7 Pets</span>
          </Link>
          <nav className="flex gap-2">
            <NavLink to="/" className={navClass} end>
              Home
            </NavLink>
            <NavLink to="/book" className={navClass}>
              Book
            </NavLink>
            <NavLink to="/gallery" className={navClass}>
              Gallery
            </NavLink>
            <NavLink to="/search" className={navClass}>
              Search
            </NavLink>
            <NavLink to="/about" className={navClass}>
              About
            </NavLink>
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-5xl px-4 py-6">{children}</main>
      <footer className="border-t border-slate-200 px-4 py-6 text-center text-sm text-slate-500">G7 Pets Grooming</footer>
    </div>
  );
}
