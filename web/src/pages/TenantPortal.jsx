import { useState } from 'react';
import { useParams, Link } from 'react-router-dom';

/**
 * Tenant Portal - Token-based access for tenants
 * View rent status, make payments, submit maintenance requests
 */
export default function TenantPortal() {
  const { token } = useParams();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // Mock data - will be replaced with API calls
  const [tenantData, setTenantData] = useState({
    name: 'John Doe',
    propertyAddress: '123 Main St, Apt 4B',
    monthlyRent: 1200,
    dueDay: 1,
    status: 'pending', // paid, pending, late
    amountDue: 1200,
    payments: [
      { id: 1, month: 'March 2026', date: '2026-03-01', amount: 1200, method: 'Stripe' },
      { id: 2, month: 'February 2026', date: '2026-02-01', amount: 1200, method: 'Stripe' },
      { id: 3, month: 'January 2026', date: '2026-01-01', amount: 1200, method: 'Check' },
    ],
    maintenanceRequests: []
  });

  const handlePayment = async (amount, paymentMethod) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // TODO: Implement Stripe payment
      // const response = await api.post(`/api/portal/${token}/pay`, { amount, paymentMethod });
      
      setTimeout(() => {
        setSuccess('Payment successful! Thank you.');
        setTenantData(prev => ({
          ...prev,
          status: 'paid',
          amountDue: 0
        }));
        setLoading(false);
      }, 1500);
    } catch (err) {
      setError('Payment failed. Please try again.');
      setLoading(false);
    }
  };

  const handleMaintenanceSubmit = async (data) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // TODO: Implement API call
      // const response = await api.post(`/api/portal/${token}/maintenance`, data);
      
      setTimeout(() => {
        setSuccess('Maintenance request submitted successfully!');
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError('Failed to submit request. Please try again.');
      setLoading(false);
    }
  };

  const handleSendMessage = async (data) => {
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      // TODO: Implement API call
      // const response = await api.post(`/api/portal/${token}/message`, data);
      
      setTimeout(() => {
        setSuccess('Message sent to landlord!');
        setLoading(false);
      }, 1000);
    } catch (err) {
      setError('Failed to send message. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-gradient-to-r from-slate-700 to-slate-600 text-white py-8">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold flex items-center gap-2">
                <span>🏠</span> Tenant Portal
              </h1>
              <p className="text-blue-100 mt-1">
                {tenantData.name} • {tenantData.propertyAddress}
              </p>
            </div>
            <Link 
              to="/" 
              className="text-blue-200 hover:text-white transition-colors"
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
            <nav className="flex gap-4 px-4">
              <button
                onClick={() => setActiveTab('overview')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'overview'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📊 Overview
              </button>
              <button
                onClick={() => setActiveTab('pay')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'pay'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                💰 Pay Rent
              </button>
              <button
                onClick={() => setActiveTab('maintenance')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'maintenance'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                🔧 Maintenance
              </button>
              <button
                onClick={() => setActiveTab('message')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'message'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📧 Message Landlord
              </button>
              <button
                onClick={() => setActiveTab('history')}
                className={`py-3 px-4 border-b-2 font-medium transition-colors ${
                  activeTab === 'history'
                    ? 'border-blue-600 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                📜 Payment History
              </button>
            </nav>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'overview' && (
              <OverviewTab 
                data={tenantData} 
                onPayNow={() => setActiveTab('pay')}
              />
            )}
            {activeTab === 'pay' && (
              <PayRentTab 
                amountDue={tenantData.amountDue}
                onSubmit={handlePayment}
                loading={loading}
              />
            )}
            {activeTab === 'maintenance' && (
              <MaintenanceTab 
                onSubmit={handleMaintenanceSubmit}
                loading={loading}
              />
            )}
            {activeTab === 'message' && (
              <MessageTab 
                onSubmit={handleSendMessage}
                loading={loading}
              />
            )}
            {activeTab === 'history' && (
              <HistoryTab payments={tenantData.payments} />
            )}
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-500 text-sm mt-8">
        <p>Powered by <strong>RentKeepers</strong></p>
        <p className="mt-1">Need help? <a href="mailto:support@rentkeepers.com" className="text-blue-600 hover:underline">Contact Support</a></p>
      </footer>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ data, onPayNow }) {
  const statusConfig = {
    paid: { icon: '✅', color: 'text-green-600', bg: 'bg-green-50', label: 'Rent Paid' },
    pending: { icon: '⏰', color: 'text-yellow-600', bg: 'bg-yellow-50', label: 'Rent Due' },
    late: { icon: '⚠️', color: 'text-red-600', bg: 'bg-red-50', label: 'Rent Overdue' }
  };

  const status = statusConfig[data.status] || statusConfig.pending;

  return (
    <div className="max-w-2xl mx-auto text-center">
      <div className={`${status.bg} rounded-lg p-8 mb-6`}>
        <div className="text-6xl mb-4">{status.icon}</div>
        <h2 className={`text-2xl font-bold ${status.color} mb-2`}>{status.label}</h2>
        {data.status !== 'paid' && (
          <p className="text-gray-600">Payment was due on day {data.dueDay} of this month</p>
        )}
        {data.status === 'paid' && (
          <p className="text-gray-600">Thank you for your payment!</p>
        )}
      </div>

      <div className="text-4xl font-bold text-gray-900 mb-2">
        ${data.amountDue.toFixed(2)}
      </div>
      <p className="text-gray-500 mb-6">Current Month</p>

      {data.amountDue > 0 && (
        <button
          onClick={onPayNow}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full transition-colors"
        >
          💳 Pay Now
        </button>
      )}

      {/* Quick Stats */}
      <div className="grid grid-cols-3 gap-4 mt-8">
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-blue-600">${data.monthlyRent}</div>
          <div className="text-sm text-gray-500">Monthly Rent</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-green-600">{data.payments.length}</div>
          <div className="text-sm text-gray-500">Payments Made</div>
        </div>
        <div className="bg-gray-50 rounded-lg p-4">
          <div className="text-2xl font-bold text-purple-600">Day {data.dueDay}</div>
          <div className="text-sm text-gray-500">Due Date</div>
        </div>
      </div>
    </div>
  );
}

// Pay Rent Tab Component
function PayRentTab({ amountDue, onSubmit, loading }) {
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [showAddress, setShowAddress] = useState(false);
  const [billingAddress, setBillingAddress] = useState({
    street: '',
    city: '',
    state: '',
    zip: '',
    country: 'US'
  });

  const handleAddressSubmit = () => {
    if (!billingAddress.street || !billingAddress.city || !billingAddress.state || !billingAddress.zip) {
      alert('Please fill in all billing address fields');
      return;
    }
    setShowAddress(false);
  };

  return (
    <div className="max-w-md mx-auto">
      <h3 className="text-xl font-bold mb-4">Make a Payment</h3>
      
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
        <div className="text-sm text-gray-600 mb-1">Amount Due</div>
        <div className="text-3xl font-bold text-blue-900">${amountDue.toFixed(2)}</div>
      </div>

      <div className="mb-6">
        <label className="block text-gray-700 font-bold mb-2">Payment Method</label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="card"
              checked={paymentMethod === 'card'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-4 h-4"
            />
            <span className="flex items-center gap-2">
              <span>💳</span> Credit/Debit Card
            </span>
          </label>
          <label className="flex items-center gap-3 p-3 border rounded-lg cursor-pointer hover:bg-gray-50">
            <input
              type="radio"
              name="paymentMethod"
              value="bank"
              checked={paymentMethod === 'bank'}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className="w-4 h-4"
            />
            <span className="flex items-center gap-2">
              <span>🏦</span> Bank Transfer
            </span>
          </label>
        </div>
      </div>

      {paymentMethod === 'card' && (
        <div className="space-y-4 mb-6">
          <div>
            <label className="block text-gray-700 font-bold mb-2">Card Number</label>
            <input
              type="text"
              placeholder="1234 5678 9012 3456"
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-gray-700 font-bold mb-2">Expiry Date</label>
              <input
                type="text"
                placeholder="MM/YY"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-gray-700 font-bold mb-2">CVV</label>
              <input
                type="text"
                placeholder="123"
                className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>

          {/* Billing Address Section */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <label className="block text-gray-700 font-bold">Billing Address</label>
              <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded">
                🔒 Required for verification
              </span>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              Your card's billing address for address verification (AVS)
            </p>

            {!showAddress ? (
              <button
                type="button"
                onClick={() => setShowAddress(true)}
                className="w-full bg-blue-100 hover:bg-blue-200 text-blue-700 font-medium py-2 px-4 rounded-lg transition-colors"
              >
                + Add Billing Address
              </button>
            ) : (
              <div className="space-y-3 p-4 border border-blue-200 rounded-lg bg-blue-50">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Street Address *</label>
                  <input
                    type="text"
                    value={billingAddress.street}
                    onChange={(e) => setBillingAddress({...billingAddress, street: e.target.value})}
                    placeholder="123 Main St, Apt 4B"
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">City *</label>
                    <input
                      type="text"
                      value={billingAddress.city}
                      onChange={(e) => setBillingAddress({...billingAddress, city: e.target.value})}
                      placeholder="New York"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">State *</label>
                    <select
                      value={billingAddress.state}
                      onChange={(e) => setBillingAddress({...billingAddress, state: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    >
                      <option value="">Select</option>
                      <option value="AL">Alabama</option>
                      <option value="AK">Alaska</option>
                      <option value="AZ">Arizona</option>
                      <option value="AR">Arkansas</option>
                      <option value="CA">California</option>
                      <option value="CO">Colorado</option>
                      <option value="CT">Connecticut</option>
                      <option value="DE">Delaware</option>
                      <option value="FL">Florida</option>
                      <option value="GA">Georgia</option>
                      <option value="HI">Hawaii</option>
                      <option value="ID">Idaho</option>
                      <option value="IL">Illinois</option>
                      <option value="IN">Indiana</option>
                      <option value="IA">Iowa</option>
                      <option value="KS">Kansas</option>
                      <option value="KY">Kentucky</option>
                      <option value="LA">Louisiana</option>
                      <option value="ME">Maine</option>
                      <option value="MD">Maryland</option>
                      <option value="MA">Massachusetts</option>
                      <option value="MI">Michigan</option>
                      <option value="MN">Minnesota</option>
                      <option value="MS">Mississippi</option>
                      <option value="MO">Missouri</option>
                      <option value="MT">Montana</option>
                      <option value="NE">Nebraska</option>
                      <option value="NV">Nevada</option>
                      <option value="NH">New Hampshire</option>
                      <option value="NJ">New Jersey</option>
                      <option value="NM">New Mexico</option>
                      <option value="NY">New York</option>
                      <option value="NC">North Carolina</option>
                      <option value="ND">North Dakota</option>
                      <option value="OH">Ohio</option>
                      <option value="OK">Oklahoma</option>
                      <option value="OR">Oregon</option>
                      <option value="PA">Pennsylvania</option>
                      <option value="RI">Rhode Island</option>
                      <option value="SC">South Carolina</option>
                      <option value="SD">South Dakota</option>
                      <option value="TN">Tennessee</option>
                      <option value="TX">Texas</option>
                      <option value="UT">Utah</option>
                      <option value="VT">Vermont</option>
                      <option value="VA">Virginia</option>
                      <option value="WA">Washington</option>
                      <option value="WV">West Virginia</option>
                      <option value="WI">Wisconsin</option>
                      <option value="WY">Wyoming</option>
                    </select>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">ZIP Code *</label>
                    <input
                      type="text"
                      value={billingAddress.zip}
                      onChange={(e) => setBillingAddress({...billingAddress, zip: e.target.value})}
                      placeholder="10001"
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Country</label>
                    <select
                      value={billingAddress.country}
                      onChange={(e) => setBillingAddress({...billingAddress, country: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    >
                      <option value="US">United States</option>
                      <option value="CA">Canada</option>
                    </select>
                  </div>
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={handleAddressSubmit}
                    className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded transition-colors"
                  >
                    Save Address
                  </button>
                  <button
                    type="button"
                    onClick={() => setShowAddress(false)}
                    className="flex-1 bg-gray-200 hover:bg-gray-300 text-gray-700 font-medium py-2 px-4 rounded transition-colors"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {showAddress && billingAddress.street && (
              <div className="mt-3 p-3 bg-green-50 border border-green-200 rounded">
                <div className="flex items-start gap-2">
                  <span className="text-green-600">✅</span>
                  <div className="text-sm text-green-800">
                    <div className="font-medium">Billing Address:</div>
                    <div>{billingAddress.street}</div>
                    <div>{billingAddress.city}, {billingAddress.state} {billingAddress.zip}</div>
                    <div>{billingAddress.country}</div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => onSubmit(amountDue, paymentMethod, billingAddress)}
        disabled={loading || amountDue === 0}
        className="w-full bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
      >
        {loading ? 'Processing...' : `Pay $${amountDue.toFixed(2)}`}
      </button>

      <div className="mt-4 space-y-2">
        <p className="text-xs text-gray-500 text-center">
          🔒 Secure payment processed by Stripe
        </p>
        <p className="text-xs text-gray-500 text-center">
          🛡️ Address verification (AVS) helps prevent fraud
        </p>
      </div>
    </div>
  );
}

// Maintenance Tab Component
function MaintenanceTab({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    urgency: 'normal'
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-4">Submit Maintenance Request</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 font-bold mb-2">Issue Title *</label>
          <input
            type="text"
            value={formData.title}
            onChange={(e) => setFormData({...formData, title: e.target.value})}
            placeholder="e.g., Leaky faucet in kitchen"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-2">Description *</label>
          <textarea
            value={formData.description}
            onChange={(e) => setFormData({...formData, description: e.target.value})}
            placeholder="Please describe the issue in detail..."
            rows="4"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-2">Urgency</label>
          <select
            value={formData.urgency}
            onChange={(e) => setFormData({...formData, urgency: e.target.value})}
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
          >
            <option value="low">🟢 Low - Can wait</option>
            <option value="normal">🟡 Normal - Within a week</option>
            <option value="high">🟠 High - Within 24 hours</option>
            <option value="emergency">🔴 Emergency - Immediate attention</option>
          </select>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Submitting...' : 'Submit Request'}
        </button>
      </form>

      <div className="mt-6 bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h4 className="font-bold text-yellow-800 mb-2">⚠️ Emergency?</h4>
        <p className="text-sm text-yellow-700">
          For emergencies (fire, flood, gas leak), please call your landlord immediately or contact emergency services.
        </p>
      </div>
    </div>
  );
}

// Message Tab Component
function MessageTab({ onSubmit, loading }) {
  const [formData, setFormData] = useState({
    subject: '',
    message: ''
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit(formData);
    setFormData({ subject: '', message: '' });
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h3 className="text-xl font-bold mb-4">Message Your Landlord</h3>
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-gray-700 font-bold mb-2">Subject *</label>
          <input
            type="text"
            value={formData.subject}
            onChange={(e) => setFormData({...formData, subject: e.target.value})}
            placeholder="What is this about?"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <div>
          <label className="block text-gray-700 font-bold mb-2">Message *</label>
          <textarea
            value={formData.message}
            onChange={(e) => setFormData({...formData, message: e.target.value})}
            placeholder="Write your message here..."
            rows="6"
            className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-lg transition-colors disabled:opacity-50"
        >
          {loading ? 'Sending...' : 'Send Message'}
        </button>
      </form>
    </div>
  );
}

// History Tab Component
function HistoryTab({ payments }) {
  return (
    <div>
      <h3 className="text-xl font-bold mb-4">Payment History</h3>
      
      {payments.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Month</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Date Paid</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Amount</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Method</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {payments.map((payment) => (
                <tr key={payment.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3 font-medium">{payment.month}</td>
                  <td className="px-4 py-3 text-gray-600">{payment.date}</td>
                  <td className="px-4 py-3 text-green-600 font-bold">${payment.amount.toFixed(2)}</td>
                  <td className="px-4 py-3">
                    <span className="px-2 py-1 bg-gray-100 rounded text-xs">{payment.method}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-6xl mb-4">📜</div>
          <p className="text-gray-500">No payment history yet.</p>
        </div>
      )}
    </div>
  );
}
