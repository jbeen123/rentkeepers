import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Pricing() {
  const { isAuthenticated } = useAuth();

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '',
      tenants: '3 tenants',
      features: ['Basic tracking', 'CSV export', 'Email support'],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Monthly',
      price: '$9',
      period: '/month',
      tenants: 'Unlimited tenants',
      features: ['Email reminders', 'Import/export', 'Priority support'],
      cta: 'Subscribe',
      popular: true,
    },
    {
      name: 'Yearly',
      price: '$79',
      period: '/year',
      tenants: 'Unlimited tenants',
      features: ['27% off monthly', 'All monthly features', 'Annual reports'],
      cta: 'Subscribe',
      popular: false,
    },
    {
      name: 'Lifetime',
      price: '$149',
      period: 'one-time',
      tenants: 'Unlimited forever',
      features: ['Pay once, use forever', 'All features', 'Lifetime updates'],
      cta: 'Buy Now',
      popular: false,
    },
  ];

  return (
    <div className="min-h-screen bg-gray-100 py-12">
      <div className="container mx-auto px-4">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">🏠 RentKeepers Pricing</h1>
          <p className="text-xl text-gray-600">Simple pricing for landlords of all sizes</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <div
              key={plan.name}
              className={`bg-white rounded-lg shadow-lg p-6 ${
                plan.popular ? 'ring-2 ring-blue-600' : ''
              }`}
            >
              {plan.popular && (
                <div className="bg-blue-600 text-white text-sm font-bold px-3 py-1 rounded-full inline-block mb-4">
                  Most Popular
                </div>
              )}
              <h3 className="text-xl font-bold mb-2">{plan.name}</h3>
              <div className="mb-4">
                <span className="text-4xl font-bold">{plan.price}</span>
                <span className="text-gray-500">{plan.period}</span>
              </div>
              <p className="text-gray-600 mb-4">{plan.tenants}</p>
              <ul className="mb-6 space-y-2">
                {plan.features.map((feature, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <span className="text-green-500">✓</span>
                    <span className="text-gray-600">{feature}</span>
                  </li>
                ))}
              </ul>
              {isAuthenticated ? (
                <button
                  className={`w-full py-2 px-4 rounded font-bold ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {plan.cta}
                </button>
              ) : (
                <Link
                  to="/register"
                  className={`block w-full py-2 px-4 rounded font-bold text-center ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-200 text-gray-800 hover:bg-gray-300'
                  }`}
                >
                  {plan.cta}
                </Link>
              )}
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <p className="text-gray-600">
            Questions? Contact us at{' '}
            <a href="mailto:support@rentkeepers.com" className="text-blue-600 hover:underline">
              support@rentkeepers.com
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
