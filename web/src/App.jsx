import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import useKeyboardShortcuts from './hooks/useKeyboardShortcuts';
import './styles/theme.css';
import Layout from './components/Layout';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import Tenants from './pages/Tenants';
import AddTenant from './pages/AddTenant';
import EditTenant from './pages/EditTenant';
import Properties from './pages/Properties';
import AddProperty from './pages/AddProperty';
import EditProperty from './pages/EditProperty';
import Payments from './pages/Payments';
import Settings from './pages/Settings';
import Pricing from './pages/Pricing';
import Statements from './pages/Statements';
import LandingPage from './pages/LandingPage';
import TenantPortal from './pages/TenantPortal';
import PropertyManagerPortal from './pages/PropertyManagerPortal';
import RentalApplicationForm from './pages/RentalApplicationForm';
import Applications from './pages/Applications';
import SmartHome from './pages/SmartHome';
import AuditLogs from './pages/AuditLogs';
import LateRentWorkflow from './pages/LateRentWorkflow';
import Calendar from './pages/Calendar';
import DocumentManagement from './pages/DocumentManagement';
import ProtectedRoute from './components/ProtectedRoute';
import { useAuth } from './contexts/AuthContext';

const queryClient = new QueryClient();

// Component to handle root route based on auth state
function HomeRoute() {
  const { user, loading } = useAuth();
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (user) {
    return <Navigate to="/dashboard" replace />;
  }
  
  return <LandingPage />;
}

function AppInner() {
  useKeyboardShortcuts();
  
  return (
    <Routes>
      {/* Public routes */}
      <Route path="/" element={<HomeRoute />} />
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/pricing" element={<Pricing />} />
      <Route path="/portal/:token" element={<TenantPortal />} />
      <Route path="/manager/:token" element={<PropertyManagerPortal />} />
      <Route path="/apply/:propertyId?" element={<RentalApplicationForm />} />
      
      {/* Protected app routes */}
      <Route element={<Layout />}>
        <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/tenants" element={<ProtectedRoute><Tenants /></ProtectedRoute>} />
        <Route path="/tenants/add" element={<ProtectedRoute><AddTenant /></ProtectedRoute>} />
        <Route path="/tenants/:id/edit" element={<ProtectedRoute><EditTenant /></ProtectedRoute>} />
        <Route path="/properties" element={<ProtectedRoute><Properties /></ProtectedRoute>} />
        <Route path="/properties/add" element={<ProtectedRoute><AddProperty /></ProtectedRoute>} />
        <Route path="/properties/:id/edit" element={<ProtectedRoute><EditProperty /></ProtectedRoute>} />
        <Route path="/payments" element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/statements" element={<ProtectedRoute><Statements /></ProtectedRoute>} />
        <Route path="/applications" element={<ProtectedRoute><Applications /></ProtectedRoute>} />
        <Route path="/smart-home" element={<ProtectedRoute><SmartHome /></ProtectedRoute>} />
        <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
        <Route path="/late-rent" element={<ProtectedRoute><LateRentWorkflow /></ProtectedRoute>} />
        <Route path="/calendar" element={<ProtectedRoute><Calendar /></ProtectedRoute>} />
        <Route path="/documents" element={<ProtectedRoute><DocumentManagement /></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      </Route>
      
      {/* Catch all */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <AppInner />
        </BrowserRouter>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
