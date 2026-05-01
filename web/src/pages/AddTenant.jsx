import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function AddTenant() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    monthly_rent: '',
    due_day: '1',
    property_id: '',
    late_fee_enabled: false,
    late_fee_type: 'flat',
    late_fee_amount: '',
    grace_period_days: 5,
  });

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.get('/api/properties'),
  });

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.post('/api/tenants', {
        ...formData,
        monthly_rent: parseFloat(formData.monthly_rent),
        due_day: parseInt(formData.due_day),
        late_fee_enabled: formData.late_fee_enabled === true,
        late_fee_amount: parseFloat(formData.late_fee_amount) || 0,
        grace_period_days: parseInt(formData.grace_period_days) || 5,
      });
      navigate('/tenants');
    } catch (err) {
      setError(err.message || 'Failed to add tenant');
      setLoading(false);
    }
  };

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">➕ Add Tenant</h2>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6 max-w-2xl">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div className="md:col-span-2">
            <label className="block text-gray-700 font-bold mb-2">Full Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Email *</label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              required
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Phone</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Monthly Rent *</label>
            <div className="relative">
              <span className="absolute left-3 top-2">$</span>
              <input
                type="number"
                name="monthly_rent"
                value={formData.monthly_rent}
                onChange={handleChange}
                className="w-full px-3 py-2 pl-7 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                step="0.01"
                min="0"
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-700 font-bold mb-2">Due Day *</label>
            <input
              type="number"
              name="due_day"
              value={formData.due_day}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
              min="1"
              max="31"
              required
            />
          </div>

          <div className="md:col-span-2">
            <label className="block text-gray-700 font-bold mb-2">Property</label>
            <select
              name="property_id"
              value={formData.property_id}
              onChange={handleChange}
              className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
            >
              <option value="">Select a property (optional)</option>
              {properties?.map((p) => (
                <option key={p.id} value={p.id}>{p.name || p.address}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Late Fee Settings */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3">⚠️ Late Fee Settings</h3>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="md:col-span-4">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.late_fee_enabled}
                  onChange={(e) => setFormData({ ...formData, late_fee_enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="font-medium">Enable automatic late fees</span>
              </label>
            </div>

            {formData.late_fee_enabled && (
              <>
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Fee Type</label>
                  <select
                    value={formData.late_fee_type}
                    onChange={(e) => setFormData({ ...formData, late_fee_type: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                  >
                    <option value="flat">Flat Fee</option>
                    <option value="percentage">Percentage</option>
                  </select>
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2">
                    Late Fee {formData.late_fee_type === 'percentage' ? '(%)' : '($)'}
                  </label>
                  <input
                    type="number"
                    value={formData.late_fee_amount}
                    onChange={(e) => setFormData({ ...formData, late_fee_amount: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    step="0.01"
                    min="0"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2">Grace Period (Days)</label>
                  <input
                    type="number"
                    value={formData.grace_period_days}
                    onChange={(e) => setFormData({ ...formData, grace_period_days: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 rounded focus:outline-none focus:border-blue-500"
                    min="0"
                    max="30"
                  />
                </div>
              </>
            )}
          </div>
        </div>

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-green-600 text-white font-bold py-2 px-6 rounded hover:bg-green-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Add Tenant'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/tenants')}
            className="bg-gray-500 text-white font-bold py-2 px-6 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
}