import { useState, useEffect } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { api } from '../api/client';
import OwnerStatements from '../components/OwnerStatements';
import { ChevronLeft, Building2 } from 'lucide-react';

export default function Statements() {
  const [searchParams] = useSearchParams();
  const propertyIdFromUrl = searchParams.get('property_id');
  
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(propertyIdFromUrl ? Number(propertyIdFromUrl) : null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await api.get('/api/properties');
      setProperties(response.data);
      // Auto-select first property if none selected
      if (!selectedProperty && response.data.length > 0) {
        setSelectedProperty(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  const selectedPropertyData = properties.find(p => p.id === selectedProperty);

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <Link 
          to="/properties" 
          className="text-blue-600 hover:text-blue-800 flex items-center gap-1 mb-4"
        >
          <ChevronLeft className="w-4 h-4" />
          Back to Properties
        </Link>
        
        <h2 className="text-2xl font-bold flex items-center gap-2">
          📄 Owner Statements
        </h2>
        <p className="text-gray-600 mt-1">
          Generate monthly reports for property owners
        </p>
      </div>

      {/* Property Selector */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Select Property
        </label>
        <div className="flex items-center gap-3">
          <Building2 className="w-5 h-5 text-gray-400" />
          <select
            value={selectedProperty || ''}
            onChange={(e) => setSelectedProperty(Number(e.target.value))}
            className="border border-gray-300 rounded-md px-3 py-2 flex-1 max-w-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          >
            <option value="">Choose a property...</option>
            {properties.map(prop => (
              <option key={prop.id} value={prop.id}>
                {prop.name || prop.address} ({prop.tenants?.length || 0} tenants)
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Owner Statements Component */}
      {selectedProperty ? (
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {selectedPropertyData && (
            <div className="px-4 py-3 border-b border-gray-200 bg-gray-50">
              <h3 className="font-semibold text-gray-900">
                {selectedPropertyData.name || selectedPropertyData.address}
              </h3>
              <p className="text-sm text-gray-500">
                {selectedPropertyData.address}, {selectedPropertyData.city} {selectedPropertyData.state}
              </p>
            </div>
          )}
          <div className="p-4">
            <OwnerStatements 
              propertyId={selectedProperty} 
              api={api}
            />
          </div>
        </div>
      ) : loading ? (
        <div className="text-center py-10 text-gray-500">
          <div className="animate-spin inline-block mr-2">⏳</div>
          Loading properties...
        </div>
      ) : (
        <div className="text-center py-10 bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="text-4xl mb-4">🏢</div>
          <p className="text-gray-500 mb-2">No properties found.</p>
          <p className="text-sm text-gray-400 mb-4">Add a property first to generate owner statements.</p>
          <Link 
            to="/properties/add"
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 inline-flex items-center gap-2"
          >
            + Add Property
          </Link>
        </div>
      )}
    </div>
  );
}
