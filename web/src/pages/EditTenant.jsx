import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export default function EditTenant() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    monthly_rent: '',
    due_day: '',
    property_id: '',
  });

  const { data: tenant, isLoading } = useQuery({
    queryKey: ['tenant', id],
    queryFn: () => api.get(`/api/tenants/${id}`),
  });

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.get('/api/properties'),
  });

  useEffect(() => {
    if (tenant) {
      setFormData({
        name: tenant.name || '',
        email: tenant.email || '',
        phone: tenant.phone || '',
        monthly_rent: tenant.monthly_rent || '',
        due_day: tenant.due_day || '',
        property_id: tenant.property_id || '',
      });
    }
  }, [tenant]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await api.put(`/api/tenants/${id}`, {
        ...formData,
        monthly_rent: parseFloat(formData.monthly_rent),
        due_day: parseInt(formData.due_day),
      });
      navigate('/tenants');
    } catch (err) {
      setError(err.message || 'Failed to update tenant');
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this tenant?')) return;
    
    try {
      await api.delete(`/api/tenants/${id}`);
      navigate('/tenants');
    } catch (err) {
      setError(err.message || 'Failed to delete tenant');
    }
  };

  if (isLoading) return <div className="text-center py-10">Loading...</div>;

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">✏️ Edit Tenant</h2>

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

        <div className="flex gap-4">
          <button
            type="submit"
            disabled={loading}
            className="bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? 'Saving...' : 'Update Tenant'}
          </button>
          <button
            type="button"
            onClick={() => navigate('/tenants')}
            className="bg-gray-500 text-white font-bold py-2 px-6 rounded hover:bg-gray-600"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleDelete}
            className="bg-red-600 text-white font-bold py-2 px-6 rounded hover:bg-red-700 ml-auto"
          >
            Delete
          </button>
        </div>
      </form>
    </div>
  );
}