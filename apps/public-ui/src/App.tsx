import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AboutRoute } from './routes/About';
import { BookRoute } from './routes/Book';
import { GalleryRoute } from './routes/Gallery';
import { HomeRoute } from './routes/Home';
import { PoliciesRoute } from './routes/Policies';
import { ResultDetailRoute } from './routes/ResultDetail';
import { ServicesRoute } from './routes/Services';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/book" element={<BookRoute />} />
        <Route path="/services" element={<ServicesRoute />} />
        <Route path="/gallery" element={<GalleryRoute />} />
        <Route path="/results/:id" element={<ResultDetailRoute />} />
        <Route path="/about" element={<AboutRoute />} />
        <Route path="/policies" element={<PoliciesRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
