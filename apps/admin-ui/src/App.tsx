import { Navigate, Route, Routes } from 'react-router-dom';
import { AppShell } from './components/layout/AppShell';
import { DocsRoute } from './routes/DocsRoute';
import { GalleryRoute } from './routes/GalleryRoute';
import { JobsRoute } from './routes/JobsRoute';

export default function App() {
  return (
    <AppShell>
      <Routes>
        <Route path="/docs" element={<DocsRoute />} />
        <Route path="/gallery" element={<GalleryRoute />} />
        <Route path="/jobs" element={<JobsRoute />} />
        <Route path="*" element={<Navigate to="/docs" replace />} />
      </Routes>
    </AppShell>
  );
}
