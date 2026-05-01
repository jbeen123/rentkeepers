import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '../api/client';

export default function RentalApplicationForm() {
  const { propertyId } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const [formData, setFormData] = useState({
    // Personal Info
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    date_of_birth: '',
    ssn_last4: '',
    
    // Current Address
    current_address: '',
    current_city: '',
    current_state: '',
    current_zip: '',
    current_rent: '',
    landlord_name: '',
    landlord_phone: '',
    
    // Employment
    employment_status: 'employed',
    employer_name: '',
    employer_phone: '',
    position: '',
    monthly_income: '',
    
    // Additional Occupants
    additional_occupants: [],
    
    // Pets
    has_pets: false,
    pet_details: [],
    
    // Vehicle
    has_vehicle: false,
    vehicle_make: '',
    vehicle_model: '',
    vehicle_year: '',
    vehicle_color: '',
    license_plate: '',
    
    // References
    references: [
      { name: '', relationship: '', phone: '', email: '' },
      { name: '', relationship: '', phone: '', email: '' }
    ],
    
    // Move-in
    move_in_date: '',
    lease_term: '1 year',
    how_heard: '',
    additional_comments: '',
    
    // Consent
    consent_background_check: false,
    consent_credit_check: false,
  });

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleArrayChange = (index, field, value, arrayName) => {
    const newArray = [...formData[arrayName]];
    newArray[index] = { ...newArray[index], [field]: value };
    setFormData({ ...formData, [arrayName]: newArray });
  };

  const addOccupant = () => {
    setFormData({
      ...formData,
      additional_occupants: [...formData.additional_occupants, { name: '', relationship: '', age: '' }]
    });
  };

  const addPet = () => {
    setFormData({
      ...formData,
      pet_details: [...formData.pet_details, { type: '', breed: '', weight: '' }]
    });
  };

  const addReference = () => {
    setFormData({
      ...formData,
      references: [...formData.references, { name: '', relationship: '', phone: '', email: '' }]
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        ...formData,
        property_id: propertyId ? parseInt(propertyId) : undefined,
        current_rent: formData.current_rent ? parseFloat(formData.current_rent) : undefined,
        monthly_income: formData.monthly_income ? parseFloat(formData.monthly_income) : undefined,
        vehicle_year: formData.vehicle_year ? parseInt(formData.vehicle_year) : undefined,
      };

      await api.post('/api/applications', payload);
      setSuccess(true);
    } catch (err) {
      setError(err.message || 'Failed to submit application');
    } finally {
      setLoading(false);
    }
  };

  const nextStep = () => setStep(step + 1);
  const prevStep = () => setStep(step - 1);

  if (success) {
    return (
      <div className="max-w-2xl mx-auto py-10">
        <div className="bg-green-50 border border-green-200 rounded-lg p-8 text-center">
          <div className="text-5xl mb-4">🎉</div>
          <h2 className="text-2xl font-bold text-green-800 mb-2">Application Submitted!</h2>
          <p className="text-green-700 mb-6">
            Thank you for your application. The landlord will review it and get back to you soon.
          </p>
          <button
            onClick={() => navigate('/')}
            className="bg-green-600 text-white px-6 py-2 rounded hover:bg-green-700"
          >
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h2 className="text-3xl font-bold mb-6 text-center">📝 Rental Application</h2>
      
      {/* Progress Bar */}
      <div className="mb-8">
        <div className="flex justify-between mb-2">
          <span className={`text-sm ${step >= 1 ? 'text-blue-600' : 'text-gray-400'}`}>Personal</span>
          <span className={`text-sm ${step >= 2 ? 'text-blue-600' : 'text-gray-400'}`}>Address</span>
          <span className={`text-sm ${step >= 3 ? 'text-blue-600' : 'text-gray-400'}`}>Employment</span>
          <span className={`text-sm ${step >= 4 ? 'text-blue-600' : 'text-gray-400'}`}>Details</span>
          <span className={`text-sm ${step >= 5 ? 'text-blue-600' : 'text-gray-400'}`}>Consent</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className="bg-blue-600 h-2 rounded-full transition-all" 
            style={{ width: `${(step / 5) * 100}%` }}
          ></div>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow p-6">
        {/* Step 1: Personal Information */}
        {step === 1 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Personal Information</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-gray-700 font-bold mb-2">First Name *</label>
                <input
                  type="text"
                  name="first_name"
                  value={formData.first_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Last Name *</label>
                <input
                  type="text"
                  name="last_name"
                  value={formData.last_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
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
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Phone *</label>
                <input
                  type="tel"
                  name="phone"
                  value={formData.phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Date of Birth</label>
                <input
                  type="date"
                  name="date_of_birth"
                  value={formData.date_of_birth}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">SSN (Last 4 digits)</label>
                <input
                  type="text"
                  name="ssn_last4"
                  value={formData.ssn_last4}
                  onChange={handleChange}
                  maxLength="4"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  placeholder="1234"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <button type="button" onClick={nextStep} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 2: Current Address */}
        {step === 2 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Current Address & Landlord</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-bold mb-2">Current Address *</label>
                <input
                  type="text"
                  name="current_address"
                  value={formData.current_address}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">City *</label>
                <input
                  type="text"
                  name="current_city"
                  value={formData.current_city}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">State *</label>
                <input
                  type="text"
                  name="current_state"
                  value={formData.current_state}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">ZIP Code *</label>
                <input
                  type="text"
                  name="current_zip"
                  value={formData.current_zip}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Current Monthly Rent</label>
                <input
                  type="number"
                  name="current_rent"
                  value={formData.current_rent}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  placeholder="$"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Landlord Name</label>
                <input
                  type="text"
                  name="landlord_name"
                  value={formData.landlord_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Landlord Phone</label>
                <input
                  type="tel"
                  name="landlord_phone"
                  value={formData.landlord_phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={prevStep} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">
                ← Back
              </button>
              <button type="button" onClick={nextStep} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Employment */}
        {step === 3 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Employment & Income</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-bold mb-2">Employment Status *</label>
                <select
                  name="employment_status"
                  value={formData.employment_status}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  required
                >
                  <option value="employed">Employed</option>
                  <option value="self-employed">Self-Employed</option>
                  <option value="unemployed">Unemployed</option>
                  <option value="retired">Retired</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Employer Name</label>
                <input
                  type="text"
                  name="employer_name"
                  value={formData.employer_name}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Employer Phone</label>
                <input
                  type="tel"
                  name="employer_phone"
                  value={formData.employer_phone}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Position/Title</label>
                <input
                  type="text"
                  name="position"
                  value={formData.position}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Monthly Income</label>
                <input
                  type="number"
                  name="monthly_income"
                  value={formData.monthly_income}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  placeholder="$"
                />
              </div>
            </div>
            <div className="mt-6 flex justify-between">
              <button type="button" onClick={prevStep} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">
                ← Back
              </button>
              <button type="button" onClick={nextStep} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 4: Additional Details */}
        {step === 4 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Additional Details</h3>
            
            {/* Additional Occupants */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 font-bold">Additional Occupants</label>
                <button type="button" onClick={addOccupant} className="text-blue-600 hover:underline text-sm">
                  + Add Occupant
                </button>
              </div>
              {formData.additional_occupants.map((occ, idx) => (
                <div key={idx} className="grid grid-cols-3 gap-2 mb-2 p-2 bg-gray-50 rounded">
                  <input
                    placeholder="Name"
                    value={occ.name}
                    onChange={(e) => handleArrayChange(idx, 'name', e.target.value, 'additional_occupants')}
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <input
                    placeholder="Relationship"
                    value={occ.relationship}
                    onChange={(e) => handleArrayChange(idx, 'relationship', e.target.value, 'additional_occupants')}
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <input
                    placeholder="Age"
                    type="number"
                    value={occ.age}
                    onChange={(e) => handleArrayChange(idx, 'age', e.target.value, 'additional_occupants')}
                    className="px-2 py-1 border rounded text-sm"
                  />
                </div>
              ))}
            </div>

            {/* Pets */}
            <div className="mb-6">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  name="has_pets"
                  checked={formData.has_pets}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="font-medium">I have pets</span>
              </label>
              {formData.has_pets && (
                <div>
                  <button type="button" onClick={addPet} className="text-blue-600 hover:underline text-sm mb-2">
                    + Add Pet
                  </button>
                  {formData.pet_details.map((pet, idx) => (
                    <div key={idx} className="grid grid-cols-3 gap-2 mb-2 p-2 bg-gray-50 rounded">
                      <input
                        placeholder="Type (dog/cat)"
                        value={pet.type}
                        onChange={(e) => handleArrayChange(idx, 'type', e.target.value, 'pet_details')}
                        className="px-2 py-1 border rounded text-sm"
                      />
                      <input
                        placeholder="Breed"
                        value={pet.breed}
                        onChange={(e) => handleArrayChange(idx, 'breed', e.target.value, 'pet_details')}
                        className="px-2 py-1 border rounded text-sm"
                      />
                      <input
                        placeholder="Weight (lbs)"
                        type="text"
                        value={pet.weight}
                        onChange={(e) => handleArrayChange(idx, 'weight', e.target.value, 'pet_details')}
                        className="px-2 py-1 border rounded text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Vehicle */}
            <div className="mb-6">
              <label className="flex items-center gap-2 mb-2">
                <input
                  type="checkbox"
                  name="has_vehicle"
                  checked={formData.has_vehicle}
                  onChange={handleChange}
                  className="w-4 h-4"
                />
                <span className="font-medium">I have a vehicle</span>
              </label>
              {formData.has_vehicle && (
                <div className="grid grid-cols-2 gap-4">
                  <input
                    placeholder="Make"
                    name="vehicle_make"
                    value={formData.vehicle_make}
                    onChange={handleChange}
                    className="px-3 py-2 border rounded"
                  />
                  <input
                    placeholder="Model"
                    name="vehicle_model"
                    value={formData.vehicle_model}
                    onChange={handleChange}
                    className="px-3 py-2 border rounded"
                  />
                  <input
                    placeholder="Year"
                    type="number"
                    name="vehicle_year"
                    value={formData.vehicle_year}
                    onChange={handleChange}
                    className="px-3 py-2 border rounded"
                  />
                  <input
                    placeholder="Color"
                    name="vehicle_color"
                    value={formData.vehicle_color}
                    onChange={handleChange}
                    className="px-3 py-2 border rounded"
                  />
                  <input
                    placeholder="License Plate"
                    name="license_plate"
                    value={formData.license_plate}
                    onChange={handleChange}
                    className="px-3 py-2 border rounded"
                  />
                </div>
              )}
            </div>

            {/* References */}
            <div className="mb-6">
              <div className="flex justify-between items-center mb-2">
                <label className="block text-gray-700 font-bold">Personal References</label>
                <button type="button" onClick={addReference} className="text-blue-600 hover:underline text-sm">
                  + Add Reference
                </button>
              </div>
              {formData.references.map((ref, idx) => (
                <div key={idx} className="grid grid-cols-2 gap-2 mb-2 p-2 bg-gray-50 rounded">
                  <input
                    placeholder="Name"
                    value={ref.name}
                    onChange={(e) => handleArrayChange(idx, 'name', e.target.value, 'references')}
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <input
                    placeholder="Relationship"
                    value={ref.relationship}
                    onChange={(e) => handleArrayChange(idx, 'relationship', e.target.value, 'references')}
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <input
                    placeholder="Phone"
                    type="tel"
                    value={ref.phone}
                    onChange={(e) => handleArrayChange(idx, 'phone', e.target.value, 'references')}
                    className="px-2 py-1 border rounded text-sm"
                  />
                  <input
                    placeholder="Email"
                    type="email"
                    value={ref.email}
                    onChange={(e) => handleArrayChange(idx, 'email', e.target.value, 'references')}
                    className="px-2 py-1 border rounded text-sm"
                  />
                </div>
              ))}
            </div>

            {/* Move-in Details */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
              <div>
                <label className="block text-gray-700 font-bold mb-2">Desired Move-in Date</label>
                <input
                  type="date"
                  name="move_in_date"
                  value={formData.move_in_date}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="block text-gray-700 font-bold mb-2">Lease Term</label>
                <select
                  name="lease_term"
                  value={formData.lease_term}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                >
                  <option value="6 months">6 Months</option>
                  <option value="1 year">1 Year</option>
                  <option value="2 years">2 Years</option>
                  <option value="month-to-month">Month-to-Month</option>
                </select>
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-bold mb-2">How did you hear about us?</label>
                <input
                  type="text"
                  name="how_heard"
                  value={formData.how_heard}
                  onChange={handleChange}
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  placeholder="Zillow, Craigslist, Friend, etc."
                />
              </div>
              <div className="md:col-span-2">
                <label className="block text-gray-700 font-bold mb-2">Additional Comments</label>
                <textarea
                  name="additional_comments"
                  value={formData.additional_comments}
                  onChange={handleChange}
                  rows="3"
                  className="w-full px-3 py-2 border rounded focus:outline-none focus:border-blue-500"
                  placeholder="Anything else you'd like us to know..."
                ></textarea>
              </div>
            </div>

            <div className="mt-6 flex justify-between">
              <button type="button" onClick={prevStep} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">
                ← Back
              </button>
              <button type="button" onClick={nextStep} className="bg-blue-600 text-white px-6 py-2 rounded hover:bg-blue-700">
                Next →
              </button>
            </div>
          </div>
        )}

        {/* Step 5: Consent & Submit */}
        {step === 5 && (
          <div>
            <h3 className="text-xl font-semibold mb-4">Consent & Agreements</h3>
            
            <div className="space-y-4 mb-6">
              <label className="flex items-start gap-3 p-4 border rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="consent_background_check"
                  checked={formData.consent_background_check}
                  onChange={handleChange}
                  className="w-5 h-5 mt-0.5"
                  required
                />
                <span className="text-gray-700">
                  I consent to a background check as part of my rental application. I understand this may include criminal history verification.
                </span>
              </label>

              <label className="flex items-start gap-3 p-4 border rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  name="consent_credit_check"
                  checked={formData.consent_credit_check}
                  onChange={handleChange}
                  className="w-5 h-5 mt-0.5"
                  required
                />
                <span className="text-gray-700">
                  I consent to a credit check as part of my rental application. I understand this will affect my credit score.
                </span>
              </label>
            </div>

            <div className="bg-gray-50 p-4 rounded mb-6">
              <p className="text-sm text-gray-600">
                By submitting this application, I certify that all information provided is true and accurate. 
                I understand that false or misleading information may result in denial of my application or 
                termination of my lease.
              </p>
            </div>

            <div className="mt-6 flex justify-between">
              <button type="button" onClick={prevStep} className="bg-gray-500 text-white px-6 py-2 rounded hover:bg-gray-600">
                ← Back
              </button>
              <button
                type="submit"
                disabled={loading}
                className="bg-green-600 text-white px-8 py-3 rounded hover:bg-green-700 disabled:opacity-50 font-bold"
              >
                {loading ? 'Submitting...' : 'Submit Application'}
              </button>
            </div>
          </div>
        )}
      </form>
    </div>
  );
}
