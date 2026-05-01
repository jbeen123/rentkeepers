import { useQuery } from '@tanstack/react-query';
import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api/client';
import { FileText, Share2 } from 'lucide-react';
import SharePropertyModal from '../components/SharePropertyModal';

export default function Properties() {
  const { data: properties, isLoading } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.get('/api/properties'),
  });

  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showShareModal, setShowShareModal] = useState(false);

  if (isLoading) {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">🏢 Properties</h2>
        <Link 
          to="/properties/add" 
          className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
        >
          ➕ Add Property
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {properties?.map((property) => (
          <div key={property.id} className="bg-white rounded-lg shadow p-6">
            <div className="flex justify-between items-start mb-4">
              <h3 className="font-bold text-lg">{property.name || 'Unnamed Property'}</h3>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    setSelectedProperty(property);
                    setShowShareModal(true);
                  }}
                  className="text-purple-600 hover:text-purple-800 text-sm"
                  title="Share property application link"
                >
                  <Share2 className="w-4 h-4" />
                </button>
                <Link 
                  to={`/properties/${property.id}/edit`}
                  className="text-blue-600 hover:text-blue-800 text-sm"
                >
                  Edit
                </Link>
              </div>
            </div>
            
            <div className="text-gray-600 mb-2">{property.address}</div>
            
            {property.description && (
              <p className="text-gray-500 text-sm mb-4">{property.description}</p>
            )}
            
            <div className="flex justify-between text-sm mb-4">
              <span className="text-gray-500">
                {property.tenants?.length || 0} tenants
              </span>
              <span className="text-gray-500">
                Added {new Date(property.created_at).toLocaleDateString()}
              </span>
            </div>
            
            <div className="grid grid-cols-2 gap-2 mt-2">
              <Link
                to={`/statements?property_id=${property.id}`}
                className="bg-blue-600 text-white px-3 py-2 rounded text-sm hover:bg-blue-700 flex items-center justify-center gap-1"
              >
                <FileText className="w-3 h-3" />
                Statements
              </Link>
              <a
                href={`/apply/${property.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-600 text-white px-3 py-2 rounded text-sm hover:bg-green-700 flex items-center justify-center gap-1"
                title="Share this link with potential tenants"
              >
                📋 Apply Now
              </a>
            </div>
          </div>
        ))}
      </div>

      {properties?.length === 0 && (
        <div className="text-center py-10 bg-white rounded-lg shadow">
          <div className="text-4xl mb-3">🏠</div>
          <p className="text-gray-500">No properties yet.{' '}
            <Link to="/properties/add" className="text-blue-600 hover:underline">Add your first property</Link>
          </p>
        </div>
      )}

      {/* Share Property Modal */}
      {showShareModal && selectedProperty && (
        <SharePropertyModal
          property={selectedProperty}
          onClose={() => {
            setShowShareModal(false);
            setSelectedProperty(null);
          }}
        />
      )}
    </div>
  );
}