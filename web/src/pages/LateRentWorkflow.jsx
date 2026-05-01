import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export default function LateRentWorkflow() {
  const queryClient = useQueryClient();
  const [runningCheck, setRunningCheck] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  const { data: noticesData, isLoading } = useQuery({
    queryKey: ['late-notices'],
    queryFn: () => api.get('/api/late-notices'),
    refetchInterval: 60000,
  });

  const checkLateRent = useMutation({
    mutationFn: () => api.post('/api/late-rent/check'),
    onSuccess: (data) => {
      setLastResult(data);
      queryClient.invalidateQueries(['late-notices']);
      setTimeout(() => setLastResult(null), 5000);
    },
  });

  const updateNoticeStatus = useMutation({
    mutationFn: ({ noticeId, status, notes }) => 
      api.post(`/api/late-notices/${noticeId}/status`, { status, notes }),
    onSuccess: () => {
      queryClient.invalidateQueries(['late-notices']);
    },
  });

  const runCheck = () => {
    setRunningCheck(true);
    checkLateRent.mutate();
    setRunningCheck(false);
  };

  const getNoticeColor = (type) => {
    const colors = {
      reminder: 'bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-200',
      late: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-200',
      final: 'bg-orange-100 text-orange-800 dark:bg-orange-900/20 dark:text-orange-200',
      pay_or_quit: 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-200'
    };
    return colors[type] || 'bg-gray-100 text-gray-800';
  };

  const notices = noticesData?.notices || [];

  if (isLoading) {
    return <div className="text-center py-10">Loading late rent notices...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">⚠️ Automated Late Rent Workflow</h2>
        <button
          onClick={runCheck}
          disabled={runningCheck}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 disabled:opacity-50"
        >
          {runningCheck ? '⏳ Running...' : '🔍 Check Late Rent Now'}
        </button>
      </div>

      {/* Info Box */}
      <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
        <h4 className="font-bold text-blue-800 dark:text-blue-200 mb-2">🤖 How It Works</h4>
        <ul className="text-sm text-blue-700 dark:text-blue-300 space-y-1">
          <li>• <strong>0-3 days late:</strong> Friendly reminder (no fee)</li>
          <li>• <strong>4-7 days late:</strong> Late notice + late fee applied</li>
          <li>• <strong>8-14 days late:</strong> Final notice + higher fee</li>
          <li>• <strong>15+ days late:</strong> Pay-or-quit notice + maximum fee</li>
        </ul>
        <p className="text-xs text-blue-600 dark:text-blue-400 mt-3">
          Click "Check Late Rent Now" to scan all tenants and send automated notices.
          This runs automatically once daily, but you can run it manually anytime.
        </p>
      </div>

      {/* Last Result */}
      {lastResult && (
        <div className="bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800 rounded-lg p-4 mb-6">
          <div className="flex items-center gap-2 text-green-800 dark:text-green-200 font-bold">
            <span>✅</span> Check Complete
          </div>
          <p className="text-sm text-green-700 dark:text-green-300 mt-2">
            Sent {lastResult.notices_sent} notice{lastResult.notices_sent !== 1 ? 's' : ''}
          </p>
          {lastResult.details && lastResult.details.length > 0 && (
            <ul className="text-sm text-green-700 dark:text-green-300 mt-2 list-disc list-inside">
              {lastResult.details.map((detail, i) => (
                <li key={i}>
                  {detail.tenant}: {detail.notice_type} ({detail.days_late} days late) - ${detail.amount_due}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Notices List */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow">
        <div className="p-4 border-b dark:border-gray-700">
          <h3 className="font-bold text-lg">Recent Notices</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">Last 50 notices sent</p>
        </div>

        {notices.length > 0 ? (
          <div className="divide-y dark:divide-gray-700">
            {notices.map((notice) => (
              <div key={notice.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <span className={`px-2 py-1 rounded text-xs font-semibold uppercase ${getNoticeColor(notice.notice_type)}`}>
                        {notice.notice_type.replace('_', ' ')}
                      </span>
                      <span className="font-bold text-gray-800 dark:text-gray-200">{notice.tenant_name}</span>
                    </div>
                    <div className="text-sm text-gray-600 dark:text-gray-400">
                      <span>{notice.days_late} days late</span>
                      <span className="mx-2">•</span>
                      <span>Amount Due: ${notice.amount_due}</span>
                      {notice.late_fee > 0 && (
                        <span className="text-red-600 dark:text-red-400 ml-2">
                          (includes ${notice.late_fee} late fee)
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Sent: {new Date(notice.sent_at).toLocaleString()}
                      {notice.delivered && <span className="text-green-600 dark:text-green-400 ml-2">✓ Delivered</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <select
                      value={notice.status}
                      onChange={(e) => updateNoticeStatus.mutate({
                        noticeId: notice.id,
                        status: e.target.value
                      })}
                      className="px-2 py-1 border rounded text-sm dark:bg-gray-700 dark:border-gray-600"
                    >
                      <option value="sent">Sent</option>
                      <option value="viewed">Viewed</option>
                      <option value="paid">Paid</option>
                      <option value="escalated">Escalated</option>
                    </select>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500 dark:text-gray-400">
            <div className="text-4xl mb-3">✅</div>
            <p>No late notices sent yet.</p>
            <p className="text-sm mt-1">Click "Check Late Rent Now" to scan for late payments.</p>
          </div>
        )}
      </div>

      {/* Settings */}
      <div className="mt-6 bg-white dark:bg-gray-800 rounded-lg shadow p-6">
        <h3 className="font-bold text-lg mb-4">⚙️ Workflow Settings</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Default Late Fee (4-7 days)
            </label>
            <input
              type="number"
              defaultValue="50"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Final Notice Fee (8-14 days)
            </label>
            <input
              type="number"
              defaultValue="100"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Pay-or-Quit Fee (15+ days)
            </label>
            <input
              type="number"
              defaultValue="150"
              className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200"
            />
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 dark:text-gray-300 mb-2">
              Auto-Run Frequency
            </label>
            <select className="w-full px-3 py-2 border rounded dark:bg-gray-700 dark:border-gray-600 dark:text-gray-200">
              <option>Daily (recommended)</option>
              <option>Twice Daily</option>
              <option>Manual Only</option>
            </select>
          </div>
        </div>
        <button className="mt-4 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700">
          💾 Save Settings
        </button>
      </div>
    </div>
  );
}
