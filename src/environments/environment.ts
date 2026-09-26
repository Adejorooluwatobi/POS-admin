const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');

export const environment = {
  production: false,
  apiUrl: isLocalhost ? 'http://localhost:5041/api' : 'https://pos-saas-l4i1.onrender.com/api'
};

