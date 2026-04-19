import { useState, useEffect } from 'react';
import { CreditCard, Building2, CheckCircle, AlertCircle, Loader2, ChevronRight } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, CardElement, useStripe, useElements } from '@stripe/react-stripe-js';
import apiClient from '../api/client';

// Initialize Stripe (use your publishable key)
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || 'pk_test_your_key');

/**
 * Payment Fee Calculator Display
 */
function FeeBreakdown({ fees, paymentMethod }) {
  if (paymentMethod === 'ach') {
    return (
      <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
        <div className="flex items-center gap-2 text-green-700 mb-2">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">FREE Bank Transfer</span>
        </div>
        <p className="text-sm text-green-600">
          No fees! Takes 3-5 business days to process.
        </p>
        <div className="mt-3 pt-3 border-t border-green-200">
          <div className="flex justify-between">
            <span>Rent Amount:</span>
            <span className="font-semibold">{fees.rent_amount_formatted}</span>
          </div>
          <div className="flex justify-between text-green-700 mt-1">
            <span>Fee:</span>
            <span className="font-semibold">$0.00</span>
          </div>
          <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t border-green-200">
            <span>Total:</span>
            <span>{fees.rent_amount_formatted}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
      <div className="text-sm text-blue-600 mb-2">Payment Summary</div>
      
      <div className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Rent Amount:</span>
          <span>{fees.rent_amount_formatted}</span>
        </div>
        
        <div className="flex justify-between text-sm text-red-600">
          <span>Processing Fee (2.9% + $0.30):</span>
          <span>{fees.total_fee_formatted}</span>
        </div>
        
        <div className="flex justify-between text-lg font-bold pt-2 border-t border-blue-200">
          <span>Total:</span>
          <span>{fees.tenant_pays_formatted}</span>
        </div>
      </div>
      
      <p className="text-xs text-gray-500 mt-3">
        The processing fee covers credit card transaction costs.
        <a href="#" className="text-blue-600 hover:underline">Learn more</a>
      </p>
    </div>
  );
}

/**
 * Card Payment Form
 */
function CardPaymentForm({ clientSecret, onSuccess, onError }) {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!stripe || !elements) return;
    
    setProcessing(true);
    setError(null);
    
    const { error: submitError, paymentIntent } = await stripe.confirmCardPayment(
      clientSecret,
      {
        payment_method: {
          card: elements.getElement(CardElement),
        },
      }
    );
    
    if (submitError) {
      setError(submitError.message);
      onError(submitError.message);
    } else if (paymentIntent.status === 'succeeded') {
      onSuccess(paymentIntent);
    }
    
    setProcessing(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="border rounded-lg p-4 bg-white">
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Card Information
        </label>
        <div className="border rounded-md p-3">
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
              },
            }}
          />
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-red-600 text-sm">
          <AlertCircle className="w-4 h-4" />
          {error}
        </div>
      )}
      
      <button
        type="submit"
        disabled={!stripe || processing}
        className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          'Pay with Card'
        )}
      </button>
    </form>
  );
}

/**
 * ACH/Bank Transfer Option
 */
function ACHPaymentOption({ onSelect }) {
  return (
    <div className="border rounded-lg p-4 hover:border-green-400 cursor-pointer transition-colors">
      <div className="flex items-start gap-3">
        <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center flex-shrink-0">
          <Building2 className="w-5 h-5 text-green-600" />
        </div>
        
        <div className="flex-1">
          <div className="font-medium text-gray-900">Bank Transfer (ACH)</div>
          <div className="text-sm text-gray-600 mt-1">
            Connect your bank account for free transfers.
          </div>
          <div className="flex items-center gap-4 mt-2 text-sm text-green-600">
            <span className="flex items-center gap-1">
              <CheckCircle className="w-4 h-4" />
              FREE
            </span>
            <span className="text-gray-400">3-5 business days</span>
          </div>
          
          <button
            onClick={onSelect}
            className="mt-3 text-blue-600 font-medium hover:text-blue-700"
          >
            Select Bank Transfer →
          </button>
        </div>
      </div>
    </div>
  );
}

/**
 * Main Payment Processor Component
 */
