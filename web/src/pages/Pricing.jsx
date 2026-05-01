import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function Pricing() {
  const { isAuthenticated } = useAuth();

  const plans = [
    {
      name: 'Free',
      price: '$0',
      period: '/month',
      tenants: 'Up to 2 units',
      features: [
        'Basic payment tracking',
        'Tenant management',
        'Dashboard overview',
        'Email support'
      ],
      cta: 'Get Started',
      popular: false,
    },
    {
      name: 'Starter',
      price: '$9',
      period: '/month',
      tenants: 'Up to 10 units',
      features: [
        'Advanced payment tracking',
        'Email reminders',
        'CSV export',
        'Financial dashboard',
        'Priority support'
      ],
      cta: 'Start Free Trial',
      popular: true,
    },
    {
      name: 'Professional',
      price: '$29',
      period: '/month',
      tenants: 'Up to 50 units',
      features: [
        'All Starter features',
        'PDF owner statements',
        'Auto-scheduled reports',
        'Multi-property support',
        'Priority email support',
        'Custom branding'
      ],
      cta: 'Start Free Trial',
      popular: false,
    },
    {
      name: 'Enterprise',
      price: '$99',
      period: '/month',
      tenants: 'Unlimited units',
      features: [
        'All Pro features',
        'Custom branding',
        'API access',
        'Dedicated account manager',
        '24/7 priority support',
        'Custom integrations',
        'SLA guarantee'
      ],
      cta: 'Contact Sales',
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
                plan.popular ? 'ring-2 ring-blue-600 transform scale-105' : ''
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
              {plan.name === 'Enterprise' ? (
                <button
                  onClick={() => alert('Contact us at sales@rentkeepers.com for Enterprise pricing!')}
                  className={`w-full py-2 px-4 rounded font-bold ${
                    plan.popular
                      ? 'bg-blue-600 text-white hover:bg-blue-700'
                      : 'bg-gray-800 text-white hover:bg-gray-900'
                  }`}
                >
                  {plan.cta}
                </button>
              ) : isAuthenticated ? (
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
              {plan.name === 'Starter' && (
                <small className="text-muted d-block mt-2">14-day free trial</small>
              )}
              {plan.name === 'Professional' && (
                <small className="text-muted d-block mt-2">14-day free trial</small>
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
