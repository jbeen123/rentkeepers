import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '../api/client';

export default function SmartHome() {
  const [selectedDevice, setSelectedDevice] = useState(null);
  const [showAddModal, setShowAddModal] = useState(false);

  const { data: properties } = useQuery({
    queryKey: ['properties'],
    queryFn: () => api.get('/api/properties'),
  });

  // Mock smart home devices (would integrate with real APIs in production)
  const [devices, setDevices] = useState([
    {
      id: 1,
      property_id: 1,
      type: 'smart_lock',
      brand: 'August',
      name: 'Front Door Lock',
      status: 'online',
      battery: 85,
      last_sync: new Date().toISOString()
    },
    {
      id: 2,
      property_id: 1,
      type: 'thermostat',
      brand: 'Nest',
      name: 'Living Room Thermostat',
      status: 'online',
      temperature: 72,
      last_sync: new Date().toISOString()
    },
    {
      id: 3,
      property_id: 1,
      type: 'leak_detector',
      brand: 'Moen',
      name: 'Kitchen Leak Sensor',
      status: 'online',
      battery: 92,
      last_sync: new Date().toISOString()
    }
  ]);

  const getDeviceIcon = (type) => {
    const icons = {
      smart_lock: '🔒',
      thermostat: '🌡️',
      leak_detector: '💧',
      camera: '📹',
      doorbell: '🔔',
      smoke_detector: '🚨'
    };
    return icons[type] || '📱';
  };

  const getStatusColor = (status) => {
    const colors = {
      online: 'text-green-600 bg-green-50',
      offline: 'text-red-600 bg-red-50',
      warning: 'text-yellow-600 bg-yellow-50'
    };
    return colors[status] || colors.online;
  };

  return (
    <div>
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold">🏠 Smart Home Integration</h2>
        <button
          onClick={() => setShowAddModal(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          ➕ Add Device
        </button>
      </div>

      {/* Supported Integrations */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-bold mb-4">🔗 Supported Integrations</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="border rounded-lg p-4 text-center hover:shadow-md transition-shadow">
            <div className="text-3xl mb-2">🔒</div>
            <div className="font-medium">Smart Locks</div>
            <div className="text-sm text-gray-500">August, Yale, Schlage</div>
          </div>
          <div className="border rounded-lg p-4 text-center hover:shadow-md transition-shadow">
            <div className="text-3xl mb-2">🌡️</div>
            <div className="font-medium">Thermostats</div>
            <div className="text-sm text-gray-500">Nest, Ecobee, Honeywell</div>
          </div>
          <div className="border rounded-lg p-4 text-center hover:shadow-md transition-shadow">
            <div className="text-3xl mb-2">💧</div>
            <div className="font-medium">Leak Detectors</div>
            <div className="text-sm text-gray-500">Moen, Phyn, Grohe</div>
          </div>
          <div className="border rounded-lg p-4 text-center hover:shadow-md transition-shadow">
            <div className="text-3xl mb-2">📹</div>
            <div className="font-medium">Cameras</div>
            <div className="text-sm text-gray-500">Ring, Arlo, Nest Cam</div>
          </div>
        </div>
      </div>

      {/* Connected Devices */}
      <div className="bg-white rounded-lg shadow">
        <div className="p-4 border-b">
          <h3 className="font-semibold">Connected Devices ({devices.length})</h3>
        </div>
        
        {devices.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
            {devices.map((device) => (
              <div key={device.id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                <div className="flex justify-between items-start mb-3">
                  <div className="text-3xl">{getDeviceIcon(device.type)}</div>
                  <span className={`text-xs px-2 py-1 rounded ${getStatusColor(device.status)}`}>
                    {device.status === 'online' ? '✓ Online' : '○ Offline'}
                  </span>
                </div>
                
                <h4 className="font-bold mb-1">{device.name}</h4>
                <div className="text-sm text-gray-500 mb-3">{device.brand}</div>
                
                <div className="space-y-2 text-sm">
                  {device.battery && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Battery</span>
                      <span className="font-medium">{device.battery}%</span>
                    </div>
                  )}
                  {device.temperature && (
                    <div className="flex justify-between">
                      <span className="text-gray-500">Temperature</span>
                      <span className="font-medium">{device.temperature}°F</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span className="text-gray-500">Last Sync</span>
                    <span className="font-medium">
                      {new Date(device.last_sync).toLocaleTimeString()}
                    </span>
                  </div>
                </div>
                
                <div className="flex gap-2 mt-4 pt-3 border-t">
                  <button className="flex-1 bg-blue-600 text-white px-3 py-1 rounded text-sm hover:bg-blue-700">
                    Configure
                  </button>
                  <button className="flex-1 bg-gray-600 text-white px-3 py-1 rounded text-sm hover:bg-gray-700">
                    Test
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10">
            <div className="text-4xl mb-3">📱</div>
            <p className="text-gray-500">
              No smart home devices connected yet.{' '}
              <button onClick={() => setShowAddModal(true)} className="text-blue-600 hover:underline">
                Add your first device
              </button>
            </p>
          </div>
        )}
      </div>

      {/* Benefits Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6">
        <div className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg p-4">
          <h4 className="font-bold text-blue-800 mb-2">🔑 Keyless Entry</h4>
          <p className="text-sm text-blue-700">
            Grant access to tenants, contractors, and showings without physical keys. Track all entries.
          </p>
        </div>
        <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
          <h4 className="font-bold text-green-800 mb-2">💰 Energy Savings</h4>
          <p className="text-sm text-green-700">
            Smart thermostats reduce energy costs by 10-15%. Monitor and control remotely.
          </p>
        </div>
        <div className="bg-gradient-to-r from-orange-50 to-red-50 border border-orange-200 rounded-lg p-4">
          <h4 className="font-bold text-orange-800 mb-2">⚠️ Damage Prevention</h4>
          <p className="text-sm text-orange-700">
            Leak detectors alert you to water issues before they become costly repairs.
          </p>
        </div>
      </div>

      {/* Add Device Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-xl font-bold">➕ Add Smart Device</h3>
                <button 
                  onClick={() => setShowAddModal(false)}
                  className="text-gray-400 hover:text-gray-600 text-2xl"
                >
                  ×
                </button>
              </div>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Device Type</label>
                  <select className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500">
                    <option>Smart Lock</option>
                    <option>Thermostat</option>
                    <option>Leak Detector</option>
                    <option>Security Camera</option>
                    <option>Video Doorbell</option>
                    <option>Smoke Detector</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Brand</label>
                  <select className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500">
                    <option>August</option>
                    <option>Yale</option>
                    <option>Schlage</option>
                    <option>Nest</option>
                    <option>Ecobee</option>
                    <option>Ring</option>
                    <option>Arlo</option>
                  </select>
                </div>
                
                <div>
                  <label className="block text-gray-700 font-bold mb-2">Property</label>
                  <select className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500">
                    {properties?.map((p) => (
                      <option key={p.id} value={p.id}>{p.name || p.address}</option>
                    ))}
                  </select>
                </div>
                
                <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
                  <strong>Note:</strong> Device must be connected to the same WiFi network during setup. 
                  Follow manufacturer instructions for pairing mode.
                </div>
                
                <div className="flex gap-3 pt-4">
                  <button
                    onClick={() => setShowAddModal(false)}
                    className="flex-1 bg-gray-600 text-white py-2 rounded hover:bg-gray-700"
                  >
                    Cancel
                  </button>
                  <button className="flex-1 bg-blue-600 text-white py-2 rounded hover:bg-blue-700">
                    Connect Device
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
