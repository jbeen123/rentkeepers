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
    late_fee_enabled: false,
    late_fee_type: 'flat',
    late_fee_amount: '',
    grace_period_days: 5,
    insurance_required: false,
    insurance_provider: '',
    insurance_policy_number: '',
    insurance_expiry_date: '',
    insurance_verified: false,
    credit_reporting_enabled: false,
    credit_report_consent: false,
  });
  
  const [leaseFile, setLeaseFile] = useState(null);
  const [hasLease, setHasLease] = useState(false);
  const [uploadingLease, setUploadingLease] = useState(false);
  const [insuranceFile, setInsuranceFile] = useState(null);

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
        late_fee_enabled: tenant.late_fee_enabled || false,
        late_fee_type: tenant.late_fee_type || 'flat',
        late_fee_amount: tenant.late_fee_amount || '',
        grace_period_days: tenant.grace_period_days || 5,
        insurance_required: tenant.insurance_required || false,
        insurance_provider: tenant.insurance_provider || '',
        insurance_policy_number: tenant.insurance_policy_number || '',
        insurance_expiry_date: tenant.insurance_expiry_date || '',
        insurance_verified: tenant.insurance_verified || false,
        credit_reporting_enabled: tenant.credit_reporting_enabled || false,
        credit_report_consent: tenant.credit_report_consent || false,
      });
      setHasLease(!!tenant.lease_document_path);
    }
  }, [tenant]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleLeaseUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setUploadingLease(true);
    const formDataUpload = new FormData();
    formDataUpload.append('lease', file);
    
    try {
      await api.post(`/api/tenant/${id}/upload-lease`, formDataUpload, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setHasLease(true);
      alert('Lease document uploaded successfully!');
    } catch (err) {
      alert('Failed to upload lease: ' + err.message);
    } finally {
      setUploadingLease(false);
    }
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
        late_fee_enabled: formData.late_fee_enabled === true || formData.late_fee_enabled === 'true',
        late_fee_amount: parseFloat(formData.late_fee_amount) || 0,
        grace_period_days: parseInt(formData.grace_period_days) || 5,
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

        {/* Lease Document Upload */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3">📄 Lease Document</h3>
          <div className="flex items-center gap-4">
            {hasLease ? (
              <div className="text-green-600 flex items-center gap-2">
                <span>✓ Lease on file</span>
              </div>
            ) : (
              <span className="text-gray-500">No lease document uploaded</span>
            )}
            <label className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 cursor-pointer">
              {uploadingLease ? 'Uploading...' : (hasLease ? 'Replace Lease' : 'Upload Lease')}
              <input
                type="file"
                accept=".pdf,.png,.jpg,.jpeg,.gif"
                onChange={handleLeaseUpload}
                disabled={uploadingLease}
                className="hidden"
              />
            </label>
          </div>
        </div>

        {/* Insurance Tracking */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3">🛡️ Renters Insurance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.insurance_required}
                  onChange={(e) => setFormData({ ...formData, insurance_required: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="font-medium">Renters insurance required</span>
              </label>
            </div>

            {formData.insurance_required && (
              <>
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Insurance Provider</label>
                  <input
                    type="text"
                    value={formData.insurance_provider}
                    onChange={(e) => setFormData({ ...formData, insurance_provider: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                    placeholder="e.g., State Farm, Allstate"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2">Policy Number</label>
                  <input
                    type="text"
                    value={formData.insurance_policy_number}
                    onChange={(e) => setFormData({ ...formData, insurance_policy_number: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                    placeholder="Policy #"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 font-bold mb-2">Expiry Date</label>
                  <input
                    type="date"
                    value={formData.insurance_expiry_date}
                    onChange={(e) => setFormData({ ...formData, insurance_expiry_date: e.target.value })}
                    className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  />
                </div>

                <div className="flex items-end">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={formData.insurance_verified}
                      onChange={(e) => setFormData({ ...formData, insurance_verified: e.target.checked })}
                      className="w-4 h-4"
                    />
                    <span className="font-medium">✓ Verified</span>
                  </label>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Credit Reporting */}
        <div className="border-t pt-4 mt-4">
          <h3 className="text-lg font-semibold mb-3">💳 Credit Reporting</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div className="md:col-span-2">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={formData.credit_reporting_enabled}
                  onChange={(e) => setFormData({ ...formData, credit_reporting_enabled: e.target.checked })}
                  className="w-4 h-4"
                />
                <span className="font-medium">Enable rent reporting to credit bureaus</span>
              </label>
              <p className="text-sm text-gray-500 mt-1">
                Report on-time rent payments to Experian, TransUnion, and Equifax
              </p>
            </div>

            {formData.credit_reporting_enabled && (
              <div className="md:col-span-2">
                <label className="flex items-center gap-2 p-3 bg-blue-50 rounded border border-blue-200">
                  <input
                    type="checkbox"
                    checked={formData.credit_report_consent}
                    onChange={(e) => setFormData({ ...formData, credit_report_consent: e.target.checked })}
                    className="w-4 h-4"
                    required
                  />
                  <span className="text-sm text-blue-800">
                    Tenant has consented to credit reporting (required by FCRA)
                  </span>
                </label>
              </div>
            )}
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