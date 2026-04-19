import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { api } from '../api/client';

export default function Payments() {
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState('');
  const [amount, setAmount] = useState('');
  const [month, setMonth] = useState(new Date().toISOString().slice(0, 7));
  const [error, setError] = useState('');

  const { data: tenants } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get('/api/tenants'),
  });

  const { data: payments, isLoading } = useQuery({
    queryKey: ['payments'],
    queryFn: () => api.get('/api/payments'),
  });

  const addPaymentMutation = useMutation({
    mutationFn: (payment) => api.post('/api/payments', payment),
    onSuccess: () => {
      queryClient.invalidateQueries(['payments']);
      queryClient.invalidateQueries(['dashboard']);
      setSelectedTenant('');
      setAmount('');
      setError('');
    },
    onError: (err) => setError(err.message || 'Failed to log payment'),
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!selectedTenant || !amount) return;
    
    addPaymentMutation.mutate({
      tenant_id: parseInt(selectedTenant),
      amount_paid: parseFloat(amount),
      for_month: month,
    });
  };

  if (isLoading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">💰 Payments</h2>

      {/* Log Payment Form */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold mb-4">Log New Payment</h3>
        
        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2">Tenant</label>
            <select
              value={selectedTenant}
              onChange={(e) => setSelectedTenant(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            >
              <option value="">Select tenant</option>
              {tenants?.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Amount</label>
            <div className="relative">
              <span className="absolute left-3 top-2">$</span>
              <input
                type="number"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full px-3 py-2 pl-7 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">For Month</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={addPaymentMutation.isLoading}
              className="w-full bg-green-600 text-white font-bold py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {addPaymentMutation.isLoading ? 'Saving...' : '💾 Log Payment'}
            </button>
          </div>
        </form>
      </div>

      {/* Payment History */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="text-lg font-semibold">Payment History</h3>
        </div>

        {payments?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">For Month</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => (
                  <tr key={payment.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      {new Date(payment.payment_date).toLocaleDateString()}
                    </td>
                    <td className="px-4 py-3">{payment.tenant?.name}</td>
                    <td className="px-4 py-3 text-green-600 font-semibold">
                      ${payment.amount_paid.toFixed(2)}
                    </td>
                    <td className="px-4 py-3">{payment.for_month}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10 text-gray-500">
            No payments recorded yet.
          </div>
        )}
      </div>
    </div>
  );
}