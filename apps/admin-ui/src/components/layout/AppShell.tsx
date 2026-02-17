import type { PropsWithChildren } from 'react';
import { NavLink } from 'react-router-dom';

export function AppShell({ children }: PropsWithChildren) {
  const navClass = ({ isActive }: { isActive: boolean }) =>
    `block rounded-lg px-3 py-2 text-sm font-medium ${isActive ? 'bg-accent text-white' : 'text-ink hover:bg-stone-100'}`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_20%_10%,#f8dfca_0,#f5efe6_45%,#efe8db_100%)]">
      <div className="grid min-h-screen grid-cols-1 md:grid-cols-[220px_1fr]">
        <aside className="border-r border-stone-200 bg-white/90 p-4">
          <div className="mb-6 text-lg font-display font-semibold text-ink">G7 Admin</div>
          <label className="mb-3 block text-xs font-semibold uppercase tracking-[0.08em] text-stone-500">
            Role
            <select
              className="mt-2 h-9 w-full rounded-md border border-stone-300 px-2 text-sm"
              defaultValue={localStorage.getItem('g7-admin-role') || 'admin'}
              onChange={(e) => {
                localStorage.setItem('g7-admin-role', e.target.value);
                location.reload();
              }}
            >
              <option value="staff">staff</option>
              <option value="editor">editor</option>
              <option value="admin">admin</option>
            </select>
          </label>
          <nav className="space-y-2">
            <NavLink className={navClass} to="/docs">
              Docs
            </NavLink>
            <NavLink className={navClass} to="/bookings">
              Bookings
            </NavLink>
            <NavLink className={navClass} to="/slots">
              Slots
            </NavLink>
            <NavLink className={navClass} to="/gallery">
              Gallery
            </NavLink>
            <NavLink className={navClass} to="/jobs">
              Jobs
            </NavLink>
          </nav>
        </aside>
        <div className="p-4 md:p-8">{children}</div>
      </div>
    </div>
  );
}
