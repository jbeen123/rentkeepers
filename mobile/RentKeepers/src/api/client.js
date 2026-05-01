// RentKeepers API Client
import { API_BASE_URL, ENDPOINTS } from '../config';

class ApiClient {
  constructor() {
    this.baseUrl = API_BASE_URL;
    console.log('🔌 API Client initialized:', this.baseUrl);
    this.token = null;
  }

  async request(endpoint, options = {}) {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (this.token) {
      headers['Authorization'] = `Bearer ${this.token}`;
    }

    const response = await fetch(url, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ message: 'Request failed' }));
      throw new Error(error.message || `HTTP ${response.status}`);
    }

    return response.json();
  }

  // Auth endpoints
  async login(email, password) {
    // Note: Flask uses form data, not JSON
    const formData = new URLSearchParams();
    formData.append('email', email);
    formData.append('password', password);

    const response = await fetch(`${this.baseUrl}/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    // Check if redirected to 2FA
    if (response.redirected && response.url.includes('/verify-2fa')) {
      return { requires2FA: true };
    }

    if (!response.ok) {
      throw new Error('Invalid email or password');
    }

    // Get CSRF token from cookies for subsequent requests
    return { success: true };
  }

  async verify2FA(token) {
    const formData = new URLSearchParams();
    formData.append('token', token);

    const response = await fetch(`${this.baseUrl}/verify-2fa`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: formData,
    });

    if (!response.ok) {
      throw new Error('Invalid 2FA code');
    }

    return { success: true };
  }

  // Tenant endpoints (will need API routes in Flask backend)
  async getTenants() {
    return this.request('/api/tenants');
  }

  async getTenant(tenantId) {
    return this.request(`/api/tenants/${tenantId}`);
  }

  async addTenant(tenantData) {
    return this.request('/api/tenants', {
      method: 'POST',
      body: JSON.stringify(tenantData),
    });
  }

  async addPayment(taymentData) {
    return this.request('/api/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });
  }

  // Dashboard stats
  async getDashboard() {
    return this.request('/api/dashboard');
  }
}

export default new ApiClient();
