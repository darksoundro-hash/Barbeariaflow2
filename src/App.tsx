import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useApp } from './lib/AppContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import Dashboard from './pages/Dashboard';
import BarbersPage from './pages/BarbersPage';
import ServicesPage from './pages/ServicesPage';
import AppointmentsPage from './pages/AppointmentsPage';
import PublicBooking from './pages/PublicBooking';
import SettingsPage from './pages/SettingsPage';
import SuccessPage from './pages/SuccessPage';
import CancelPage from './pages/CancelPage';
import ProtectedRoute from './components/ProtectedRoute';
import BarberDashboard from './pages/BarberDashboard';
import UpgradeModal from './components/UpgradeModal';

export default function App() {
  const { user, profile, loading, upgradeReason, dismissUpgrade, plan, isTrialExpired } = useApp();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-dark text-gold">
        <div className="animate-pulse text-2xl font-light tracking-widest">BARBERFLOW</div>
      </div>
    );
  }

  return (
    <>
      <Router>
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/book/:shopSlug" element={<PublicBooking />} />

          <Route path="/admin" element={<ProtectedRoute user={user}>{profile?.role === 'barber' ? <Navigate to="/barber" /> : <Dashboard />}</ProtectedRoute>} />
          <Route path="/admin/barbers" element={<ProtectedRoute user={user}>{profile?.role === 'barber' ? <Navigate to="/barber" /> : <BarbersPage />}</ProtectedRoute>} />
          <Route path="/admin/services" element={<ProtectedRoute user={user}>{profile?.role === 'barber' ? <Navigate to="/barber" /> : <ServicesPage />}</ProtectedRoute>} />
          <Route path="/admin/appointments" element={<ProtectedRoute user={user}><AppointmentsPage /></ProtectedRoute>} />
          <Route path="/admin/settings" element={<ProtectedRoute user={user}><SettingsPage /></ProtectedRoute>} />

          <Route path="/barber" element={<ProtectedRoute user={user}><BarberDashboard /></ProtectedRoute>} />

          <Route path="/checkout/success" element={<SuccessPage />} />
          <Route path="/checkout/cancel" element={<CancelPage />} />

          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Router>
      <UpgradeModal
        open={!!upgradeReason}
        onClose={dismissUpgrade}
        currentPlan={plan}
        reason={upgradeReason || undefined}
        isMandatory={isTrialExpired}
      />
    </>
  );
}
