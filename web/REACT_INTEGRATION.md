# React Integration Guide - Owner Statements

This guide walks you through adding the Owner Statements component to your RentKeepers React app.

## 📁 Files Structure

```
web/src/
├── components/
│   ├── Layout.jsx          # ✏️ Add nav link
│   └── OwnerStatements.jsx # ✅ Already created
├── pages/
│   ├── Properties.jsx      # ✏️ Add statements button
│   └── Statements.jsx      # ✏️ Create new page (optional)
└── App.jsx                 # ✏️ Add route
```

## Step 1: Add the Component File

The component is already at:
```
web/src/components/OwnerStatements.jsx
```

## Step 2: Create a Statements Page (Option A - Full Page)

Create `web/src/pages/Statements.jsx`:

```jsx
import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { api } from '../api/client';
import OwnerStatements from '../components/OwnerStatements';
import { ChevronLeft } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function Statements() {
  const [searchParams] = useSearchParams();
  const propertyId = searchParams.get('property_id');
  
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState(propertyId);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProperties();
  }, []);

  const fetchProperties = async () => {
    try {
      const response = await api.get('/api/properties');
      setProperties(response.data);
      if (!selectedProperty && response.data.length > 0) {
        setSelectedProperty(response.data[0].id);
      }
    } catch (error) {
      console.error('Error fetching properties:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link to="/properties" className="text-blue-600 hover:text-blue-800">
            ← Back to Properties
          </Link>
        </div>
      </div>

      <h2 className="text-2xl font-bold mb-6">📊 Owner Statements</h2>

      {/* Property Selector */}
      <div className="mb-6">
        <label className="block text-sm font-medium text-gray-700 mb-2">Select Property</label>
        <select
          value={selectedProperty || ''}
          onChange={(e) => setSelectedProperty(Number(e.target.value))}
          className="border border-gray-300 rounded-md px-3 py-2 w-full md:w-64"
        >
          {properties.map(prop => (
            <option key={prop.id} value={prop.id}>{prop.name || prop.address}</option>
          ))}
        </select>
      </div>

      {selectedProperty ? (
        <OwnerStatements 
          propertyId={selectedProperty} 
          api={api}
        />
      ) : (
        <div className="text-center py-10 text-gray-500">
          {loading ? 'Loading properties...' : 'No properties found. Add a property first.'}
        </div>
      )}
    </div>
  );
}
```

## Step 3: Add Route to App.jsx

Edit `web/src/App.jsx`:

```jsx
// Add import at top
import Statements from './pages/Statements';

// Add route inside Routes
<Route path="/statements" element={<ProtectedRoute><Statements /></ProtectedRoute>} />
```

## Step 4: Add Navigation Link

Edit `web/src/components/Layout.jsx`:

Add after the Payments link:
```jsx
<Link 
  to="/statements" 
  className={`flex items-center gap-1 hover:text-gray-200 ${isActive('/statements') ? 'text-white font-semibold' : 'text-gray-300'}`}
>
  <span>📄</span> Statements
</Link>
```

## Option B: Embed in Properties Page (Alternative)

If you prefer to add Statements to the existing Properties page:

Edit `web/src/pages/Properties.jsx`:

```jsx
import { useState } from 'react';
// ... other imports
import OwnerStatements from '../components/OwnerStatements';
import { FileText } from 'lucide-react';

export default function Properties() {
  const [selectedProperty, setSelectedProperty] = useState(null);
  const [showStatements, setShowStatements] = useState(false);
  
  // ... existing code

  return (
    <div>
      {/* Existing properties grid */}
      
      {/* Add Statements button to each property card */}
      {properties?.map((property) => (
        <div key={property.id} className="bg-white rounded-lg shadow p-6">
          {/* ... existing card content */}
          
          <div className="flex gap-2 mt-4">
            <Link 
              to={`/properties/${property.id}/edit`}
              className="flex-1 bg-blue-600 text-white text-center px-4 py-2 rounded text-sm hover:bg-blue-700"
            >
              Edit
            </Link>
            <button
              onClick={() => {
                setSelectedProperty(property.id);
                setShowStatements(true);
              }}
              className="flex-1 bg-green-600 text-white px-4 py-2 rounded text-sm hover:bg-green-700 flex items-center justify-center gap-1"
            >
              <FileText className="w-4 h-4" />
              Statements
            </button>
          </div>
        </div>
      ))}

      {/* Statements Modal */}
      {showStatements && selectedProperty && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg p-6 w-full max-w-4xl max-h-[90vh] overflow-y-auto m-4">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold">Owner Statements</h2>
              <button 
                onClick={() => setShowStatements(false)}
                className="text-gray-500 hover:text-gray-700"
              >
                ✕ Close
              </button>
            </div>
            
            <OwnerStatements 
              propertyId={selectedProperty} 
              api={api}
            />
          </div>
        </div>
      )}
    </div>
  );
}
```

