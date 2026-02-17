import { Navigate, Route, Routes } from 'react-router-dom';
import { Layout } from './components/Layout';
import { AboutRoute } from './routes/About';
import { GalleryRoute } from './routes/Gallery';
import { HomeRoute } from './routes/Home';
import { ResultDetailRoute } from './routes/ResultDetail';
import { SearchRoute } from './routes/Search';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomeRoute />} />
        <Route path="/gallery" element={<GalleryRoute />} />
        <Route path="/search" element={<SearchRoute />} />
        <Route path="/results/:id" element={<ResultDetailRoute />} />
        <Route path="/about" element={<AboutRoute />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Layout>
  );
}
