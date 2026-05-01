/**
 * RentKeepers Mobile App Configuration
 * 
 * Update these values based on your environment:
 * - Development (local): Use your machine's IP address
 * - Android Emulator: Use 10.0.2.2 (maps to localhost)
 * - iOS Simulator: Use localhost
 * - Production: Use your server URL
 */

// Detect environment
const isEmulator = typeof navigator !== 'undefined' && 
  (navigator.userAgent.includes('Android') || navigator.userAgent.includes('iPhone'));

// Configuration
export const API_CONFIG = {
  // For local development on your machine
  LOCAL_HOST: 'http://localhost:3000',
  
  // For Android emulator (10.0.2.2 maps to host machine's localhost)
  ANDROID_EMULATOR: 'http://10.0.2.2:3000',
  
  // For iOS simulator (localhost works)
  IOS_SIMULATOR: 'http://localhost:3000',
  
  // Production URL (update when deploying)
  PRODUCTION: 'https://your-rentkeepers-server.com',
};

// Get the appropriate API URL based on platform
export const getApiUrl = () => {
  if (__DEV__) {
    // Development mode
    if (typeof navigator !== 'undefined' && navigator.userAgent.includes('Android')) {
      return API_CONFIG.ANDROID_EMULATOR;
    }
    return API_CONFIG.LOCAL_HOST;
  }
  // Production
  return API_CONFIG.PRODUCTION;
};

// Current API base URL
export const API_BASE_URL = getApiUrl();

// API Endpoints
export const ENDPOINTS = {
  // Health & Status
  HEALTH: '/api/health',
  
  // Documents
  DOCUMENTS: '/api/documents',
  DOCUMENT_UPLOAD: '/api/documents/upload',
  DOCUMENT_DOWNLOAD: (id) => `/api/documents/download/${id}`,
  DOCUMENT_VIEW: (id) => `/api/documents/view/${id}`,
  
  // Calendar (ICS)
  CALENDAR_SAMPLE: '/api/ics/sample',
  CALENDAR_RENT: '/api/ics/rent-reminder',
  CALENDAR_MAINTENANCE: '/api/ics/maintenance',
  CALENDAR_SHOWING: '/api/ics/showing',
  
  // Stripe Payments
  STRIPE_HEALTH: '/api/stripe/health',
  STRIPE_CUSTOMER: '/api/stripe/customer',
  STRIPE_PAYMENT: '/api/stripe/payment',
  STRIPE_INVOICE: '/api/stripe/invoice',
  STRIPE_SUBSCRIPTIONS: (customerId) => `/api/stripe/subscriptions/${customerId}`,
  
  // Statements
  STATEMENTS: '/api/statements',
  STATEMENT_GENERATE: '/api/statements/generate',
  STATEMENT_DOWNLOAD: (id) => `/api/statements/download/${id}`,
  
  // Properties & Owners
  PROPERTIES: '/api/properties',
  OWNERS: '/api/owners',
};

console.log('🔌 RentKeepers API Config:', {
  url: API_BASE_URL,
  environment: __DEV__ ? 'Development' : 'Production',
  platform: typeof navigator !== 'undefined' ? navigator.userAgent : 'Node.js'
});