export default function PaymentProcessor({ tenantId, monthlyRent, tenantName, onSuccess }) {
  const [step, setStep] = useState('method'); // method, fees, payment, success
  const [paymentMethod, setPaymentMethod] = useState('card');
  const [fees, setFees] = useState(null);
  const [clientSecret, setClientSecret] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Calculate fees when method changes
  useEffect(() => {
    if (step === 'fees') {
      calculateFees();
    }
  }, [paymentMethod, step]);

  const calculateFees = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/payments/calculate-fees', {
        tenant_id: tenantId,
        payment_method: paymentMethod
      });
      
      setFees(response.fees);
      
      if (paymentMethod === 'card') {
        // Create payment intent for card payments
        await createPaymentIntent();
      }
    } catch (err) {
      setError(err.message || 'Failed to calculate fees');
    }
    setLoading(false);
  };

  const createPaymentIntent = async () => {
    const currentMonth = new Date().toISOString().slice(0, 7); // YYYY-MM
    
    try {
      const response = await apiClient.post('/payments/create-payment-intent', {
        tenant_id: tenantId,
        payment_method: paymentMethod,
        for_month: currentMonth
      });
      
      setClientSecret(response.client_secret);
    } catch (err) {
      setError(err.message || 'Failed to initialize payment');
    }
  };

  const handlePaymentSuccess = (paymentIntent) => {
    setStep('success');
    if (onSuccess) {
      onSuccess(paymentIntent);
    }
  };

  const handlePaymentError = (errorMessage) => {
    setError(errorMessage);
  };

  const handleMethodSelect = (method) => {
    setPaymentMethod(method);
    setStep('fees');
  };

  // Render payment method selection
  if (step === 'method') {
    return (
      <div className="space-y-4">
        <div className="text-center mb-6">
          <div className="text-2xl font-bold text-gray-900">Pay Rent</div>
          <div className="text-gray-600 mt-1">
            {tenantName} - ${monthlyRent}/month
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={() => handleMethodSelect('card')}
            className="w-full border rounded-lg p-4 hover:border-blue-400 hover:bg-blue-50 transition-colors text-left"
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <CreditCard className="w-5 h-5 text-blue-600" />
              </div>
              <div className="flex-1">
                <div className="font-medium">Credit/Debit Card</div>
                <div className="text-sm text-gray-500">Instant • 2.9% + $0.30 fee</div>
              </div>
              <ChevronRight className="w-5 h-5 text-gray-400" />
            </div>
          </button>

          <ACHPaymentOption onSelect={() => handleMethodSelect('ach')} />
        </div>
      </div>
    );
  }

  // Render fee breakdown
  if (step === 'fees') {
    if (loading) {
      return (
        <div className="text-center py-8">
          <Loader2 className="w-8 h-8 animate-spin mx-auto mb-4 text-blue-600" />
          Calculating fees...
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 mx-auto mb-4 text-red-600" />
          <p className="text-red-600">{error}</p>
          <button
            onClick={() => setStep('method')}
            className="mt-4 text-blue-600 hover:underline"
          >
            Try Again
          </button>
        </div>
      );
    }

    return (
      <div className="space-y-4">
        <button
          onClick={() => setStep('method')}
          className="text-sm text-gray-500 hover:text-gray-700"
        >
          ← Change payment method
        </button>

        <div className="text-center">
          <div className="text-2xl font-bold text-gray-900">{tenantName}</div>
          <div className="text-gray-600">Rent for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</div>
        </div>

        {fees && <FeeBreakdown fees={fees} paymentMethod={paymentMethod} />}

        {paymentMethod === 'card' && clientSecret && (
          <Elements stripe={stripePromise}>
            <CardPaymentForm
              clientSecret={clientSecret}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
            />
          </Elements>
        )}

        {paymentMethod === 'ach' && (
          <div className="bg-gray-50 border rounded-lg p-4">
            <p className="text-sm text-gray-600 mb-4">
              Bank transfer will be initiated. You'll receive instructions via email.
            </p>
            <button
              onClick={() => handlePaymentSuccess({ method: 'ach' })}
              className="w-full bg-green-600 text-white py-3 rounded-lg font-medium hover:bg-green-700"
            >
              Confirm Bank Transfer
            </button>
          </div>
        )}
      </div>
    );
  }

  // Render success
  if (step === 'success') {
    return (
      <div className="text-center py-8">
        <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
          <CheckCircle className="w-8 h-8 text-green-600" />
        </div>
        
        <div className="text-2xl font-bold text-gray-900 mb-2">Payment Successful!</div>
        <p className="text-gray-600">
          {paymentMethod === 'card' 
            ? 'Your payment has been processed.'
            : 'Your bank transfer has been initiated.'
          }
        </p>
        
        {fees && (
          <div className="mt-4 text-sm text-gray-500">
            Amount: {fees.tenant_pays_formatted}
          </div>
        )}
      </div>
    );
  }

  return null;
}


