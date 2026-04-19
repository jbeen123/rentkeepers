import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

export default function Settings() {
  const { user, updateUser } = useAuth();
  const [activeTab, setActiveTab] = useState('profile');
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  // Profile form
  const [profileData, setProfileData] = useState({
    first_name: user?.first_name || '',
    last_name: user?.last_name || '',
    email: user?.email || '',
  });

  // Password form
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: '',
  });

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    try {
      const updated = await api.put('/api/user/profile', profileData);
      updateUser({ ...user, ...updated });
      setMessage('Profile updated successfully');
    } catch (err) {
      setError(err.message || 'Failed to update profile');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();
    setError('');
    setMessage('');

    if (passwordData.new_password !== passwordData.confirm_password) {
      setError('New passwords do not match');
      return;
    }

    try {
      await api.post('/api/user/change-password', {
        current_password: passwordData.current_password,
        new_password: passwordData.new_password,
      });
      setMessage('Password changed successfully');
      setPasswordData({ current_password: '', new_password: '', confirm_password: '' });
    } catch (err) {
      setError(err.message || 'Failed to change password');
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">⚙️ Settings</h2>

      {message && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded mb-4">
          {message}
        </div>
      )}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <div className="flex gap-4 mb-6 border-b">
        {['profile', 'password', '2fa'].map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`pb-2 px-4 font-semibold ${
              activeTab === tab
                ? 'border-b-2 border-blue-600 text-blue-600'
                : 'text-gray-500 hover:text-gray-700'
            }`}
          >
            {tab === '2fa' ? 'Two-Factor Auth' : tab.charAt(0).toUpperCase() + tab.slice(1)}
          </button>
        ))}
      </div>

      {activeTab === 'profile' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-xl">
          <h3 className="text-lg font-semibold mb-4">Profile Information</h3>
          <form onSubmit={handleProfileUpdate}>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-gray-700 font-bold mb-2">First Name</label>
                <input
                  type="text"
                  value={profileData.first_name}
                  onChange={(e) => setProfileData({ ...profileData, first_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Last Name</label>
                <input
                  type="text"
                  value={profileData.last_name}
                  onChange={(e) => setProfileData({ ...profileData, last_name: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">Email</label>
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700"
            >
              Update Profile
            </button>
          </form>
        </div>
      )}

      {activeTab === 'password' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-xl">
          <h3 className="text-lg font-semibold mb-4">Change Password</h3>
          <form onSubmit={handlePasswordChange}>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">Current Password</label>
              <input
                type="password"
                value={passwordData.current_password}
                onChange={(e) => setPasswordData({ ...passwordData, current_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">New Password</label>
              <input
                type="password"
                value={passwordData.new_password}
                onChange={(e) => setPasswordData({ ...passwordData, new_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                required
                minLength={8}
              />
            </div>
            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">Confirm New Password</label>
              <input
                type="password"
                value={passwordData.confirm_password}
                onChange={(e) => setPasswordData({ ...passwordData, confirm_password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                required
              />
            </div>
            <button
              type="submit"
              className="bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700"
            >
              Change Password
            </button>
          </form>
        </div>
      )}

      {activeTab === '2fa' && (
        <div className="bg-white rounded-lg shadow p-6 max-w-xl">
          <h3 className="text-lg font-semibold mb-4">Two-Factor Authentication</h3>
          <p className="text-gray-600 mb-4">
            {user?.totp_enabled
              ? '✅ 2FA is currently enabled on your account.'
              : '⚠️ 2FA is not enabled. Enable it for extra security.'}
          </p>
          {user?.totp_enabled ? (
            <button className="bg-red-600 text-white font-bold py-2 px-6 rounded hover:bg-red-700">
              Disable 2FA
            </button>
          ) : (
            <button className="bg-green-600 text-white font-bold py-2 px-6 rounded hover:bg-green-700">
              Enable 2FA
            </button>
          )}
        </div>
      )}
    </div>
  );
}
