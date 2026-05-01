import { useState } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Applications() {
  const queryClient = useQueryClient();
  const [selectedApplication, setSelectedApplication] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterProperty, setFilterProperty] = useState('all');

  const { data: applications, isLoading } = useQuery({
    queryKey: ['applications'],
    queryFn: () => api.get('/api/applications'),
  });

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.get('/api/properties'),
  });

  // Filter applications
  const filteredApplications = applications?.applications?.filter(app => {
    if (filterStatus !== 'all' && app.status !== filterStatus) return false;
    if (filterProperty !== 'all' && app.property_id !== parseInt(filterProperty)) return false;
    return true;
  });

  const handleViewDetails = async (appId) => {
    try {
      const { data } = await api.get(`/api/applications/${appId}`);
      setSelectedApplication(data.application);
      setShowModal(true);
    } catch (err) {
      alert('Failed to load application details');
    }
  };

  const handleStatusUpdate = async (appId, status, notes = '') => {
    try {
      await api.post(`/api/applications/${appId}/status`, {
        status,
        admin_notes: notes
      });
      
      // Refresh applications list
      queryClient.invalidateQueries({ queryKey: ['applications'] });
      
      // Close modal
      setShowModal(false);
      setSelectedApplication(null);
      
      alert(`Application ${status} successfully!`);
    } catch (err) {
      alert('Failed to update application status');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      pending: 'bg-yellow-500 text-white',
      reviewed: 'bg-blue-500 text-white',
      approved: 'bg-green-500 text-white',
      denied: 'bg-red-500 text-white',
      withdrawn: 'bg-gray-500 text-white'
    };
    return badges[status] || 'bg-gray-500 text-white';
  };

  const getScreeningBadge = (status) => {
    if (!status) return <span className="text-gray-400 text-sm">Not started</span>;
    const badges = {
      not_started: <span className="text-gray-500 text-sm">Not Started</span>,
      in_progress: <span className="text-blue-500 text-sm">In Progress</span>,
      completed: <span className="text-green-500 text-sm">✓ Completed</span>
    };
    return badges[status] || <span className="text-gray-400 text-sm">{status}</span>;
  };

  const exportToCSV = () => {
    const headers = ['ID', 'Name', 'Email', 'Phone', 'Property', 'Status', 'Income', 'Applied Date', 'Move-in Date'];
    const rows = applications?.applications?.map(app => [
      app.id,
      app.applicant_name,
      app.email,
      app.phone,
      app.property_name || 'N/A',
      app.status,
      app.monthly_income ? `$${app.monthly_income}` : 'N/A',
      new Date(app.created_at).toLocaleDateString(),
      app.move_in_date || 'N/A'
    ]);

    const csvContent = [
      headers.join(','),
      ...rows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `applications_${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    window.URL.revokeObjectURL(url);
  };

  if (isLoading) {
    return <div className="text-center py-10">Loading applications...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">📋 Rental Applications</h2>
        <div className="flex gap-2">
          <button
            onClick={() => exportToCSV()}
            className="bg-purple-600 text-white px-4 py-2 rounded hover:bg-purple-700 flex items-center gap-2"
            title="Export applications to CSV"
          >
            📥 Export CSV
          </button>
          <Link 
            to="/properties" 
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            🏠 View Properties
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl font-bold text-yellow-600">
            {applications?.applications?.filter(a => a.status === 'pending').length || 0}
          </div>
          <div className="text-gray-500 text-sm">Pending Review</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl font-bold text-blue-600">
            {applications?.applications?.filter(a => a.status === 'reviewed').length || 0}
          </div>
          <div className="text-gray-500 text-sm">Under Review</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl font-bold text-green-600">
            {applications?.applications?.filter(a => a.status === 'approved').length || 0}
          </div>
          <div className="text-gray-500 text-sm">Approved</div>
        </div>
        <div className="bg-white rounded-lg shadow p-4">
          <div className="text-3xl font-bold text-red-600">
            {applications?.applications?.filter(a => a.status === 'denied').length || 0}
          </div>
          <div className="text-gray-500 text-sm">Denied</div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-gray-700 font-bold mb-2">Filter by Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Statuses</option>
              <option value="pending">Pending</option>
              <option value="reviewed">Reviewed</option>
              <option value="approved">Approved</option>
              <option value="denied">Denied</option>
              <option value="withdrawn">Withdrawn</option>
            </select>
          </div>
          <div>
            <label className="block text-gray-700 font-bold mb-2">Filter by Property</label>
            <select
              value={filterProperty}
              onChange={(e) => setFilterProperty(e.target.value)}
              className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
            >
              <option value="all">All Properties</option>
              {properties?.map((p) => (
                <option key={p.id} value={p.id}>{p.name || p.address}</option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-lg shadow">
        {filteredApplications?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Applicant</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Income</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Screening</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Status</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Applied</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredApplications.map((app) => (
                  <tr key={app.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-medium">{app.applicant_name}</div>
                      <div className="text-sm text-gray-500">ID: #{app.id}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{app.property_name || 'N/A'}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{app.email}</div>
                      <div className="text-sm text-gray-500">{app.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      {app.monthly_income ? (
                        <div className="text-green-600 font-medium">
                          ${app.monthly_income.toLocaleString()}/mo
                        </div>
                      ) : (
                        <span className="text-gray-400">Not specified</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      {getScreeningBadge(app.screening_status)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={`px-2 py-1 rounded text-sm ${getStatusBadge(app.status)}`}>
                        {app.status.charAt(0).toUpperCase() + app.status.slice(1)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">
                        {new Date(app.created_at).toLocaleDateString()}
                      </div>
                      <div className="text-xs text-gray-500">
                        {new Date(app.created_at).toLocaleTimeString()}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleViewDetails(app.id)}
                        className="bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700"
                      >
                        View Details
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📋</div>
            <p className="text-gray-500">
              {applications?.applications?.length === 0 
                ? "No applications yet. Share your property listing to start receiving applications!"
                : "No applications match your filters."}
            </p>
          </div>
        )}
      </div>

      {/* Application Details Modal */}
      {showModal && selectedApplication && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl my-8">
            <div className="p-6 max-h-[90vh] overflow-y-auto">
              {/* Header */}
              <div className="flex justify-between items-center mb-6 pb-4 border-b">
                <div>
                  <h3 className="text-2xl font-bold">
                    Application #{selectedApplication.id}
                  </h3>
                  <p className="text-gray-600">
                    {selectedApplication.first_name} {selectedApplication.last_name}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => {
                      const applicationUrl = `${window.location.origin}/apply/${selectedApplication.property_id || ''}`;
                      navigator.clipboard.writeText(applicationUrl);
                      alert('Application link copied to clipboard!');
                    }}
                    className="text-blue-600 hover:text-blue-800 px-3 py-1 rounded border border-blue-600 text-sm"
                    title="Copy application link"
                  >
                    🔗 Copy Link
                  </button>
                  <button
                    onClick={() => window.print()}
                    className="text-gray-600 hover:text-gray-800 px-3 py-1 rounded border border-gray-600 text-sm"
                    title="Print application"
                  >
                    🖨️ Print
                  </button>
                  <button 
                    onClick={() => setShowModal(false)}
                    className="text-gray-400 hover:text-gray-600 text-3xl"
                  >
                    ×
                  </button>
                </div>
              </div>

              {/* Status & Property */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Status</div>
                  <span className={`px-3 py-1 rounded text-sm font-medium ${getStatusBadge(selectedApplication.status)}`}>
                    {selectedApplication.status.charAt(0).toUpperCase() + selectedApplication.status.slice(1)}
                  </span>
                </div>
                <div className="bg-gray-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-500 mb-1">Property</div>
                  <div className="font-medium">{selectedApplication.property_name || 'N/A'}</div>
                </div>
              </div>

              {/* Personal Information */}
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-3">👤 Personal Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Full Name</div>
                    <div className="font-medium">{selectedApplication.first_name} {selectedApplication.last_name}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Email</div>
                    <div className="font-medium">{selectedApplication.email}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Phone</div>
                    <div className="font-medium">{selectedApplication.phone}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Date of Birth</div>
                    <div className="font-medium">{selectedApplication.date_of_birth || 'Not provided'}</div>
                  </div>
                  {selectedApplication.ssn_last4 && (
                    <div>
                      <div className="text-sm text-gray-500">SSN (Last 4)</div>
                      <div className="font-medium">***-{selectedApplication.ssn_last4}</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Current Address */}
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-3">🏠 Current Address</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <div className="text-sm text-gray-500">Address</div>
                    <div className="font-medium">{selectedApplication.current_address}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">City/State/ZIP</div>
                    <div className="font-medium">
                      {selectedApplication.current_city}, {selectedApplication.current_state} {selectedApplication.current_zip}
                    </div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Current Rent</div>
                    <div className="font-medium">
                      {selectedApplication.current_rent ? `$${selectedApplication.current_rent}/mo` : 'Not specified'}
                    </div>
                  </div>
                  {selectedApplication.landlord_name && (
                    <>
                      <div>
                        <div className="text-sm text-gray-500">Landlord Name</div>
                        <div className="font-medium">{selectedApplication.landlord_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Landlord Phone</div>
                        <div className="font-medium">{selectedApplication.landlord_phone || 'Not provided'}</div>
                      </div>
                    </>
                  )}
                </div>
              </div>

              {/* Employment & Income */}
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-3">💼 Employment & Income</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Employment Status</div>
                    <div className="font-medium capitalize">{selectedApplication.employment_status}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Monthly Income</div>
                    <div className="font-medium text-green-600">
                      {selectedApplication.monthly_income ? `$${selectedApplication.monthly_income.toLocaleString()}` : 'Not specified'}
                    </div>
                  </div>
                  {selectedApplication.employer_name && (
                    <>
                      <div>
                        <div className="text-sm text-gray-500">Employer</div>
                        <div className="font-medium">{selectedApplication.employer_name}</div>
                      </div>
                      <div>
                        <div className="text-sm text-gray-500">Position</div>
                        <div className="font-medium">{selectedApplication.position || 'Not specified'}</div>
                      </div>
                      {selectedApplication.employer_phone && (
                        <div>
                          <div className="text-sm text-gray-500">Employer Phone</div>
                          <div className="font-medium">{selectedApplication.employer_phone}</div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Additional Occupants */}
              {selectedApplication.additional_occupants?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold mb-3">👨‍👩‍👧‍👦 Additional Occupants</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {selectedApplication.additional_occupants.map((occ, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded">
                        <div className="font-medium">{occ.name}</div>
                        <div className="text-sm text-gray-500">{occ.relationship}</div>
                        {occ.age && <div className="text-sm text-gray-500">Age: {occ.age}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Pets */}
              {selectedApplication.has_pets && selectedApplication.pet_details?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold mb-3">🐾 Pets</h4>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    {selectedApplication.pet_details.map((pet, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded">
                        <div className="font-medium capitalize">{pet.type}</div>
                        {pet.breed && <div className="text-sm text-gray-500">Breed: {pet.breed}</div>}
                        {pet.weight && <div className="text-sm text-gray-500">Weight: {pet.weight} lbs</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Vehicle */}
              {selectedApplication.has_vehicle && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold mb-3">🚗 Vehicle</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-500">Make/Model</div>
                      <div className="font-medium">
                        {selectedApplication.vehicle_make} {selectedApplication.vehicle_model}
                      </div>
                    </div>
                    <div>
                      <div className="text-sm text-gray-500">Year/Color</div>
                      <div className="font-medium">
                        {selectedApplication.vehicle_year} / {selectedApplication.vehicle_color}
                      </div>
                    </div>
                    {selectedApplication.license_plate && (
                      <div>
                        <div className="text-sm text-gray-500">License Plate</div>
                        <div className="font-medium">{selectedApplication.license_plate}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* References */}
              {selectedApplication.references?.length > 0 && (
                <div className="mb-6">
                  <h4 className="text-lg font-bold mb-3">📞 References</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {selectedApplication.references.map((ref, idx) => (
                      <div key={idx} className="bg-gray-50 p-3 rounded">
                        <div className="font-medium">{ref.name}</div>
                        <div className="text-sm text-gray-500">{ref.relationship}</div>
                        {ref.phone && <div className="text-sm text-gray-500">📞 {ref.phone}</div>}
                        {ref.email && <div className="text-sm text-gray-500">✉️ {ref.email}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Move-in Details */}
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-3">📅 Move-in Details</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <div className="text-sm text-gray-500">Desired Move-in Date</div>
                    <div className="font-medium">{selectedApplication.move_in_date || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">Lease Term</div>
                    <div className="font-medium">{selectedApplication.lease_term || 'Not specified'}</div>
                  </div>
                  <div>
                    <div className="text-sm text-gray-500">How They Heard</div>
                    <div className="font-medium">{selectedApplication.how_heard || 'Not specified'}</div>
                  </div>
                </div>
                {selectedApplication.additional_comments && (
                  <div className="mt-4">
                    <div className="text-sm text-gray-500 mb-1">Additional Comments</div>
                    <div className="bg-gray-50 p-3 rounded">{selectedApplication.additional_comments}</div>
                  </div>
                )}
              </div>

              {/* Consents */}
              <div className="mb-6">
                <h4 className="text-lg font-bold mb-3">✅ Consents</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className={`p-3 rounded ${selectedApplication.consent_background_check ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="font-medium">
                      {selectedApplication.consent_background_check ? '✓' : '✗'} Background Check Consent
                    </div>
                  </div>
                  <div className={`p-3 rounded ${selectedApplication.consent_credit_check ? 'bg-green-50' : 'bg-red-50'}`}>
                    <div className="font-medium">
                      {selectedApplication.consent_credit_check ? '✓' : '✗'} Credit Check Consent
                    </div>
                  </div>
                </div>
              </div>

              {/* Admin Actions */}
              <div className="border-t pt-6 mt-6">
                <h4 className="text-lg font-bold mb-4">🎯 Admin Actions</h4>
                
                {selectedApplication.status === 'pending' && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <button
                      onClick={() => handleStatusUpdate(selectedApplication.id, 'reviewed')}
                      className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
                    >
                      Mark as Reviewed
                    </button>
                    <button
                      onClick={() => {
                        const notes = prompt('Enter approval notes (optional):');
                        handleStatusUpdate(selectedApplication.id, 'approved', notes || '');
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      ✓ Approve Application
                    </button>
                    <button
                      onClick={() => {
                        const notes = prompt('Enter denial reason (required):');
                        if (notes) {
                          handleStatusUpdate(selectedApplication.id, 'denied', notes);
                        }
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      ✗ Deny Application
                    </button>
                  </div>
                )}

                {selectedApplication.status === 'reviewed' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <button
                      onClick={() => {
                        const notes = prompt('Enter approval notes (optional):');
                        handleStatusUpdate(selectedApplication.id, 'approved', notes || '');
                      }}
                      className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
                    >
                      ✓ Approve Application
                    </button>
                    <button
                      onClick={() => {
                        const notes = prompt('Enter denial reason (required):');
                        if (notes) {
                          handleStatusUpdate(selectedApplication.id, 'denied', notes);
                        }
                      }}
                      className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
                    >
                      ✗ Deny Application
                    </button>
                  </div>
                )}

                {(selectedApplication.status === 'approved' || selectedApplication.status === 'denied') && (
                  <div className="bg-gray-50 p-4 rounded">
                    <div className="text-sm text-gray-500">Application has been {selectedApplication.status}</div>
                    {selectedApplication.admin_notes && (
                      <div className="mt-2">
                        <div className="text-sm text-gray-500">Admin Notes:</div>
                        <div className="text-gray-700">{selectedApplication.admin_notes}</div>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Print Styles */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .application-modal-content, .application-modal-content * {
            visibility: visible;
          }
          .application-modal-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
            max-height: none;
            overflow: visible;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>
    </div>
  );
}
