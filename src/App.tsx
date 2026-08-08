import { BrowserRouter, Routes, Route, Link } from 'react-router-dom';
import PremiumPage from './pages/PremiumPage';

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <nav className="flex items-center justify-between p-4">
          <Link to="/" className="font-bold">ديوان</Link>
          <Link to="/premium" className="premium-nav-link" aria-label="VIP والاشتراكات">
            ⭐ VIP / الاشتراكات
          </Link>
        </nav>
        <Routes>
          <Route path="/premium" element={<PremiumPage />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
