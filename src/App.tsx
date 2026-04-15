import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth, LoginPage } from './components/Auth';
import { Layout } from './components/Layout';
import { Toaster } from 'sonner';
import { Loader2 } from 'lucide-react';

// Pages
import Dashboard from './pages/Dashboard';
import Clients from './pages/Clients';
import Projects from './pages/Projects';
import TimeLogs from './pages/TimeLogs';
import Invoices from './pages/Invoices';
import Payments from './pages/Payments';

const Reports = () => <div className="p-12 text-center text-neutral-400 italic border-2 border-dashed border-neutral-200 rounded-2xl">Reports module coming in Phase 2</div>;

export default function App() {
  const { user, loading, login, logout } = useAuth();

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-neutral-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <>
        <LoginPage onLogin={login} />
        <Toaster position="top-right" />
      </>
    );
  }

  return (
    <Router>
      <Layout user={user} onLogout={logout}>
        <Routes>
          <Route path="/" element={user.role === 'admin' ? <Dashboard /> : <Navigate to="/projects" />} />
          <Route path="/clients" element={user.role === 'admin' ? <Clients /> : <Navigate to="/projects" />} />
          <Route path="/projects" element={<Projects />} />
          <Route path="/time-logs" element={<TimeLogs />} />
          <Route path="/invoices" element={user.role === 'admin' ? <Invoices /> : <Navigate to="/projects" />} />
          <Route path="/payments" element={user.role === 'admin' ? <Payments /> : <Navigate to="/projects" />} />
          <Route path="/reports" element={user.role === 'admin' ? <Reports /> : <Navigate to="/projects" />} />
          <Route path="*" element={<Navigate to="/" />} />
        </Routes>
      </Layout>
      <Toaster position="top-right" />
    </Router>
  );
}
