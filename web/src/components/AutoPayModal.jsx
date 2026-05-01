import { useState } from 'react';
import { api } from '../api/client';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe('YOUR_STRIPE_PUBLISHABLE_KEY');

function AutoPayForm({ tenantId, tenantName, monthlyRent, onSuccess }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      // Step 1: Create SetupIntent
      const { data: { client_secret, setup_intent_id } } = await api.post('/api/autopay/setup', {
        tenant_id: tenantId
      });

      // Step 2: Confirm card setup with Stripe
      const { error: stripeError, setupIntent } = await stripe.confirmCardSetup(client_secret, {
        payment_method: {
          card: elements.getElement(CardElement),
        }
      });

      if (stripeError) {
        throw new Error(stripeError.message);
      }

      // Step 3: Confirm with backend
      await api.post('/api/autopay/confirm', {
        tenant_id: tenantId,
        payment_method_id: setupIntent.payment_method
      });

      setSuccess(true);
      if (onSuccess) onSuccess();
    } catch (err) {
      setError(err.message || 'Failed to setup auto-pay');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-6 text-center">
        <div className="text-4xl mb-3">✅</div>
        <h3 className="text-lg font-bold text-green-800 mb-2">Auto-Pay Enabled!</h3>
        <p className="text-green-700 text-sm">
          {tenantName} will be automatically charged ${monthlyRent.toFixed(2)} on the 1st of each month.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded text-sm">
          {error}
        </div>
      )}

      <div className="bg-gray-50 p-4 rounded-lg">
        <p className="text-sm text-gray-600 mb-3">
          <strong>Tenant:</strong> {tenantName}<br/>
          <strong>Monthly Rent:</strong> ${monthlyRent.toFixed(2)}<br/>
          <strong>Charge Date:</strong> 1st of each month
        </p>
      </div>

      <div className="border rounded-lg p-4 bg-white">
        <label className="block text-gray-700 font-bold mb-2">Card Information</label>
        <CardElement
          options={{
            style: {
              base: {
                fontSize: '16px',
                color: '#424770',
                '::placeholder': {
                  color: '#aab7c4',
                },
              },
              invalid: {
                color: '#9e2146',
              },
            },
          }}
        />
      </div>

      <div className="bg-blue-50 p-3 rounded text-sm text-blue-800">
        <strong>ℹ️ How it works:</strong> The card will be charged automatically on the 1st of each month. 
        You can disable auto-pay at any time.
      </div>

      <button
        type="submit"
        disabled={!stripe || loading}
        className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold"
      >
        {loading ? 'Setting up...' : 'Enable Auto-Pay'}
      </button>
    </form>
  );
}

export default function AutoPayModal({ tenant, onClose }) {
  const [showModal, setShowModal] = useState(true);

  const handleClose = () => {
    setShowModal(false);
    if (onClose) onClose();
  };

  if (!showModal) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xl font-bold">💳 Setup Auto-Pay</h3>
            <button 
              onClick={handleClose}
              className="text-gray-400 hover:text-gray-600 text-2xl"
            >
              ×
            </button>
          </div>
          
          <Elements stripe={stripePromise}>
            <AutoPayForm
              tenantId={tenant.id}
              tenantName={tenant.name}
              monthlyRent={tenant.monthly_rent}
              onSuccess={handleClose}
            />
          </Elements>
        </div>
      </div>
    </div>
  );
}
