import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { BookingDetailRoute } from './routes/BookingDetailRoute';
import { BookingsRoute } from './routes/BookingsRoute';
import { DocsRoute } from './routes/DocsRoute';
import { GalleryRoute } from './routes/GalleryRoute';
import { JobsRoute } from './routes/JobsRoute';
import { SlotsRoute } from './routes/SlotsRoute';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/docs" element={<DocsRoute />} />
        <Route path="/bookings" element={<BookingsRoute />} />
        <Route path="/bookings/:id" element={<BookingDetailRoute />} />
        <Route path="/slots" element={<SlotsRoute />} />
        <Route path="/gallery" element={<GalleryRoute />} />
        <Route path="/jobs" element={<JobsRoute />} />
        <Route path="*" element={<Navigate to="/docs" replace />} />
      </Routes>
    </AppShell>
  );
}
