import { Toaster } from "@/components/ui/toaster"
import { QueryClientProvider } from '@tanstack/react-query'
import { queryClientInstance } from '@/lib/query-client'
import { BrowserRouter as Router, Route, Routes } from 'react-router-dom';
import PageNotFound from './lib/PageNotFound';
import { AuthProvider, useAuth } from '@/lib/AuthContext';
import UserNotRegisteredError from '@/components/UserNotRegisteredError';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import PCARecords from './pages/PCARecords';
import PCARecordDetail from './pages/PCARecordDetail';
import NewPCARecord from './pages/NewPCARecord';
import TrendAnalysis from './pages/TrendAnalysis';
import Reports from './pages/Reports';
import Settings from './pages/Settings';
import PCFTallyList from './pages/PCFTallyList';
import PCFTallyDetail from './pages/PCFTallyDetail';
import Login from './pages/Login';

const AuthenticatedApp = () => {
  const { isLoadingAuth, isAuthenticated, authChecked, authError, navigateToLogin } = useAuth();

  if (isLoadingAuth) {
    return (
      <div className="fixed inset-0 flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-slate-200 border-t-slate-800 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (authError) {
    if (authError.type === 'user_not_registered') {
      return <UserNotRegisteredError />;
    } else if (authError.type === 'auth_required') {
      navigateToLogin();
      return null;
    }
  }

  if (authChecked && !isAuthenticated) {
    navigateToLogin();
    return null;
  }

  return (
    <Routes>
      <Route element={<Layout />}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/records" element={<PCARecords />} />
        <Route path="/records/new" element={<NewPCARecord />} />
        <Route path="/records/:recordId" element={<PCARecordDetail />} />
        <Route path="/trends" element={<TrendAnalysis />} />
        <Route path="/reports" element={<Reports />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/pcf-tally" element={<PCFTallyList />} />
        <Route path="/pcf-tally/:tallyId" element={<PCFTallyDetail />} />
      </Route>
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClientInstance}>
        <Router>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/*" element={<AuthenticatedApp />} />
          </Routes>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App
