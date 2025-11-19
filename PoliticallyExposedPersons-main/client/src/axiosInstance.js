// src/axiosInstance.js
import axios from 'axios';

// Determine if we're in production based on the hostname
const isProduction = window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1';

// Set the base URL based on environment
export const baseURL = isProduction 
  ? '/api'  // Use relative URL in production since frontend and backend are on same domain
  : 'http://localhost:5000/api';

console.log(`API: Using ${isProduction ? 'Production' : 'Development'} URL:`, baseURL);

// Create an Axios instance
const axiosInstance = axios.create({
  baseURL: baseURL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add a request interceptor to attach the token
axiosInstance.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

axiosInstance.interceptors.response.use(
  response => response,
  error => {
    if (error.response?.status === 401) {
      // Token expired or unauthorized
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/'; // Redirect to login
    }
    return Promise.reject(error);
  }
);

export default axiosInstance;
