import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

export default function TwoFactorAuth() {
  const { user } = useAuth();
  const [enabled, setEnabled] = useState(user?.totp_enabled || false);
  const [showSetup, setShowSetup] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [token, setToken] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const startSetup = async () => {
    try {
      const { data } = await api.post('/api/2fa/setup');
      setQrCode(data.qr_code);
      setSecret(data.secret);
      setShowSetup(true);
    } catch (err) {
      setError('Failed to start 2FA setup');
    }
  };

  const verifySetup = async () => {
    try {
      await api.post('/api/2fa/verify', { token });
      setEnabled(true);
      setShowSetup(false);
      setSuccess('2FA enabled successfully!');
      setToken('');
    } catch (err) {
      setError('Invalid token. Please try again.');
    }
  };

  const disable2FA = async () => {
    try {
      await api.post('/api/2fa/disable');
      setEnabled(false);
      setSuccess('2FA disabled');
    } catch (err) {
      setError('Failed to disable 2FA');
    }
  };

  const downloadBackupCodes = () => {
    const codes = ['123456', '234567', '345678', '456789', '567890'];
    const blob = new Blob([codes.join('\n')], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = '2fa-backup-codes.txt';
    a.click();
  };

  if (!enabled) {
    return (
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="text-lg font-bold mb-4">🔐 Two-Factor Authentication</h3>
        <p className="text-gray-600 dark:text-gray-400 mb-4">
          Add an extra layer of security to your account. Requires a code from your phone in addition to your password.
        </p>
        
        {!showSetup ? (
          <button
            onClick={startSetup}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Enable 2FA
          </button>
        ) : (
          <div className="space-y-4">
            <div className="text-center">
              <div className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                Scan this QR code with your authenticator app:
              </div>
              <div className="bg-white p-4 rounded-lg inline-block">
                <img src={qrCode} alt="2FA QR Code" className="w-48 h-48" />
              </div>
              <div className="mt-4 p-3 bg-gray-50 dark:bg-gray-700 rounded">
                <div className="text-sm text-gray-600 dark:text-gray-400">Manual entry code:</div>
                <div className="font-mono text-lg">{secret}</div>
              </div>
            </div>

            <div>
              <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">
                Enter 6-digit code from your app:
              </label>
              <input
                type="text"
                value={token}
                onChange={(e) => setToken(e.target.value)}
                maxLength="6"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
                placeholder="123456"
              />
            </div>

            {error && (
              <div className="bg-red-100 dark:bg-red-900/20 text-red-700 dark:text-red-400 px-4 py-2 rounded">
                {error}
              </div>
            )}

            <div className="flex gap-2">
              <button
                onClick={verifySetup}
                className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
              >
                Verify & Enable
              </button>
              <button
                onClick={() => setShowSetup(false)}
                className="bg-gray-600 text-white px-4 py-2 rounded hover:bg-gray-700"
              >
                Cancel
              </button>
            </div>

            <div className="text-sm text-gray-500 dark:text-gray-400">
              <p>Compatible apps:</p>
              <ul className="list-disc list-inside mt-1">
                <li>Google Authenticator</li>
                <li>Authy</li>
                <li>Microsoft Authenticator</li>
                <li>Duo Mobile</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">🔐 Two-Factor Authentication</h3>
      <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-green-800 dark:text-green-200">
          <span className="text-xl">✅</span>
          <span className="font-medium">2FA is enabled</span>
        </div>
        <p className="text-sm text-green-700 dark:text-green-300 mt-1">
          Your account is protected with two-factor authentication.
        </p>
      </div>

      <div className="space-y-3">
        <button
          onClick={downloadBackupCodes}
          className="w-full bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          📥 Download Backup Codes
        </button>
        <button
          onClick={disable2FA}
          className="w-full bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
        >
          Disable 2FA
        </button>
      </div>

      {success && (
        <div className="mt-4 bg-green-100 dark:bg-green-900/20 text-green-700 dark:text-green-400 px-4 py-2 rounded">
          {success}
        </div>
      )}
    </div>
  );
}
