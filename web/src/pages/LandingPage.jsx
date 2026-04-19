import { useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Home, 
  Users, 
  DollarSign, 
  FileText, 
  Shield, 
  Zap, 
  CheckCircle, 
  ChevronRight,
  BarChart3,
  Clock,
  Smartphone,
  Lock
} from 'lucide-react';

/**
 * RentKeepers Landing Page
 * Marketing homepage showcasing features and benefits
 */
export default function LandingPage() {
  const [activeFaq, setActiveFaq] = useState(null);

  const features = [
    {
      icon: DollarSign,
      title: 'Automated Rent Collection',
      description: 'Track payments automatically. See who\'s paid, who\'s late, and send reminders with one click.'
    },
    {
      icon: FileText,
      title: 'Owner Statements',
      description: 'Generate professional PDF reports for property owners. Income, expenses, and management fees calculated automatically.'
    },
    {
      icon: Users,
      title: 'Tenant Portal',
      description: 'Give tenants secure access to view their payment history, lease documents, and submit maintenance requests.'
    },
    {
      icon: BarChart3,
      title: 'Financial Dashboard',
      description: 'Real-time insights into your portfolio. Track occupancy rates, cash flow, and outstanding payments at a glance.'
    },
    {
      icon: Shield,
      title: 'Bank-Grade Security',
      description: '256-bit encryption, two-factor authentication, and secure payment processing keep your data safe.'
    },
    {
      icon: Smartphone,
      title: 'Mobile Ready',
      description: 'Manage your properties from anywhere. Responsive design works perfectly on phones, tablets, and desktops.'
    }
  ];

  const benefits = [
    'Save 10+ hours per month on administrative tasks',
    'Reduce late payments by 40% with automated reminders',
    'Impress property owners with professional monthly statements',
    'Scale from 1 property to 100+ without breaking a sweat',
    'Never lose track of maintenance requests or lease renewals',
    'Access your data anywhere, anytime'
  ];

  const pricingPlans = [
    {
      name: 'Free',
      price: '$0',
      period: 'forever',
      description: 'Perfect for landlords just getting started',
      features: [
        'Up to 3 tenants',
        '1 property',
        'Basic payment tracking',
        'Email reminders'
      ],
      cta: 'Start Free',
      popular: false
    },
    {
      name: 'Premium',
      price: '$29',
      period: 'per month',
      description: 'For serious property managers',
      features: [
        'Unlimited tenants',
        'Unlimited properties',
        'Owner statements & PDFs',
        'Expense tracking',
        'Priority support',
        'Custom branding'
      ],
      cta: 'Start Free Trial',
      popular: true
    },
    {
      name: 'Lifetime',
      price: '$499',
      period: 'one-time',
      description: 'Pay once, use forever',
      features: [
        'Everything in Premium',
        'Lifetime updates',
        'API access',
        'White-label options',
        'Dedicated support',
        'Custom integrations'
      ],
      cta: 'Get Lifetime',
      popular: false
    }
  ];

  const faqs = [
    {
      q: 'How does the free plan work?',
      a: 'Our free plan is truly free forever. You can manage up to 3 tenants and 1 property with no credit card required. Upgrade anytime when you need more.'
    },
    {
      q: 'Can I generate owner statements?',
      a: 'Yes! Premium and Lifetime plans include professional PDF owner statements. These automatically calculate income, expenses, and management fees for any property.'
    },
    {
      q: 'Is my data secure?',
      a: 'Absolutely. We use 256-bit SSL encryption, two-factor authentication, and secure payment processing. Your data is never sold or shared with third parties.'
    },
    {
      q: 'Can tenants pay rent online?',
      a: 'Yes! Tenants can log into their portal to view payment history and you can track everything from your dashboard. (Online payment processing coming soon)'
    },
    {
      q: 'What happens if I cancel?',
      a: 'You keep all your data. Export everything before cancelling and we\'ll delete your data from our servers within 30 days.'
    }
  ];

  const stats = [
    { value: '50,000+', label: 'Properties Managed' },
    { value: '$10M+', label: 'Rent Tracked Monthly' },
    { value: '99.9%', label: 'Uptime' },
    { value: '4.9/5', label: 'User Rating' }
  ];

  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-white border-b border-gray-100 sticky top-0 z-50">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Home className="w-8 h-8 text-blue-600" />
              RentKeepers
            </Link>
            
            <div className="hidden md:flex items-center gap-8">
              <a href="#features" className="text-gray-600 hover:text-gray-900">Features</a>
              <a href="#benefits" className="text-gray-600 hover:text-gray-900">Benefits</a>
              <a href="#pricing" className="text-gray-600 hover:text-gray-900">Pricing</a>
              <a href="#faq" className="text-gray-600 hover:text-gray-900">FAQ</a>
            </div>

            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-600 hover:text-gray-900 hidden sm:block">
                Sign In
              </Link>
              <Link 
                to="/register" 
                className="bg-blue-600 text-white px-6 py-2 rounded-full font-medium hover:bg-blue-700 transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-br from-blue-600 via-blue-700 to-indigo-800 text-white py-20 md:py-32">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4xIj48cGF0aCBkPSJNMzYgMzRoLTJ2LTRoMnY0em0wLTZ2LTRoLTJ2NGgyem0tNiA2aC00djJoNHYtMnpNNjAgMEgwdjYwaDYwVjB6bS0yIDJ2NTZIMlYyaDU2eiIvPjwvZz48L2c+PC9zdmc+')] opacity-10"></div>
        
        <div className="container mx-auto px-4 relative">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-8">
              <Zap className="w-4 h-4 text-yellow-300" />
              <span className="text-sm font-medium">Trusted by 10,000+ property managers</span>
            </div>
            
            <h1 className="text-4xl md:text-6xl font-bold mb-6 leading-tight">
              Property Management
              <span className="block text-blue-200">Made Simple</span>
            </h1>
            
            <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Track rent, generate owner statements, and manage tenants — all in one place. 
              Free for up to 3 tenants.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/register"
                className="bg-white text-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors flex items-center justify-center gap-2"
              >
                Start Free Today
                <ChevronRight className="w-5 h-5" />
              </Link>
              <a 
                href="#features"
                className="bg-blue-500/30 backdrop-blur-sm text-white border border-white/30 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-500/40 transition-colors"
              >
                See How It Works
              </a>
            </div>

            <div className="mt-12 flex justify-center">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-6 border border-white/20">
                <p className="text-sm text-blue-200 mb-4">No credit card required • Free forever plan • Cancel anytime</p>
                <div className="flex gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    Easy setup
                  </span>
                  <span className="flex items-center gap-1">
                    <CheckCircle className="w-4 h-4 text-green-400" />
                    2-minute signup
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-12 bg-gray-50 border-b">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8">
            {stats.map((stat, i) => (
              <div key={i} className="text-center">
                <div className="text-3xl md:text-4xl font-bold text-blue-600">{stat.value}</div>
                <div className="text-gray-600 mt-1">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Everything You Need to Manage Properties
            </h2>
            <p className="text-xl text-gray-600">
              Powerful features that save you time and help you scale your property management business.
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, i) => (
              <div key={i} className="group p-6 rounded-2xl border border-gray-200 hover:border-blue-300 hover:shadow-lg transition-all">
                <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-4 group-hover:bg-blue-600 transition-colors">
                  <feature.icon className="w-6 h-6 text-blue-600 group-hover:text-white transition-colors" />
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">{feature.title}</h3>
                <p className="text-gray-600">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Benefits Section */}
      <section id="benefits" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid lg:grid-cols-2 gap-12 items-center">
              <div>
                <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-6">
                  Why Property Managers Choose RentKeepers
                </h2>
                <p className="text-xl text-gray-600 mb-8">
                  We built RentKeepers after struggling with spreadsheets and expensive property management software. 
                  Our mission: make professional property management accessible to everyone.
                </p>
                
                <ul className="space-y-4">
                  {benefits.map((benefit, i) => (
                    <li key={i} className="flex items-start gap-3">
                      <CheckCircle className="w-6 h-6 text-green-500 flex-shrink-0 mt-0.5" />
                      <span className="text-gray-700">{benefit}</span>
                    </li>
                  ))}
                </ul>

                <Link 
                  to="/register"
                  className="inline-flex items-center gap-2 mt-8 bg-blue-600 text-white px-6 py-3 rounded-full font-medium hover:bg-blue-700 transition-colors"
                >
                  Join 10,000+ Property Managers
                  <ChevronRight className="w-5 h-5" />
                </Link>
              </div>

              <div className="bg-white rounded-3xl shadow-2xl p-8 border border-gray-100">
                <div className="flex items-center gap-4 mb-6 pb-6 border-b">
                  <div className="w-12 h-12 bg-blue-100 rounded-full flex items-center justify-center">
                    <BarChart3 className="w-6 h-6 text-blue-600" />
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900">Monthly Overview</div>
                    <div className="text-sm text-gray-500">March 2025</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 mb-6">
                  <div className="bg-green-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-green-600">$24,500</div>
                    <div className="text-sm text-gray-600">Collected</div>
                  </div>
                  <div className="bg-yellow-50 rounded-xl p-4">
                    <div className="text-2xl font-bold text-yellow-600">$3,200</div>
                    <div className="text-sm text-gray-600">Outstanding</div>
                  </div>
                </div>

                <div className="space-y-3">
                  {[
                    { name: 'Rent Collected', value: 85, color: 'bg-green-500' },
                    { name: 'Occupancy Rate', value: 94, color: 'bg-blue-500' },
                    { name: 'On-Time Payments', value: 78, color: 'bg-indigo-500' }
                  ].map((item, i) => (
                    <div key={i}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">{item.name}</span>
                        <span className="font-medium text-gray-900">{item.value}%</span>
                      </div>
                      <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                        <div className={`h-full ${item.color} rounded-full`} style={{ width: `${item.value}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Owner Statements Highlight */}
      <section className="py-20 bg-gradient-to-br from-indigo-600 to-blue-700 text-white">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 mb-6">
              <FileText className="w-4 h-4" />
              <span className="text-sm font-medium">New Feature</span>
            </div>
            
            <h2 className="text-3xl md:text-5xl font-bold mb-6">
              Professional Owner Statements
            </h2>
            <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
              Generate beautiful PDF reports for property owners with a single click. 
              Income, expenses, and management fees calculated automatically.
            </p>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl p-8 border border-white/20 max-w-2xl mx-auto">
              <div className="text-left space-y-4">
                <div className="flex justify-between items-center pb-4 border-b border-white/20">
                  <div>
                    <div className="font-semibold">Lakeside Apartments</div>
                    <div className="text-sm text-blue-200">March 2025 Statement</div>
                  </div>
                  <div className="text-right">
                    <div className="text-2xl font-bold">$8,162.50</div>
                    <div className="text-sm text-blue-200">Net to Owner</div>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-4 text-center">
                  <div>
                    <div className="text-xl font-bold">$14,175</div>
                    <div className="text-sm text-blue-200">Total Income</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">$4,595</div>
                    <div className="text-sm text-blue-200">Expenses</div>
                  </div>
                  <div>
                    <div className="text-xl font-bold">10%</div>
                    <div className="text-sm text-blue-200">Management Fee</div>
                  </div>
                </div>
              </div>
            </div>

            <p className="mt-8 text-blue-200">
              Available on Premium and Lifetime plans
            </p>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="pricing" className="py-20 md:py-32">
        <div className="container mx-auto px-4">
          <div className="text-center max-w-3xl mx-auto mb-16">
            <h2 className="text-3xl md:text-4xl font-bold text-gray-900 mb-4">
              Simple, Transparent Pricing
            </h2>
            <p className="text-xl text-gray-600">
              Start free and upgrade when you need more. No hidden fees.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {pricingPlans.map((plan, i) => (
              <div 
                key={i} 
                className={`rounded-2xl p-8 ${plan.popular 
                  ? 'bg-blue-600 text-white ring-4 ring-blue-100 scale-105' 
                  : 'bg-white border border-gray-200'
                }`}
              >
                {plan.popular && (
                  <div className="inline-block bg-yellow-400 text-yellow-900 text-xs font-bold px-3 py-1 rounded-full mb-4">
                    Most Popular
                  </div>
                )}
                
                <h3 className={`text-xl font-bold mb-2 ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                  {plan.name}
                </h3>
                
                <div className="mb-4">
                  <span className={`text-4xl font-bold ${plan.popular ? 'text-white' : 'text-gray-900'}`}>
                    {plan.price}
                  </span>
                  <span className={`text-sm ${plan.popular ? 'text-blue-200' : 'text-gray-500'}`}>
                    /{plan.period}
                  </span>
                </div>
                
                <p className={`text-sm mb-6 ${plan.popular ? 'text-blue-100' : 'text-gray-600'}`}>
                  {plan.description}
                </p>
                
                <ul className="space-y-3 mb-8">
                  {plan.features.map((feature, j) => (
                    <li key={j} className="flex items-center gap-2">
                      <CheckCircle className={`w-5 h-5 ${plan.popular ? 'text-blue-200' : 'text-green-500'}`} />
                      <span className={`text-sm ${plan.popular ? 'text-white' : 'text-gray-700'}`}>
                        {feature}
                      </span>
                    </li>
                  ))}
                </ul>
                
                <Link 
                  to="/register"
                  className={`block text-center py-3 rounded-full font-medium transition-colors ${
                    plan.popular 
                      ? 'bg-white text-blue-600 hover:bg-gray-100' 
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {plan.cta}
                </Link>
              </div>
            ))}
          </div>

          <p className="text-center text-gray-500 mt-8">
            All plans include SSL security, data backups, and email support.
          </p>
        </div>
      </section>

      {/* FAQ Section */}
      <section id="faq" className="py-20 bg-gray-50">
        <div className="container mx-auto px-4 max-w-3xl">
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 text-center mb-12">
            Frequently Asked Questions
          </h2>

          <div className="space-y-4">
            {faqs.map((faq, i) => (
              <div 
                key={i} 
                className="bg-white rounded-xl border border-gray-200 overflow-hidden"
              >
                <button
                  onClick={() => setActiveFaq(activeFaq === i ? null : i)}
                  className="w-full flex items-center justify-between p-6 text-left"
                >
                  <span className="font-medium text-gray-900">{faq.q}</span>
                  <ChevronRight 
                    className={`w-5 h-5 text-gray-400 transition-transform ${
                      activeFaq === i ? 'rotate-90' : ''
                    }`} 
                  />
                </button>
                {activeFaq === i && (
                  <div className="px-6 pb-6">
                    <p className="text-gray-600">{faq.a}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 md:py-32 bg-gradient-to-br from-blue-600 to-indigo-700 text-white">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Simplify Property Management?
          </h2>
          <p className="text-xl text-blue-100 mb-8 max-w-2xl mx-auto">
            Join thousands of property managers who've ditched spreadsheets for RentKeepers. 
            Free forever for up to 3 tenants.
          </p>
          
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Link 
              to="/register"
              className="bg-white text-blue-600 px-8 py-4 rounded-full font-bold text-lg hover:bg-gray-100 transition-colors"
            >
              Create Free Account
            </Link>
            <a 
              href="mailto:support@rentkeepers.com"
              className="bg-blue-500/30 backdrop-blur-sm text-white border border-white/30 px-8 py-4 rounded-full font-bold text-lg hover:bg-blue-500/40 transition-colors"
            >
              Contact Sales
            </a>
          </div>

          <div className="mt-12 flex justify-center gap-8 text-sm text-blue-200">
            <span className="flex items-center gap-2">
              <Lock className="w-4 h-4" />
              Bank-grade security
            </span>
            <span className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              2-minute setup
            </span>
            <span className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              No credit card required
            </span>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-400 py-12">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8 mb-8">
            <div>
              <div className="text-white font-bold text-xl mb-4 flex items-center gap-2">
                <Home className="w-6 h-6" />
                RentKeepers
              </div>
              <p className="text-sm">
                Simple, powerful property management software for landlords and property managers.
              </p>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#features" className="hover:text-white">Features</a></li>
                <li><a href="#pricing" className="hover:text-white">Pricing</a></li>
                <li><Link to="/register" className="hover:text-white">Sign Up</Link></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Resources</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="#faq" className="hover:text-white">FAQ</a></li>
                <li><a href="#" className="hover:text-white">Documentation</a></li>
                <li><a href="#" className="hover:text-white">Blog</a></li>
              </ul>
            </div>
            
            <div>
              <h4 className="text-white font-semibold mb-4">Contact</h4>
              <ul className="space-y-2 text-sm">
                <li><a href="mailto:support@rentkeepers.com" className="hover:text-white">support@rentkeepers.com</a></li>
                <li><a href="#" className="hover:text-white">Twitter</a></li>
                <li><a href="#" className="hover:text-white">LinkedIn</a></li>
              </ul>
            </div>
          </div>
          
          <div className="border-t border-gray-800 pt-8 flex flex-col md:flex-row justify-between items-center gap-4">
            <p className="text-sm">
              © 2026 RentKeepers. All rights reserved.
            </p>
            <div className="flex gap-6 text-sm">
              <a href="#" className="hover:text-white">Privacy Policy</a>
              <a href="#" className="hover:text-white">Terms of Service</a>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
