import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import PostRegLayout from './components/PostRegLayout';
import RegisterPage from './pages/RegisterPage';
import DashboardPage from './pages/DashboardPage';
import SubmitPage from './pages/SubmitPage';
import ProfilePage from './pages/ProfilePage';
import GuidelinesPage from './pages/GuidelinesPage';
import CommunityPage from './pages/CommunityPage';
import LoginPage from './pages/LoginPage';
import PaymentPage from './pages/PaymentPage';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route element={<PostRegLayout />}>
          {/* Default entry: routes to register ledger */}
          <Route path="/" element={<Navigate to="/register" replace />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/signup" element={<LoginPage />} />
          <Route path="/dashboard" element={<DashboardPage />} />
          <Route path="/submit" element={<SubmitPage />} />
          <Route path="/profile" element={<ProfilePage />} />
          <Route path="/guidelines" element={<GuidelinesPage />} />
          <Route path="/community" element={<CommunityPage />} />
          <Route path="/payment" element={<PaymentPage />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/register" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