## Step 5: Update API Client (If Needed)

Check that your `web/src/api/client.js` handles blob responses:

```javascript
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Add auth token interceptor
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

export { api };
```

## Step 6: Test Integration

1. **Start your Flask backend**:
   ```bash
   python app.py
   ```

2. **Start your React frontend**:
   ```bash
   cd web
   npm run dev
   ```

3. **Navigate to Statements**:
   - Go to `http://localhost:5173/statements`
   - Select a property
   - Generate a statement

## Expected Behavior

### Statements Tab
```
┌─────────────────────────────────────────────────────────────┐
│  📊 Owner Statements                                        │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ 📄 Generate Statement                                  │  │
│  │                                                       │  │
│  │  [March ▼]  [2025 ▼]  [☐ Send via email]  [Generate]│  │
│  │  Management Fee: 10% | Auto-send: No                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  Previous Statements                                        │
│  ┌───────────────────────────────────────────────────────┐  │
│  │ [📄] March 2025          Net: $990.00      [⬇]      │  │
│  │ [📄] February 2025       Net: $1,250.00    [⬇]      │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Expenses Tab
```
┌─────────────────────────────────────────────────────────────┐
│  Expenses for March 2025                    [+ Add Expense]   │
├─────────────────────────────────────────────────────────────┤
│  Date       Description        Category        Amount         │
│  ──────────────────────────────────────────────────────────  │
│  Mar 15     HVAC Repair        maintenance     $450.00       │
│  Mar 10     Property Insurance insurance       $890.00       │
│  ──────────────────────────────────────────────────────────  │
│                              Total Expenses:   $1,340.00     │
└─────────────────────────────────────────────────────────────┘
```

### Settings Tab
```
┌─────────────────────────────────────────────────────────────┐
│  🏢 Company Information                                     │
│  Company Name: [Your Company               ]                 │
│  Phone:        [(555) 123-4567             ]                 │
│  Email:        [statements@company.com   ]                 │
│  Address:      [123 Business St            ]                 │
│  ──────────────────────────────────────────────────────────  │
│  💰 Statement Settings                                      │
│  Default Management Fee: [10] %                            │
│  Payment Terms: [Payment will be processed...    ]           │
│  ──────────────────────────────────────────────────────────  │
│  📧 Auto-Send Settings                                      │
│  [☐] Automatically send statements each month               │
│  Send on day: [5] of each month                              │
│  ──────────────────────────────────────────────────────────  │
│                                          [✓ Save Settings]   │
└─────────────────────────────────────────────────────────────┘
```

## Troubleshooting

### "api is not defined" error
Make sure you're passing the `api` prop:
```jsx
<OwnerStatements propertyId={1} api={api} />
```

### PDF not downloading
Check browser console for errors. Common issues:
- Backend not running
- CORS errors (check Flask CORS config)
- Missing authentication

### "Failed to fetch data"
- Verify Flask backend is running
- Check that `init_owner_statement_routes(app, mail)` was called in app.py
- Check browser Network tab for API errors

## Quick Test

After integration, run this test:

1. Navigate to Statements page
2. Select a property with tenants/payments
3. Click "Generate Statement"
4. PDF should download automatically
5. Check browser Downloads folder for the PDF

---

**Integration complete!** 🎉
