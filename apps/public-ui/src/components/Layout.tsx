import { Link, NavLink } from 'react-router-dom';
import type { PropsWithChildren } from 'react';

export function Layout({ children }: PropsWithChildren) {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-md px-3 py-2 text-sm ${isActive ? 'bg-brand text-white' : 'text-ink hover:bg-brandLight'}`;

  return (
    <div className="min-h-screen bg-white text-ink">
      <header className="border-b border-slate-200 bg-white/95">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-4">
          <Link to="/" className="text-lg font-semibold text-brand">
            G7 Pets
          </Link>
          <nav className="flex gap-2">
            <NavLink to="/" className={navClass} end>
              Home
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
