import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-slate-700 to-slate-600 text-white">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="text-xl font-bold flex items-center gap-2">
              <span>🏠</span> RentKeepers
            </Link>
            
            <div className="flex items-center gap-6">
              <Link 
                to="/dashboard" 
                className={`flex items-center gap-1 hover:text-gray-200 ${isActive('/dashboard') ? 'text-white font-semibold' : 'text-gray-300'}`}
              >
                <span>📊</span> Dashboard
              </Link>
              <Link 
                to="/tenants" 
                className={`flex items-center gap-1 hover:text-gray-200 ${isActive('/tenants') ? 'text-white font-semibold' : 'text-gray-300'}`}
              >
                <span>👥</span> Tenants
              </Link>
              <Link 
                to="/properties" 
                className={`flex items-center gap-1 hover:text-gray-200 ${isActive('/properties') ? 'text-white font-semibold' : 'text-gray-300'}`}
              >
                <span>🏢</span> Properties
              </Link>
              <Link 
                to="/payments" 
                className={`flex items-center gap-1 hover:text-gray-200 ${isActive('/payments') ? 'text-white font-semibold' : 'text-gray-300'}`}
              >
                <span>💰</span> Payments
              </Link>
              <Link 
                to="/statements" 
                className={`flex items-center gap-1 hover:text-gray-200 ${isActive('/statements') ? 'text-white font-semibold' : 'text-gray-300'}`}
              >
                <span>📄</span> Statements
              </Link>
              
              <div className="relative group">
                <button className="flex items-center gap-1 hover:text-gray-200">
                  <span>👤</span> {user?.first_name || 'Account'}
                </button>
                <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 hidden group-hover:block z-50">
                  <Link to="/settings" className="block px-4 py-2 text-gray-800 hover:bg-gray-100">
                    <span>⚙️</span> Settings
                  </Link>
                  <hr className="my-1" />
                  <button 
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                  >
                    <span>🚪</span> Logout
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* Footer */}
      <footer className="text-center py-4 text-gray-500 text-sm">
        RentKeepers © 2026 - Simple Rent Tracking
      </footer>
    </div>
  );
}