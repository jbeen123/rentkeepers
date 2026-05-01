import { Link } from 'react-router-dom';

/**
 * RentKeepers Landing Page - With Testimonials & Pricing Comparison
 */
export default function LandingPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Navigation */}
      <nav className="bg-gradient-to-r from-slate-700 to-slate-600 text-white shadow-lg">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="text-2xl font-bold flex items-center gap-2 hover:text-gray-200">
              <span>🏠</span> RentKeepers
            </Link>
            <div className="flex items-center gap-4">
              <Link to="/login" className="text-gray-300 hover:text-white transition-colors">
                Login
              </Link>
              <Link 
                to="/register" 
                className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-full font-medium transition-colors"
              >
                Get Started Free
              </Link>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="bg-gradient-to-br from-slate-700 via-slate-600 to-slate-800 text-white py-20">
        <div className="container mx-auto px-4">
          <div className="max-w-4xl mx-auto text-center">
            <h1 className="text-4xl md:text-6xl font-bold mb-6">Simple Rent Tracking for Modern Landlords</h1>
            <p className="text-xl md:text-2xl text-blue-100 mb-10 max-w-2xl mx-auto">
              Track rent payments, manage tenants, and grow your rental business—all in one place. No credit card required to start.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link 
                to="/register"
                className="bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-colors flex items-center justify-center gap-2"
              >
                <span>🚀</span> Get Started Free
              </Link>
              <Link 
                to="/login"
                className="bg-transparent border-2 border-white text-white px-8 py-4 rounded-full font-bold text-lg hover:bg-white/10 transition-colors flex items-center justify-center gap-2"
              >
                <span>🚪</span> Login
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Trust Badges */}
      <section className="py-8 bg-gray-50 border-b">
        <div className="container mx-auto px-4">
          <div className="flex flex-wrap justify-center items-center gap-8 text-gray-500 text-sm">
            <div className="flex items-center gap-2">
              <span className="text-green-600 text-xl">🔒</span>
              <span>Bank-Level Security</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-blue-600 text-xl">⚡</span>
              <span>50,000+ Properties Managed</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-purple-600 text-xl">⭐</span>
              <span>4.9/5 Star Rating</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-red-600 text-xl">💳</span>
              <span>256-Bit Encryption</span>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose RentKeepers?</h2>
            <p className="text-xl text-gray-600">Everything you need to manage your rental properties</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6 max-w-6xl mx-auto">
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-5xl text-blue-600 mb-4">👥</div>
              <h3 className="text-xl font-bold mb-2">Tenant Management</h3>
              <p className="text-gray-600">Track tenant info, lease details, and communication</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-5xl text-green-600 mb-4">💰</div>
              <h3 className="text-xl font-bold mb-2">Payment Tracking</h3>
              <p className="text-gray-600">Log rent payments and track what's owed</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-5xl text-purple-600 mb-4">📊</div>
              <h3 className="text-xl font-bold mb-2">Financial Reports</h3>
              <p className="text-gray-600">See your income at a glance with dashboards</p>
            </div>
            <div className="bg-white rounded-lg shadow-lg p-6 text-center">
              <div className="text-5xl text-yellow-600 mb-4">📧</div>
              <h3 className="text-xl font-bold mb-2">Auto Reminders</h3>
              <p className="text-gray-600">Send automatic rent reminder emails</p>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="py-16 bg-white">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Landlords Everywhere</h2>
            <p className="text-xl text-gray-600">See what property managers are saying about RentKeepers</p>
          </div>
          
          <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
            {/* Testimonial 1 */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 text-2xl">★★★★★</div>
              </div>
              <p className="text-gray-700 mb-6 italic">
                "RentKeepers has saved me at least 10 hours a month. No more chasing late payments or lost records. The automated reminders are a game-changer!"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  SJ
                </div>
                <div>
                  <div className="font-bold text-gray-900">Sarah Johnson</div>
                  <div className="text-sm text-gray-500">Manages 23 units • Texas</div>
                </div>
              </div>
            </div>

            {/* Testimonial 2 */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 text-2xl">★★★★★</div>
              </div>
              <p className="text-gray-700 mb-6 italic">
                "I switched from spreadsheets and haven't looked back. The tenant portal makes it so easy for my tenants to pay rent on time. Highly recommend!"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-green-400 to-green-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  MC
                </div>
                <div>
                  <div className="font-bold text-gray-900">Michael Chen</div>
                  <div className="text-sm text-gray-500">Manages 45 units • California</div>
                </div>
              </div>
            </div>

            {/* Testimonial 3 */}
            <div className="bg-white rounded-xl shadow-lg p-8 border border-gray-100 hover:shadow-xl transition-shadow">
              <div className="flex items-center mb-4">
                <div className="text-yellow-400 text-2xl">★★★★★</div>
              </div>
              <p className="text-gray-700 mb-6 italic">
                "The best part is the peace of mind. Everything is organized, payments are tracked, and I can access everything from my phone. Worth every penny!"
              </p>
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-purple-600 rounded-full flex items-center justify-center text-white font-bold text-xl">
                  ER
                </div>
                <div>
                  <div className="font-bold text-gray-900">Emily Rodriguez</div>
                  <div className="text-sm text-gray-500">Manages 12 units • Florida</div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mt-12 max-w-4xl mx-auto">
            <div className="text-center">
              <div className="text-4xl font-bold text-blue-600 mb-2">50,000+</div>
              <div className="text-gray-600">Properties Managed</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-green-600 mb-2">$120M+</div>
              <div className="text-gray-600">Rent Collected</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-purple-600 mb-2">15,000+</div>
              <div className="text-gray-600">Happy Landlords</div>
            </div>
            <div className="text-center">
              <div className="text-4xl font-bold text-yellow-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime SLA</div>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Comparison Table */}
      <section className="py-16 bg-gray-50" id="pricing">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Simple, Transparent Pricing</h2>
            <p className="text-xl text-gray-600">Choose the plan that fits your rental business</p>
          </div>

          {/* Comparison Table */}
          <div className="max-w-6xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
            {/* Table Header */}
            <div className="grid grid-cols-5 bg-slate-800 text-white">
              <div className="p-6 col-span-1"></div>
              <div className="p-6 text-center border-l border-slate-700">
                <div className="text-lg font-bold mb-1">Free</div>
                <div className="text-3xl font-bold">$0<span className="text-lg text-slate-400">/mo</span></div>
              </div>
              <div className="p-6 text-center border-l border-slate-700 bg-blue-600">
                <div className="text-xs bg-white text-blue-600 px-2 py-1 rounded-full inline-block mb-2 font-bold">MOST POPULAR</div>
                <div className="text-lg font-bold mb-1">Starter</div>
                <div className="text-3xl font-bold">$9<span className="text-lg text-blue-200">/mo</span></div>
              </div>
              <div className="p-6 text-center border-l border-slate-700">
                <div className="text-lg font-bold mb-1">Professional</div>
                <div className="text-3xl font-bold">$29<span className="text-lg text-slate-400">/mo</span></div>
              </div>
              <div className="p-6 text-center border-l border-slate-700">
                <div className="text-lg font-bold mb-1">Enterprise</div>
                <div className="text-3xl font-bold">$99<span className="text-lg text-slate-400">/mo</span></div>
              </div>
            </div>

            {/* Table Body */}
            <div className="divide-y">
              {/* Units */}
              <div className="grid grid-cols-5 hover:bg-gray-50">
                <div className="p-4 col-span-1 font-medium text-gray-700">Number of Units</div>
                <div className="p-4 text-center border-l text-gray-900">Up to 2</div>
                <div className="p-4 text-center border-l bg-blue-50 font-bold text-blue-900">Up to 10</div>
                <div className="p-4 text-center border-l text-gray-900">Up to 50</div>
                <div className="p-4 text-center border-l text-gray-900">Unlimited</div>
              </div>

              {/* Payment Tracking */}
              <div className="grid grid-cols-5 hover:bg-gray-50">
                <div className="p-4 col-span-1 font-medium text-gray-700">Payment Tracking</div>
                <div className="p-4 text-center border-l text-gray-900">Basic</div>
                <div className="p-4 text-center border-l bg-blue-50 font-bold text-blue-900">Advanced</div>
                <div className="p-4 text-center border-l text-gray-900">Advanced</div>
                <div className="p-4 text-center border-l text-gray-900">Advanced + Auto</div>
              </div>

              {/* Tenant Management */}
              <div className="grid grid-cols-5 hover:bg-gray-50">
                <div className="p-4 col-span-1 font-medium text-gray-700">Tenant Management</div>
                <div className="p-4 text-center border-l">✅</div>
                <div className="p-4 text-center border-l bg-blue-50">✅</div>
                <div className="p-4 text-center border-l">✅</div>
                <div className="p-4 text-center border-l">✅</div>
              </div>

              {/* Email Reminders */}
              <div className="grid grid-cols-5 hover:bg-gray-50">
                <div className="p-4 col-span-1 font-medium text-gray-700">Automated Email Reminders</div>
                <div className="p-4 text-center border-l text-gray-400">❌</div>
                <div className="p-4 text-center border-l bg-blue-50">✅</div>
                <div className="p-4 text-center border-l">✅</div>
                <div className="p-4 text-center border-l">✅</div>
              </div>

              {/* Financial Reports */}
              <div className="grid grid-cols-5 hover:bg-gray-50">
                <div className="p-4 col-span-1 font-medium text-gray-700">Financial Reports</div>
                <div className="p-4 text-center border-l text-gray-400">❌</div>
                <div className="p-4 text-center border-l bg-blue-50">✅</div>
                <div className="p-4 text-center border-l">✅</div>
                <div className="p-4 text-center border-l">✅ + Custom</div>
              </div>

              {/* PDF Statements */}
              <div className="grid grid-cols-5 hover:bg-gray-50">
                <div className="p-4 col-span-1 font-medium text-gray-700">PDF Owner Statements</div>
                <div className="p-4 text-center border-l text-gray-400">❌</div>
                <div className="p-4 text-center border-l bg-blue-50 text-gray-400">❌</div>
                <div className="p-4 text-center border-l">✅</div>
                <div className="p-4 text-center border-l">✅ Auto-Scheduled</div>
              </div>

              {/* Support */}
              <div className="grid grid-cols-5 hover:bg-gray-50">
                <div className="p-4 col-span-1 font-medium text-gray-700">Support</div>
                <div className="p-4 text-center border-l text-gray-900">Email</div>
                <div className="p-4 text-center border-l bg-blue-50 font-bold text-blue-900">Priority</div>
                <div className="p-4 text-center border-l text-gray-900">Priority Email</div>
                <div className="p-4 text-center border-l text-gray-900">24/7 Dedicated</div>
              </div>

              {/* API Access */}
              <div className="grid grid-cols-5 hover:bg-gray-50">
                <div className="p-4 col-span-1 font-medium text-gray-700">API Access</div>
                <div className="p-4 text-center border-l text-gray-400">❌</div>
                <div className="p-4 text-center border-l bg-blue-50 text-gray-400">❌</div>
                <div className="p-4 text-center border-l text-gray-400">❌</div>
                <div className="p-4 text-center border-l">✅</div>
              </div>

              {/* Custom Branding */}
              <div className="grid grid-cols-5 hover:bg-gray-50">
                <div className="p-4 col-span-1 font-medium text-gray-700">Custom Branding</div>
                <div className="p-4 text-center border-l text-gray-400">❌</div>
                <div className="p-4 text-center border-l bg-blue-50 text-gray-400">❌</div>
                <div className="p-4 text-center border-l text-gray-400">❌</div>
                <div className="p-4 text-center border-l">✅</div>
              </div>
            </div>

            {/* CTA Row */}
            <div className="grid grid-cols-5 bg-gray-50 p-6">
              <div className="col-span-1"></div>
              <div className="p-4 text-center border-l">
                <Link to="/register" className="block w-full py-3 px-4 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-lg text-center transition-colors">
                  Get Started
                </Link>
                <div className="text-xs text-gray-500 mt-2">Forever free</div>
              </div>
              <div className="p-4 text-center border-l bg-blue-50">
                <Link to="/register" className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white font-bold rounded-lg text-center transition-colors">
                  Start Free Trial
                </Link>
                <div className="text-xs text-gray-500 mt-2">14-day free trial</div>
              </div>
              <div className="p-4 text-center border-l">
                <Link to="/register" className="block w-full py-3 px-4 bg-blue-100 hover:bg-blue-200 text-blue-700 font-bold rounded-lg text-center transition-colors">
                  Start Free Trial
                </Link>
                <div className="text-xs text-gray-500 mt-2">14-day free trial</div>
              </div>
              <div className="p-4 text-center border-l">
                <button 
                  onClick={() => window.location.href = 'mailto:sales@rentkeepers.com'}
                  className="block w-full py-3 px-4 bg-gray-800 hover:bg-gray-900 text-white font-bold rounded-lg text-center transition-colors"
                >
                  Contact Sales
                </button>
                <div className="text-xs text-gray-500 mt-2">Custom solutions</div>
              </div>
            </div>
          </div>

          {/* Money Back Guarantee */}
          <div className="text-center mt-8">
            <div className="inline-flex items-center gap-2 bg-green-50 border border-green-200 rounded-full px-6 py-3">
              <span className="text-green-600 text-2xl">🛡️</span>
              <span className="text-green-800 font-medium">30-Day Money-Back Guarantee • No Credit Card Required to Start</span>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gray-100">
        <div className="container mx-auto px-4 text-center">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">Ready to Simplify Your Rent Tracking?</h2>
          <p className="text-xl text-gray-600 mb-8 max-w-2xl mx-auto">Join thousands of landlords who trust RentKeepers</p>
          <Link 
            to="/register"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white px-8 py-4 rounded-full font-bold text-lg transition-colors"
          >
            <span>🚀</span> Get Started for Free
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-white py-8 border-t">
        <div className="container mx-auto px-4 text-center">
          <p className="text-gray-500 text-sm mb-4">RentKeepers © 2026 - Simple Rent Tracking</p>
          <div className="flex justify-center gap-6">
            <a href="#" className="text-gray-400 hover:text-gray-600 text-2xl">🐦</a>
            <a href="#" className="text-gray-400 hover:text-gray-600 text-2xl">📘</a>
            <a href="#" className="text-gray-400 hover:text-gray-600 text-2xl">📧</a>
          </div>
        </div>
      </footer>
    </div>
  );
}
