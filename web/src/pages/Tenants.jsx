import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { api } from '../api/client';

export default function Tenants() {
  const { data: tenants, isLoading } = useQuery({
    queryKey: ['tenants'],
    queryFn: () => api.get('/api/tenants'),
  });

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

      <div className="bg-white rounded-lg shadow">
        {tenants?.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Name</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Property</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Monthly Rent</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Due Day</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Contact</th>
                  <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody>
                {tenants.map((tenant) => (
                  <tr key={tenant.id} className="border-t hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium">{tenant.name}</td>
                    <td className="px-4 py-3">{tenant.property?.address || 'N/A'}</td>
                    <td className="px-4 py-3">${tenant.monthly_rent?.toFixed(2)}</td>
                    <td className="px-4 py-3">Day {tenant.due_day}</td>
                    <td className="px-4 py-3">
                      <div>{tenant.email}</div>
                      <div className="text-sm text-gray-500">{tenant.phone}</div>
                    </td>
                    <td className="px-4 py-3">
                      <Link 
                        to={`/tenants/${tenant.id}/edit`}
                        className="text-blue-600 hover:text-blue-800 mr-3"
                      >
                        Edit
                      </Link>
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
    </div>
  );
}