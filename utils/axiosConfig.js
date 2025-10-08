import axios from 'axios';

const isDevelopment = process.env.NODE_ENV === 'development';

const baseURL = isDevelopment 
  ? 'https://calculator.qodeinvest.com'
  : 'https://example.com';

const app = axios.create({
  baseURL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
  // Ensure cookies are included in requests
  credentials: 'include'
});

// Add request interceptor to handle file uploads
app.interceptors.request.use((config) => {
  if (config.data instanceof FormData) {
    config.headers['Content-Type'] = 'multipart/form-data';
  }
  return config;
});

// Response interceptor remains the same
app.interceptors.response.use(
  (response) => response,
  (error) => {
    return Promise.reject(error);
  }
);

export default app;