const rawBase = (import.meta.env.VITE_API_URL || '').replace(/\/+$/, '');

interface RequestOptions {
  headers?: Record<string, string>;
  body?: any;
  params?: Record<string, any>;
}

async function request(method: string, endpoint: string, options?: RequestOptions) {
  // Normalize endpoint
  const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
  
  let url = '';
  if (rawBase) {
    if (rawBase.endsWith('/api') && cleanEndpoint.startsWith('/api/')) {
      url = `${rawBase}${cleanEndpoint.slice(4)}`;
    } else {
      url = `${rawBase}${cleanEndpoint}`;
    }
  } else {
    url = cleanEndpoint;
  }

  // Final safety check: remove accidental duplicate /api/api
  url = url.replace('/api/api/', '/api/');
  
  // Add query params if provided
  if (options?.params) {
    const queryString = new URLSearchParams();
    Object.entries(options.params).forEach(([key, value]) => {
      if (value !== null && value !== undefined) {
        queryString.append(key, String(value));
      }
    });
    if (queryString.toString()) {
      url += `?${queryString.toString()}`;
    }
  }

  const headers = {
    'Content-Type': 'application/json',
    ...options?.headers,
  };

  const config: RequestInit = {
    method,
    headers,
  };

  if (options?.body) {
    config.body = JSON.stringify(options.body);
  }

  const response = await fetch(url, config);

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Unknown error' }));
    throw new Error(error.message || `HTTP error! status: ${response.status}`);
  }

  return response.json();
}

const api = {
  get: (endpoint: string, options?: RequestOptions) => request('GET', endpoint, options),
  post: (endpoint: string, body?: any, options?: RequestOptions) =>
    request('POST', endpoint, { ...options, body }),
  put: (endpoint: string, body?: any, options?: RequestOptions) =>
    request('PUT', endpoint, { ...options, body }),
  delete: (endpoint: string, options?: RequestOptions) => request('DELETE', endpoint, options),
};

export default api;
