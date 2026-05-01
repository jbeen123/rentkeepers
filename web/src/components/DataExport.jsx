import { useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { api } from '../api/client';

export default function DataExport() {
  const { user } = useAuth();
  const [exporting, setExporting] = useState(false);
  const [exportType, setExportType] = useState('all');
  const [progress, setProgress] = useState('');

  const exportData = async () => {
    setExporting(true);
    setProgress('Preparing your data export...');
    
    try {
      const { data } = await api.post('/api/data-export', {
        type: exportType,
        format: 'json'
      });
      
      // Download the export
      const blob = new Blob([JSON.stringify(data.export_data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rentkeepers_export_${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      window.URL.revokeObjectURL(url);
      
      setProgress('Export completed!');
    } catch (err) {
      setProgress('Export failed. Please try again.');
    } finally {
      setExporting(false);
      setTimeout(() => setProgress(''), 5000);
    }
  };

  const exportCSV = async () => {
    setExporting(true);
    setProgress('Generating CSV export...');
    
    try {
      const { data } = await api.post('/api/data-export', {
        type: exportType,
        format: 'csv'
      });
      
      const blob = new Blob([data.csv_data], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `rentkeepers_export_${new Date().toISOString().split('T')[0]}.csv`;
      a.click();
      
      setProgress('CSV export completed!');
    } catch (err) {
      setProgress('Export failed. Please try again.');
    } finally {
      setExporting(false);
      setTimeout(() => setProgress(''), 5000);
    }
  };

  const requestGDPRDeletion = async () => {
    const confirmed = confirm(
      '⚠️ WARNING: This will permanently delete all your data.\n\n' +
      'This action cannot be undone. All tenants, properties, payments, and settings will be deleted.\n\n' +
      'Are you absolutely sure you want to proceed?'
    );
    
    if (!confirmed) return;
    
    try {
      await api.post('/api/gdpr-delete');
      alert('Your account deletion request has been processed. You will be logged out.');
      window.location.href = '/logout';
    } catch (err) {
      alert('Failed to process deletion request. Please contact support.');
    }
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-6">
      <h3 className="text-lg font-bold mb-4">📦 Data Export (GDPR)</h3>
      
      <p className="text-gray-600 dark:text-gray-400 mb-4">
        Download all your data in a portable format. This includes tenants, properties, payments, 
        applications, and settings. Complies with GDPR data portability requirements.
      </p>

      <div className="space-y-4">
        <div>
          <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">Export Type</label>
          <select
            value={exportType}
            onChange={(e) => setExportType(e.target.value)}
            className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
          >
            <option value="all">All Data (Recommended)</option>
            <option value="tenants">Tenants Only</option>
            <option value="properties">Properties Only</option>
            <option value="payments">Payments Only</option>
            <option value="applications">Applications Only</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            onClick={exportData}
            disabled={exporting}
            className="flex-1 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            📥 Export JSON
          </button>
          <button
            onClick={exportCSV}
            disabled={exporting}
            className="flex-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 disabled:opacity-50"
          >
            📊 Export CSV
          </button>
        </div>

        {progress && (
          <div className={`px-4 py-2 rounded ${progress.includes('completed') ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
            {progress}
          </div>
        )}

        <div className="border-t pt-4 mt-4">
          <h4 className="font-bold mb-2">🗑️ GDPR Right to Erasure</h4>
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">
            Request permanent deletion of all your data. This action is irreversible and will delete:
          </p>
          <ul className="text-sm text-gray-600 dark:text-gray-400 list-disc list-inside mb-4">
            <li>All tenant records</li>
            <li>All property information</li>
            <li>All payment history</li>
            <li>All applications</li>
            <li>Your account settings</li>
          </ul>
          <button
            onClick={requestGDPRDeletion}
            className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
          >
            ⚠️ Request Account Deletion
          </button>
        </div>

        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
          <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">ℹ️ GDPR Rights</h4>
          <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
            <li>✓ Right to access your data</li>
            <li>✓ Right to data portability</li>
            <li>✓ Right to rectification</li>
            <li>✓ Right to erasure ("right to be forgotten")</li>
          </ul>
        </div>
      </div>
    </div>
  );
}
