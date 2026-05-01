import { useState } from 'react';

export default function SharePropertyModal({ property, onClose }) {
  const [copied, setCopied] = useState(false);
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');

  const applicationUrl = `${window.location.origin}/apply/${property.id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(applicationUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleShareViaEmail = () => {
    const subject = encodeURIComponent(`Rental Application - ${property.address}`);
    const body = encodeURIComponent(
      `${message}\n\nApply online here: ${applicationUrl}\n\nProperty Details:\n${property.name || 'Unnamed Property'}\n${property.address}\n${property.bedrooms ? `${property.bedrooms} bed, ${property.bathrooms} bath` : ''}`
    );
    window.open(`mailto:${email}?subject=${subject}&body=${body}`);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">📤 Share Property</h3>
            <button 
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="mb-6">
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <div className="font-medium mb-1">{property.name || 'Unnamed Property'}</div>
              <div className="text-gray-600 text-sm">{property.address}</div>
              {property.bedrooms && (
                <div className="text-gray-500 text-sm mt-1">
                  {property.bedrooms} bed • {property.bathrooms} bath • {property.square_footage} sqft
                </div>
              )}
            </div>

            <label className="block text-gray-700 font-bold mb-2">Application Link</label>
            <div className="flex gap-2 mb-4">
              <input
                type="text"
                value={applicationUrl}
                readOnly
                className="flex-1 px-3 py-2 border rounded bg-gray-50 text-sm"
              />
              <button
                onClick={handleCopyLink}
                className={`px-4 py-2 rounded font-medium ${
                  copied 
                    ? 'bg-green-600 text-white' 
                    : 'bg-blue-600 text-white hover:bg-blue-700'
                }`}
              >
                {copied ? '✓ Copied!' : 'Copy'}
              </button>
            </div>
          </div>

          <div className="border-t pt-4">
            <h4 className="font-bold mb-3">Or Share via Email</h4>
            
            <div className="mb-3">
              <label className="block text-gray-700 font-bold mb-2">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="tenant@example.com"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="mb-4">
              <label className="block text-gray-700 font-bold mb-2">Personal Message (Optional)</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Hi! I wanted to share this rental opportunity..."
                rows="3"
                className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
              />
            </div>

            <button
              onClick={handleShareViaEmail}
              disabled={!email}
              className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
            >
              📧 Open Email App
            </button>
          </div>

          <div className="mt-4 bg-blue-50 p-3 rounded text-sm text-blue-800">
            <strong>💡 Tip:</strong> Share this link on rental websites, social media, or directly with interested tenants. 
            They can complete the entire application online!
          </div>
        </div>
      </div>
    </div>
  );
}
