import { Link, useLocation, Outlet } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';
import { useState, useEffect, useRef } from 'react';
import ThemeToggle from './ThemeToggle';

export default function Layout() {
  const { user, logout } = useAuth();
  const location = useLocation();
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const [accountMenuOpen, setAccountMenuOpen] = useState(false);
  const dropdownRef = useRef(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setMoreMenuOpen(false);
        setAccountMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const { data: applicationsData } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.get('/api/applications'),
    refetchInterval: 60000, // Check every minute
  });

  const pendingCount = applicationsData?.applications?.filter(a => a.status === 'pending').length || 0;

  const isActive = (path) => {
    if (path === '/dashboard') {
      return location.pathname === '/' || location.pathname === '/dashboard';
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/dashboard" className="text-xl font-bold flex items-center gap-2 hover:text-gray-200">
              <span>🏠</span> RentKeepers
            </Link>
            
            <div className="flex items-center gap-4" ref={dropdownRef}>
              {/* Core Navigation */}
              <Link 
                to="/dashboard" 
                className={`flex items-center gap-1 hover:text-gray-200 transition-colors ${isActive('/dashboard') ? 'text-white font-semibold' : 'text-gray-300'}`}
              >
                <span>📊</span> Dashboard
              </Link>
              <Link 
                to="/tenants" 
                className={`flex items-center gap-1 hover:text-gray-200 transition-colors ${isActive('/tenants') ? 'text-white font-semibold' : 'text-gray-300'}`}
              >
                <span>👥</span> Tenants
              </Link>
              <Link 
                to="/payments" 
                className={`flex items-center gap-1 hover:text-gray-200 transition-colors ${isActive('/payments') ? 'text-white font-semibold' : 'text-gray-300'}`}
              >
                <span>💰</span> Payments
              </Link>
              <Link 
                to="/properties" 
                className={`flex items-center gap-1 hover:text-gray-200 transition-colors ${isActive('/properties') ? 'text-white font-semibold' : 'text-gray-300'}`}
              >
                <span>🏢</span> Properties
              </Link>
              <Link 
                to="/applications" 
                className={`flex items-center gap-1 hover:text-gray-200 transition-colors relative ${isActive('/applications') ? 'text-white font-semibold' : 'text-gray-300'}`}
              >
                <span>📋</span> Applications
                {pendingCount > 0 && (
                  <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
                    {pendingCount}
                  </span>
                )}
              </Link>

              {/* More Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                  className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                >
                  <span>⋮</span> More
                </button>
                {moreMenuOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-lg shadow-lg py-2 z-50 text-gray-800">
                    <Link 
                      to="/statements" 
                      className={`block px-4 py-2 hover:bg-gray-100 ${isActive('/statements') ? 'bg-gray-100 font-semibold' : ''}`}
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <span>📄</span> Statements
                    </Link>
                    <Link 
                      to="/smart-home" 
                      className={`block px-4 py-2 hover:bg-gray-100 ${isActive('/smart-home') ? 'bg-gray-100 font-semibold' : ''}`}
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <span>🏠</span> Smart Home
                    </Link>
                    <Link 
                      to="/late-rent" 
                      className={`block px-4 py-2 hover:bg-gray-100 ${isActive('/late-rent') ? 'bg-gray-100 font-semibold' : ''}`}
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <span>⚠️</span> Late Rent
                    </Link>
                    <Link 
                      to="/calendar" 
                      className={`block px-4 py-2 hover:bg-gray-100 ${isActive('/calendar') ? 'bg-gray-100 font-semibold' : ''}`}
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <span>📅</span> Calendar
                    </Link>
                    <Link 
                      to="/documents" 
                      className={`block px-4 py-2 hover:bg-gray-100 ${isActive('/documents') ? 'bg-gray-100 font-semibold' : ''}`}
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <span>📁</span> Documents
                    </Link>
                    <Link 
                      to="/audit-logs" 
                      className={`block px-4 py-2 hover:bg-gray-100 ${isActive('/audit-logs') ? 'bg-gray-100 font-semibold' : ''}`}
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <span>📜</span> Audit Logs
                    </Link>
                    <hr className="my-1" />
                    <Link 
                      to="/settings" 
                      className="block px-4 py-2 hover:bg-gray-100"
                      onClick={() => setMoreMenuOpen(false)}
                    >
                      <span>⚙️</span> Settings
                    </Link>
                  </div>
                )}
              </div>

              <ThemeToggle />
              
              {/* Account Dropdown */}
              <div className="relative">
                <button 
                  onClick={() => setAccountMenuOpen(!accountMenuOpen)}
                  className="flex items-center gap-1 hover:text-gray-200 transition-colors"
                >
                  <span>👤</span> {user?.first_name || 'Account'}
                </button>
                {accountMenuOpen && (
                  <div className="absolute right-0 mt-2 w-48 bg-white rounded-lg shadow-lg py-2 z-50">
                    <button 
                      onClick={() => {
                        setAccountMenuOpen(false);
                        logout();
                      }}
                      className="w-full text-left px-4 py-2 text-gray-800 hover:bg-gray-100"
                    >
                      <span>🚪</span> Logout
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Flash Messages Container */}
      <div className="container mx-auto px-4 mt-3" id="flash-container"></div>

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
