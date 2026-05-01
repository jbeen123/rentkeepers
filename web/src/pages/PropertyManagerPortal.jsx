import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';

/**
 * Property Manager Portal - Token-based access for property managers/assistants
 * Limited access compared to full landlord account
 */
export default function PropertyManagerPortal() {
  const { token } = useParams();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mock data - will be replaced with API calls
  const [portalData, setPortalData] = useState({
    managerName: 'John Smith',
    companyName: 'ABC Property Management',
    permissions: ['view_properties', 'view_tenants', 'view_payments', 'view_maintenance', 'respond_maintenance'],
    stats: {
      totalProperties: 12,
      totalTenants: 45,
      collectedThisMonth: 52400,
      expectedThisMonth: 58000,
      openMaintenance: 8,
      pendingPayments: 12
    },
    recentPayments: [
      { id: 1, tenant: 'Alice Johnson', property: '123 Main St', amount: 1200, date: '2026-04-01', status: 'paid' },
      { id: 2, tenant: 'Bob Williams', property: '456 Oak Ave', amount: 1450, date: '2026-04-02', status: 'paid' },
      { id: 3, tenant: 'Carol Davis', property: '789 Pine Rd', amount: 1100, date: '2026-04-03', status: 'pending' },
    ],
    maintenanceRequests: [
      { id: 1, tenant: 'Alice Johnson', property: '123 Main St', issue: 'Leaky faucet', urgency: 'normal', status: 'open', date: '2026-04-20' },
      { id: 2, tenant: 'Bob Williams', property: '456 Oak Ave', issue: 'Broken window', urgency: 'high', status: 'open', date: '2026-04-21' },
      { id: 3, tenant: 'Carol Davis', property: '789 Pine Rd', issue: 'AC not working', urgency: 'emergency', status: 'in_progress', date: '2026-04-19' },
    ]
  });

  const handleMaintenanceResponse = async (requestId, response) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // TODO: Implement API call
      // const response = await api.post(`/api/manager/${token}/maintenance/${requestId}/respond`, response);
      
      setTimeout(() => {
        setSuccess('Response sent to tenant!');
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError('Failed to send response. Please try again.');
      setLoading(false);
    }
  };

  const handleMaintenanceStatusUpdate = async (requestId, newStatus) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // TODO: Implement API call
      // const response = await api.patch(`/api/manager/${token}/maintenance/${requestId}`, { status: newStatus });
      
      setTimeout(() => {
        setSuccess('Maintenance request updated!');
        // Update local state
        setPortalData(prev => ({
          ...prev,
          maintenanceRequests: prev.maintenanceRequests.map(req =>
            req.id === requestId ? { ...req, status: newStatus } : req
          )
        }));
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError('Failed to update status. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-purple-700 to-purple-600 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <span>🏢</span> Property Manager Portal
              </h1>
              <p className="text-purple-100 mt-1">
                {portalData.managerName} • {portalData.companyName}
              </p>
              <div className="flex items-center gap-2 mt-2">
                <span className="text-xs bg-purple-500 bg-opacity-50 px-2 py-1 rounded">
                  🔑 Limited Access
                </span>
                <span className="text-xs bg-purple-500 bg-opacity-50 px-2 py-1 rounded">
                  👁️ View Only
                </span>
              </div>
            </div>
            <Link 
              to="/" 
              className="text-purple-200 hover:text-white transition-colors"
            >
              ← Back to Home
            </Link>
          </div>
        </div>
      </header>

      {/* Success/Error Messages */}
      {success && (
        <div className="container mx-auto px-4 mt-4">
          <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded">
            {success}
          </div>
        </div>
      )}
      
      {error && (
        <div className="container mx-auto px-4 mt-4">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        </div>
      )}

      {/* Navigation Tabs */}
      <div className="container mx-auto px-4 mt-6">
        <div className="bg-white rounded-lg shadow">
          <div className="border-b">
            <nav className="flex gap-4 px-4 overflow-x-auto">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`py-3 px-4 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'dashboard'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Dashboard
              </button>
              <button
                onClick={() => setActiveTab('properties')}
                className={`py-3 px-4 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'properties'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🏠 Properties
              </button>
              <button
                onClick={() => setActiveTab('tenants')}
                className={`py-3 px-4 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'tenants'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                👥 Tenants
              </button>
              <button
                onClick={() => setActiveTab('payments')}
                className={`py-3 px-4 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'payments'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                💰 Payments
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`py-3 px-4 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'maintenance'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🔧 Maintenance
              </button>
              <button
                onClick={() => setActiveTab('messages')}
                className={`py-3 px-4 border-b-2 font-medium whitespace-nowrap transition-colors ${
                  activeTab === 'messages'
                    ? 'border-purple-600 text-purple-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📧 Messages
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'dashboard' && (
              <DashboardTab data={portalData} />
            )}
            {activeTab === 'properties' && (
              <PropertiesTab data={portalData} />
            )}
            {activeTab === 'tenants' && (
              <TenantsTab data={portalData} />
            )}
            {activeTab === 'payments' && (
              <PaymentsTab data={portalData} />
            )}
            {activeTab === 'maintenance' && (
              <MaintenanceTab 
                data={portalData}
                onRespond={handleMaintenanceResponse}
                onUpdateStatus={handleMaintenanceStatusUpdate}
                loading={loading}
              />
            )}
            {activeTab === 'messages' && (
              <MessagesTab data={portalData} />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500 text-sm mt-8">
        <p>Powered by <strong>RentKeepers</strong> • Property Manager Access</p>
        <p className="mt-1">Need help? <a href="mailto:support@rentkeepers.com" className="text-blue-600 hover:underline">Contact Support</a></p>
      </footer>
    </div>
  );
}

// Dashboard Tab Component
function DashboardTab({ data }) {
  return (
    <div>
      <h3 className="text-2xl font-bold mb-6">Overview</h3>
      
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🏠</span>
            <div>
              <div className="text-3xl font-bold text-blue-900">{data.stats.totalProperties}</div>
              <div className="text-sm text-blue-700">Total Properties</div>
            </div>
          </div>
        </div>
        
        <div className="bg-green-50 border border-green-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">👥</span>
            <div>
              <div className="text-3xl font-bold text-green-900">{data.stats.totalTenants}</div>
              <div className="text-sm text-green-700">Total Tenants</div>
            </div>
          </div>
        </div>
        
        <div className="bg-purple-50 border border-purple-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">💰</span>
            <div>
              <div className="text-3xl font-bold text-purple-900">${data.stats.collectedThisMonth.toLocaleString()}</div>
              <div className="text-sm text-purple-700">Collected This Month</div>
            </div>
          </div>
        </div>
        
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">⏰</span>
            <div>
              <div className="text-3xl font-bold text-yellow-900">${data.stats.expectedThisMonth.toLocaleString()}</div>
              <div className="text-sm text-yellow-700">Expected This Month</div>
            </div>
          </div>
        </div>
        
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">🔧</span>
            <div>
              <div className="text-3xl font-bold text-red-900">{data.stats.openMaintenance}</div>
              <div className="text-sm text-red-700">Open Maintenance</div>
            </div>
          </div>
        </div>
        
        <div className="bg-orange-50 border border-orange-200 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-2">
            <span className="text-3xl">⏳</span>
            <div>
              <div className="text-3xl font-bold text-orange-900">{data.stats.pendingPayments}</div>
              <div className="text-sm text-orange-700">Pending Payments</div>
            </div>
          </div>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Payments */}
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-bold text-lg mb-4">💰 Recent Payments</h4>
          <div className="space-y-3">
            {data.recentPayments.slice(0, 5).map(payment => (
              <div key={payment.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{payment.tenant}</div>
                  <div className="text-sm text-gray-500">{payment.property}</div>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">${payment.amount}</div>
                  <div className={`text-xs px-2 py-1 rounded ${
                    payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                  }`}>
                    {payment.status}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Urgent Maintenance */}
        <div className="bg-white border rounded-lg p-6">
          <h4 className="font-bold text-lg mb-4">🔧 Urgent Maintenance</h4>
          <div className="space-y-3">
            {data.maintenanceRequests.filter(m => m.urgency === 'emergency' || m.urgency === 'high').slice(0, 5).map(req => (
              <div key={req.id} className="flex items-center justify-between p-3 bg-gray-50 rounded">
                <div>
                  <div className="font-medium">{req.issue}</div>
                  <div className="text-sm text-gray-500">{req.tenant} • {req.property}</div>
                </div>
                <div className="text-right">
                  <div className={`text-xs px-2 py-1 rounded font-bold ${
                    req.urgency === 'emergency' ? 'bg-red-100 text-red-700' : 'bg-orange-100 text-orange-700'
                  }`}>
                    {req.urgency.toUpperCase()}
                  </div>
                  <div className="text-xs text-gray-500 mt-1">{req.date}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

// Properties Tab Component
function PropertiesTab({ data }) {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Fetch properties from Flask backend
    const fetchProperties = async () => {
      try {
        const response = await fetch(`https://127.0.0.1:5000/manager/${data.token}/properties`, {
          credentials: 'include',
        });
        const html = await response.text();
        // Parse HTML to extract property data (simplified for demo)
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        const cards = doc.querySelectorAll('.card-title');
        
        // For now, show message to use Flask backend directly
        setLoading(false);
      } catch (err) {
        console.error('Error fetching properties:', err);
        setLoading(false);
      }
    };
    
    fetchProperties();
  }, [data.token]);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
        <p className="mt-4 text-gray-600">Loading properties...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <p className="text-purple-800">
          <strong>📊 View Properties:</strong> For the best experience with property management, 
          <a href={`https://127.0.0.1:5000/manager/${data.token}/properties`} 
             target="_blank" 
             rel="noopener noreferrer"
             className="underline ml-1 font-bold">
            open in Flask Backend
          </a>
        </p>
      </div>
      <h3 className="text-2xl font-bold mb-6">Properties</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {data.properties && data.properties.length > 0 ? (
          data.properties.map((prop, idx) => (
            <div key={idx} className="bg-white rounded-lg shadow p-6">
              <h4 className="font-bold text-lg mb-2">{prop.name || prop.address}</h4>
              <p className="text-gray-600">{prop.address}</p>
              <div className="mt-4 flex gap-2">
                <span className="text-sm bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  {prop.tenants_count} tenants
                </span>
                <span className="text-sm bg-green-100 text-green-800 px-2 py-1 rounded">
                  ${prop.monthly_rent}/mo
                </span>
              </div>
            </div>
          ))
        ) : (
          <div className="col-span-full text-center py-12 text-gray-500">
            <div className="text-6xl mb-4">🏠</div>
            <p>No properties found. Properties will appear here once added by the landlord.</p>
          </div>
        )}
      </div>
    </div>
  );
}

// Tenants Tab Component
function TenantsTab({ data }) {
  return (
    <div>
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <p className="text-purple-800">
          <strong>👥 View Tenants:</strong> For the best experience with tenant management, 
          <a href={`https://127.0.0.1:5000/manager/${data.token}/tenants`} 
             target="_blank" 
             rel="noopener noreferrer"
             className="underline ml-1 font-bold">
            open in Flask Backend
          </a>
        </p>
      </div>
      <h3 className="text-2xl font-bold mb-6">Tenants</h3>
      <div className="text-center py-12 text-gray-500">
        <div className="text-6xl mb-4">👥</div>
        <p>Tenant data available in Flask backend</p>
        <p className="text-sm mt-2">View all {data.stats.totalTenants} tenants</p>
      </div>
    </div>
  );
}

// Payments Tab Component
function PaymentsTab({ data }) {
  return (
    <div>
      <div className="bg-purple-50 border border-purple-200 rounded-lg p-4 mb-6">
        <p className="text-purple-800">
          <strong>💰 View Payments:</strong> For the best experience with payment history, 
          <a href={`https://127.0.0.1:5000/manager/${data.token}/payments`} 
             target="_blank" 
             rel="noopener noreferrer"
             className="underline ml-1 font-bold">
            open in Flask Backend
          </a>
        </p>
      </div>
      <h3 className="text-2xl font-bold mb-6">Payments</h3>
      {data.recentPayments && data.recentPayments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Tenant</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Property</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {data.recentPayments.map(payment => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{payment.tenant}</td>
                  <td className="px-4 py-3 text-gray-600">{payment.property}</td>
                  <td className="px-4 py-3 text-green-600 font-bold">${payment.amount}</td>
                  <td className="px-4 py-3 text-gray-600">{payment.date}</td>
                  <td className="px-4 py-3">
                    <span className={`px-2 py-1 rounded text-xs font-medium ${
                      payment.status === 'paid' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                    }`}>
                      {payment.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-12 text-gray-500">
          <div className="text-6xl mb-4">💰</div>
          <p>No payments found. Payments will appear here once tenants start paying rent.</p>
        </div>
      )}
    </div>
  );
}

// Maintenance Tab Component
function MaintenanceTab({ data, onRespond, onUpdateStatus, loading }) {
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [responseText, setResponseText] = useState('');

  const handleRespond = () => {
    if (!responseText.trim()) {
      alert('Please enter a response');
      return;
    }
    onRespond(selectedRequest.id, { response: responseText });
    setResponseText('');
    setSelectedRequest(null);
  };

  return (
    <div>
      <h3 className="text-2xl font-bold mb-6">Maintenance Requests</h3>
      
      <div className="space-y-4">
        {data.maintenanceRequests.map(req => (
          <div key={req.id} className="bg-white border rounded-lg p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h4 className="font-bold text-lg">{req.issue}</h4>
                <div className="text-gray-600 mt-1">
                  {req.tenant} • {req.property}
                </div>
                <div className="text-sm text-gray-500 mt-1">
                  Submitted: {req.date}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <span className={`px-3 py-1 rounded-full text-xs font-bold ${
                  req.urgency === 'emergency' ? 'bg-red-100 text-red-700' :
                  req.urgency === 'high' ? 'bg-orange-100 text-orange-700' :
                  req.urgency === 'normal' ? 'bg-yellow-100 text-yellow-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {req.urgency.toUpperCase()}
                </span>
                <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                  req.status === 'open' ? 'bg-blue-100 text-blue-700' :
                  req.status === 'in_progress' ? 'bg-purple-100 text-purple-700' :
                  'bg-green-100 text-green-700'
                }`}>
                  {req.status.replace('_', ' ').toUpperCase()}
                </span>
              </div>
            </div>

            {/* Actions */}
            <div className="flex gap-2 mt-4 pt-4 border-t">
              <select
                onChange={(e) => onUpdateStatus(req.id, e.target.value)}
                disabled={loading}
                className="px-4 py-2 border border-gray-300 rounded focus:outline-none focus:border-purple-500"
              >
                <option value="">Update Status</option>
                <option value="open">Open</option>
                <option value="in_progress">In Progress</option>
                <option value="completed">Completed</option>
                <option value="cancelled">Cancelled</option>
              </select>
              
              <button
                onClick={() => setSelectedRequest(req)}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded transition-colors"
              >
                📧 Respond to Tenant
              </button>
            </div>

            {/* Response Modal */}
            {selectedRequest?.id === req.id && (
              <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                <h5 className="font-bold mb-2">Respond to Tenant</h5>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value)}
                  placeholder="Write your response to the tenant..."
                  rows="4"
                  className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-purple-500 mb-3"
                />
                <div className="flex gap-2">
                  <button
                    onClick={handleRespond}
                    disabled={loading}
                    className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                  >
                    {loading ? 'Sending...' : 'Send Response'}
                  </button>
                  <button
                    onClick={() => { setSelectedRequest(null); setResponseText(''); }}
                    className="px-4 py-2 bg-gray-300 hover:bg-gray-400 text-gray-700 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

// Messages Tab Component
function MessagesTab({ data }) {
  return (
    <div>
      <h3 className="text-2xl font-bold mb-6">Messages from Tenants</h3>
      <div className="text-center py-12 text-gray-500">
        <div className="text-6xl mb-4">📧</div>
        <p>Message inbox - coming soon</p>
        <p className="text-sm mt-2">View and respond to tenant messages</p>
      </div>
    </div>
  );
}
