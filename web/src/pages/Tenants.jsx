import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api/client';
import AutoPayModal from '../components/AutoPayModal';

export default function Tenants() {
  const queryClient = useQueryClient();
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get('/api/tenants'),
  });
  
  const [selectedTenant, setSelectedTenant] = useState(null);
  const [showAutoPayModal, setShowAutoPayModal] = useState(false);
  const [autopayStatuses, setAutopayStatuses] = useState({});
  
  // Bulk actions
  const [selectedTenants, setSelectedTenants] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');

  // Fetch autopay status for each tenant
  const fetchAutopayStatus = async (tenantId) => {
    try {
      const { data } = await api.get(`/api/autopay/status/${tenantId}`);
      setAutopayStatuses(prev => ({ ...prev, [tenantId]: data }));
    } catch (err) {
      // Silently fail - autopay not enabled
      setAutopayStatuses(prev => ({ ...prev, [tenantId]: { enabled: false } }));
    }
  };

  const handleAutoPayClick = (tenant) => {
    setSelectedTenant(tenant);
    setShowAutoPayModal(true);
  };

  const handleAutoPaySuccess = () => {
    setShowAutoPayModal(false);
    setSelectedTenant(null);
    // Refresh autopay statuses
    tenants?.forEach(t => fetchAutopayStatus(t.id));
    // Refresh tenant list
    queryClient.invalidateQueries({ queryKey: ['tenants'] });
  };

  // Load autopay statuses on mount
  useEffect(() => {
    if (tenants) {
      tenants.forEach(t => {
        fetchAutopayStatus(t.id);
      });
    }
  }, [tenants]);

  // Filter tenants based on search and status
  const filteredTenants = tenants?.filter(tenant => {
    const matchesSearch = searchQuery === '' || 
      tenant.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tenant.property?.address?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'autopay' && autopayStatuses[tenant.id]?.enabled) ||
      (filterStatus === 'portal' && tenant.portal_enabled);
    
    return matchesSearch && matchesStatus;
  });

  // Bulk action handlers
  const toggleTenantSelection = (tenantId) => {
    setSelectedTenants(prev => 
      prev.includes(tenantId) 
        ? prev.filter(id => id !== tenantId)
        : [...prev, tenantId]
    );
  };

  const selectAll = () => {
    setSelectedTenants(filteredTenants.map(t => t.id));
  };

  const deselectAll = () => {
    setSelectedTenants([]);
  };

  const handleBulkMessage = () => {
    alert(`Send message to ${selectedTenants.length} tenants (feature coming soon)`);
  };

  const handleBulkExport = () => {
    const selectedData = filteredTenants.filter(t => selectedTenants.includes(t.id));
    const csv = selectedData.map(t => 
      `${t.id},"${t.name}","${t.email}","${t.phone}",${t.monthly_rent}`
    ).join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tenants_export.csv';
    a.click();
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">👥 Tenants</h2>
        <Link 
          to="/tenants/add" 
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          ➕ Add Tenant
        </Link>
      </div>

      {/* Search & Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <input
              type="text"
              placeholder="🔍 Search tenants..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            />
          </div>
          <div>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500 dark:bg-gray-800 dark:border-gray-700 dark:text-gray-200"
            >
              <option value="all">All Tenants</option>
              <option value="autopay">Auto-Pay Active</option>
              <option value="portal">Portal Enabled</option>
            </select>
          </div>
          <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
            Showing {filteredTenants?.length || 0} of {tenants?.length || 0} tenants
          </div>
        </div>
      </div>

      {/* Bulk Actions Bar */}
      {selectedTenants.length > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-6">
          <div className="flex justify-between items-center">
            <div className="text-blue-800 dark:text-blue-200 font-medium">
              ✓ {selectedTenants.length} tenant{selectedTenants.length > 1 ? 's' : ''} selected
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleBulkMessage}
                className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
              >
                📧 Send Message
              </button>
              <button
                onClick={handleBulkExport}
                className="bg-green-600 text-white px-3 py-1 rounded text-sm hover:bg-green-700"
              >
                📥 Export
              </button>
              <button
                onClick={deselectAll}
                className="bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700"
              >
                Clear
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-lg shadow">
        {tenants?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 dark:bg-gray-800">
                <tr>
                  <th className="px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={selectedTenants.length > 0 && selectedTenants.length === filteredTenants?.length}
                      onChange={(e) => e.target.checked ? selectAll() : deselectAll()}
                      className="w-4 h-4"
                    />
                  </th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Monthly Rent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Due Day</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants?.map((tenant) => (
                  <tr key={tenant.id} className="border-t hover:bg-gray-50 dark:hover:bg-gray-800">
                    <td className="px-4 py-3 text-center">
                      <input
                        type="checkbox"
                        checked={selectedTenants.includes(tenant.id)}
                        onChange={() => toggleTenantSelection(tenant.id)}
                        className="w-4 h-4"
                      />
                    </td>
                    <td className="px-4 py-3 font-medium">{tenant.name}</td>
                    <td className="px-4 py-3">{tenant.property?.address || 'N/A'}</td>
                    <td className="px-4 py-3">${tenant.monthly_rent?.toFixed(2)}</td>
                    <td className="px-4 py-3">Day {tenant.due_day}</td>
                    <td className="px-4 py-3">
                      <div>{tenant.email}</div>
                      <div className="text-sm text-gray-500">{tenant.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-2">
                        <div className="flex gap-2">
                          <Link 
                            to={`/tenants/${tenant.id}/edit`}
                            className="text-blue-600 hover:text-blue-800 text-sm"
                          >
                            Edit
                          </Link>
                          {tenant.portal_enabled ? (
                            <button
                              onClick={() => {
                                navigator.clipboard.writeText(`${window.location.origin}/portal/${tenant.portal_token}`);
                                alert('Portal link copied to clipboard!');
                              }}
                              className="text-green-600 hover:text-green-800 text-sm"
                              title="Copy portal link"
                            >
                              🔗 Copy Link
                            </button>
                          ) : (
                            <button
                              onClick={() => alert('Portal enable feature coming soon! This will generate a unique link for the tenant.')}
                              className="text-purple-600 hover:text-purple-800 text-sm"
                              title="Enable tenant portal"
                            >
                              🚀 Enable Portal
                            </button>
                          )}
                        </div>
                        <div className="flex gap-2 items-center">
                          {autopayStatuses[tenant.id]?.enabled ? (
                            <span className="text-green-600 text-sm font-medium flex items-center gap-1">
                              ✅ Auto-Pay Active
                              {autopayStatuses[tenant.id].card_last4 && (
                                <span className="text-gray-500">•••• {autopayStatuses[tenant.id].card_last4}</span>
                              )}
                            </span>
                          ) : (
                            <button
                              onClick={() => handleAutoPayClick(tenant)}
                              className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                              title="Setup auto-pay"
                            >
                              💳 Setup Auto-Pay
                            </button>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">👤</div>
            <p className="text-gray-500">No tenants yet.{' '}
              <Link to="/tenants/add" className="text-blue-600 hover:underline">Add your first tenant</Link>
            </p>
          </div>
        )}
      </div>

      {/* Auto-Pay Modal */}
      {showAutoPayModal && selectedTenant && (
        <AutoPayModal
          tenant={selectedTenant}
          onClose={() => {
            setShowAutoPayModal(false);
            setSelectedTenant(null);
          }}
        />
      )}
    </div>
  );
}