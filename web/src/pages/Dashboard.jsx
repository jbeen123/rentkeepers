import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { CreditCard, FileText } from 'lucide-react';
import { api } from '../api/client';
import PaymentProcessor from '../components/PaymentProcessor';
import { BarChart, Bar, PieChart, Pie, Cell, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

export default function Dashboard() {
  const queryClient = useQueryClient();
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCharts, setShowCharts] = useState(false);

  const { data: dashboardData, isLoading } = useQuery({
    queryKey: ['dashboard'],
    queryFn: () => api.get('/api/dashboard'),
  });

  const { data: chartData } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: () => api.get('/api/dashboard/charts'),
    enabled: showCharts,
  });

  const { data: applicationsData } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.get('/api/applications'),
  });

  const pendingApplications = applicationsData?.applications?.filter(a => a.status === 'pending').length || 0;

  const handlePaymentSuccess = () => {
    setShowPaymentModal(false);
    setSelectedTenant(null);
    // Refresh dashboard data
    queryClient.invalidateQueries({ queryKey: ['dashboard'] });
  };

  const openPaymentModal = (tenant) => {
    setSelectedTenant(tenant);
    setShowPaymentModal(true);
  };

  const { total_collected = 0, total_expected = 0, tenant_status = [], current_month } = dashboardData || {};
  const outstanding = total_expected - total_collected;
  
  const paidCount = tenant_status.filter(t => t.status === 'paid').length;
  const pendingCount = tenant_status.filter(t => t.status === 'pending').length;
  const lateCount = tenant_status.filter(t => t.status === 'late').length;

  const monthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-2xl font-bold">
          📊 Dashboard <span className="text-gray-500 text-lg">- {monthName}</span>
        </h2>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-green-600">${total_collected.toFixed(2)}</div>
          <div className="text-gray-500 text-sm uppercase tracking-wide">Collected This Month</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="text-3xl font-bold text-blue-600">${total_expected.toFixed(2)}</div>
          <div className="text-gray-500 text-sm uppercase tracking-wide">Expected This Month</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className={`text-3xl font-bold ${outstanding > 0 ? 'text-red-600' : 'text-green-600'}`}>
            ${outstanding.toFixed(2)}
          </div>
          <div className="text-gray-500 text-sm uppercase tracking-wide">Outstanding</div>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start">
            <div>
              <div className={`text-3xl font-bold ${pendingApplications > 0 ? 'text-yellow-600' : 'text-gray-400'}`}>
                {pendingApplications}
              </div>
              <div className="text-gray-500 text-sm uppercase tracking-wide">Pending Applications</div>
            </div>
            {pendingApplications > 0 && (
              <Link to="/applications" className="text-yellow-600 hover:text-yellow-800">
                <FileText className="w-6 h-6" />
              </Link>
            )}
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      {(pendingApplications > 0 || chartData?.income?.length > 0) && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
          {pendingApplications > 0 && (
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg shadow p-4">
              <div className="flex justify-between items-center mb-2">
                <h3 className="font-bold text-yellow-800">⚠️ Action Required</h3>
                <Link to="/applications" className="text-yellow-600 hover:text-yellow-800 text-sm font-medium">
                  View All →
                </Link>
              </div>
              <p className="text-yellow-700 text-sm">
                You have <strong>{pendingApplications} pending application{pendingApplications > 1 ? 's' : ''}</strong> waiting for review.
              </p>
            </div>
          )}
          
          {chartData?.income?.length > 0 && (
            <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg shadow p-4">
              <h3 className="font-bold text-green-800 mb-2">💰 Income Trend</h3>
              <p className="text-green-700 text-sm">
                Latest month: <strong>${chartData.income[chartData.income.length - 1]?.income || 0}</strong>
                {chartData.income.length > 1 && (
                  <span className="ml-2">
                    {chartData.income[chartData.income.length - 1]?.income >= chartData.income[chartData.income.length - 2]?.income ? '↑' : '↓'} 
                    {((chartData.income[chartData.income.length - 1]?.income - chartData.income[chartData.income.length - 2]?.income) / chartData.income[chartData.income.length - 2]?.income * 100).toFixed(1)}%
                  </span>
                )}
              </p>
            </div>
          )}
        </div>
      )}

      {/* Charts Toggle */}
      <div className="mb-6">
        <button
          onClick={() => setShowCharts(!showCharts)}
          className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 flex items-center gap-2"
        >
          📈 {showCharts ? 'Hide' : 'Show'} Analytics
        </button>
      </div>

      {/* Charts Section */}
      {showCharts && chartData && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {/* Monthly Income Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">💰 Monthly Income Trend</h3>
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={chartData.income || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip formatter={(value) => `$${value}`} />
                <Bar dataKey="income" fill="#10b981" name="Income" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Payment Status Pie Chart */}
          <div className="bg-white rounded-lg shadow p-6">
            <h3 className="text-lg font-semibold mb-4">📊 Payment Status</h3>
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={[
                    { name: 'Paid', value: chartData.payment_status?.paid || 0 },
                    { name: 'Pending', value: chartData.payment_status?.pending || 0 },
                    { name: 'Late', value: chartData.payment_status?.late || 0 },
                  ]}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  <Cell fill="#10b981" />
                  <Cell fill="#f59e0b" />
                  <Cell fill="#ef4444" />
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Occupancy Rate Chart */}
          {chartData.occupancy && chartData.occupancy.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">🏠 Occupancy Rate</h3>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={chartData.occupancy}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="property" />
                  <YAxis domain={[0, 100]} />
                  <Tooltip formatter={(value) => `${value}%`} />
                  <Bar dataKey="rate" fill="#3b82f6" name="Occupancy %" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Payment Method Distribution */}
          {chartData.payment_methods && chartData.payment_methods.length > 0 && (
            <div className="bg-white rounded-lg shadow p-6">
              <h3 className="text-lg font-semibold mb-4">💳 Payment Methods</h3>
              <ResponsiveContainer width="100%" height={250}>
                <PieChart>
                  <Pie
                    data={chartData.payment_methods}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="count"
                  >
                    {chartData.payment_methods.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={['#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'][index % 4]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>
      )}

      {/* Rent Status Table */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b flex justify-between items-center">
          <span className="font-semibold">📋 Rent Status - {monthName}</span>
          <Link to="/payments" className="bg-blue-600 text-white px-4 py-2 rounded text-sm hover:bg-blue-700">
            ➕ Log Payment
          </Link>
        </div>
        
        {tenant_status.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tenant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Rent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Due</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenant_status.map((item) => (
                  <tr key={item.tenant.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{item.tenant.name}</div>
                      {item.tenant.phone && <div className="text-sm text-gray-500">{item.tenant.phone}</div>}
                    </td>
                    <td className="px-4 py-3">{item.tenant.property_address}</td>
                    <td className="px-4 py-3">${item.tenant.monthly_rent.toFixed(2)}</td>
                    <td className="px-4 py-3">Day {item.tenant.due_day}</td>
                    <td className="px-4 py-3">
                      {item.status === 'paid' && (
                        <span className="bg-green-500 text-white px-2 py-1 rounded text-sm">
                          ✓ Paid
                        </span>
                      )}
                      {item.status === 'late' && (
                        <span className="bg-red-500 text-white px-2 py-1 rounded text-sm">
                          ⚠ Late
                        </span>
                      )}
                      {item.status === 'pending' && (
                        <span className="bg-yellow-500 text-white px-2 py-1 rounded text-sm">
                          ⏳ Pending
                        </span>
                      )}
                      {item.payment && (
                        <div className="text-sm text-green-600 mt-1">
                          ${item.payment.amount_paid.toFixed(2)} on {item.payment.payment_date}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {item.status !== 'paid' && (
                        <button 
                          onClick={() => openPaymentModal(item.tenant)}
                          className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700 flex items-center gap-1"
                        >
                          <CreditCard className="w-3 h-3" />
                          Pay Now
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">🏠</div>
            <p className="text-gray-500">
              No tenants yet.{' '}
              <Link to="/tenants/add" className="text-blue-600 hover:underline">Add your first tenant</Link>
            </p>
          </div>
        )}
      </div>

      {/* Summary */}
      {tenant_status.length > 0 && (
        <div className="grid grid-cols-3 gap-4 mt-6">
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-green-600 font-semibold">✓ {paidCount} Paid</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-yellow-600 font-semibold">⏳ {pendingCount} Pending</div>
          </div>
          <div className="bg-white rounded-lg shadow p-4 text-center">
            <div className="text-red-600 font-semibold">⚠ {lateCount} Late</div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedTenant && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">Pay Rent</h3>
                <button 
                  onClick={() => setShowPaymentModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <PaymentProcessor 
                tenantId={selectedTenant.id}
                monthlyRent={selectedTenant.monthly_rent}
                tenantName={selectedTenant.name}
                onSuccess={handlePaymentSuccess}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}