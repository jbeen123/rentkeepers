import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export default function AuditLogs() {
  const [filter, setFilter] = useState('all');
  const [dateRange, setDateRange] = useState('7d');

  const { data: logsData, isLoading } = useQuery({
    queryKey: ['audit-logs', filter, dateRange],
    queryFn: () => api.get(`/api/audit-logs?filter=${filter}&range=${dateRange}`),
  });

  const logs = logsData?.logs || [];

  const getActionIcon = (action) => {
    const icons = {
      LOGIN: '🔑',
      LOGOUT: '🚪',
      TENANT_CREATED: '➕',
      TENANT_UPDATED: '✏️',
      TENANT_DELETED: '🗑️',
      PAYMENT_RECORDED: '💰',
      PAYMENT_DELETED: '❌',
      PROPERTY_CREATED: '🏠',
      PROPERTY_UPDATED: '🏢',
      LEASE_UPLOADED: '📄',
      AUTO_PAY_ENABLED: '💳',
      AUTO_PAY_CHARGE_SUCCESS: '✅',
      AUTO_PAY_CHARGE_FAILED: '⚠️',
      LATE_FEE_APPLIED: '⚠️',
      EXPENSE_ADDED: '📝',
      EXPENSE_DELETED: '📤',
      APPLICATION_SUBMITTED: '📋',
      APPLICATION_APPROVED: '✓',
      APPLICATION_DENIED: '✗',
    };
    return icons[action] || '📌';
  };

  const getActionColor = (action) => {
    if (action.includes('DELETED') || action.includes('FAILED') || action.includes('DENIED')) {
      return 'text-red-600 bg-red-50 dark:bg-red-900/20';
    }
    if (action.includes('CREATED') || action.includes('SUCCESS') || action.includes('APPROVED')) {
      return 'text-green-600 bg-green-50 dark:bg-green-900/20';
    }
    if (action.includes('UPDATED') || action.includes('APPLIED')) {
      return 'text-blue-600 bg-blue-50 dark:bg-blue-900/20';
    }
    return 'text-gray-600 bg-gray-50 dark:bg-gray-700';
  };

  const exportLogs = () => {
    const csv = logs.map(log => 
      `${log.id},"${log.action}","${log.resource_type}","${log.resource_id}","${log.details}","${log.ip_address}","${log.created_at}"`
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `audit_logs_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading audit logs...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📜 Activity Audit Logs</h2>
        <button
          onClick={exportLogs}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          📥 Export Logs
        </button>
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">Action Type</label>
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              <option value="all">All Actions</option>
              <option value="login">Logins</option>
              <option value="tenant">Tenant Actions</option>
              <option value="payment">Payment Actions</option>
              <option value="property">Property Actions</option>
              <option value="application">Application Actions</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700 dark:text-gray-300 font-bold mb-2">Time Range</label>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500 dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            >
              <option value="24h">Last 24 Hours</option>
              <option value="7d">Last 7 Days</option>
              <option value="30d">Last 30 Days</option>
              <option value="90d">Last 90 Days</option>
              <option value="all">All Time</option>
            </select>
          </div>
          <div className="flex items-end text-sm text-gray-500 dark:text-gray-400">
            Showing {logs.length} actions
          </div>
        </div>
      </div>

      {/* Logs Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 dark:bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Action</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Resource</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Details</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">IP Address</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Timestamp</th>
              </tr>
            </thead>
            <tbody>
              {logs.length > 0 ? (
                logs.map((log) => (
                  <tr key={log.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center gap-2 px-2 py-1 rounded text-sm ${getActionColor(log.action)}`}>
                        <span>{getActionIcon(log.action)}</span>
                        <span className="font-medium">{log.action.replace(/_/g, ' ')}</span>
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      {log.resource_type && (
                        <div className="text-sm">
                          <span className="capitalize">{log.resource_type}</span>
                          {log.resource_id && <span className="text-gray-500 dark:text-gray-400"> #{log.resource_id}</span>}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {log.details || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm font-mono text-gray-600 dark:text-gray-400">
                      {log.ip_address || '-'}
                    </td>
                    <td className="px-4 py-3 text-sm text-gray-600 dark:text-gray-400">
                      {new Date(log.created_at).toLocaleString()}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-4 py-10 text-center text-gray-500 dark:text-gray-400">
                    <div className="text-4xl mb-3">📜</div>
                    No audit logs found for the selected filters.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Info Box */}
      <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4">
        <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">ℹ️ About Audit Logs</h4>
        <p className="text-sm text-blue-700 dark:text-blue-300">
          Audit logs track all important actions in your account for security and compliance purposes. 
          Logs are retained for 2 years and can be exported for auditing or GDPR compliance requests.
        </p>
      </div>
    </div>
  );
}
