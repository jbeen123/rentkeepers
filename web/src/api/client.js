const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000';

async function apiClient(endpoint, options = {}) {
  const url = `${API_URL}${endpoint}`;
  
  const config = {
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
    credentials: 'include',
    ...options,
  };

  if (options.body && typeof options.body === 'object') {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);
  
  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'An error occurred' }));
    throw new Error(error.message || `HTTP ${response.status}`);
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

export const api = {
  get: (endpoint) => apiClient(endpoint, { method: 'GET' }),
  post: (endpoint, body) => apiClient(endpoint, { method: 'POST', body }),
  put: (endpoint, body) => apiClient(endpoint, { method: 'PUT', body }),
  delete: (endpoint) => apiClient(endpoint, { method: 'DELETE' }),
};

export default apiClient;