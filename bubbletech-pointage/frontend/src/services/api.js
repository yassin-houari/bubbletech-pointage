import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Créer une instance axios
const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json'
  }
});

// Intercepteur pour ajouter le token à chaque requête
api.interceptors.request.use(
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

// Intercepteur pour gérer les erreurs de réponse
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expiré ou invalide
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// Services d'authentification
export const authService = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),
  
  loginWithCode: (code_secret) => 
    api.post('/auth/login-code', { code_secret }),
  
  requestPasswordReset: (email) => 
    api.post('/auth/request-password-reset', { email }),
  
  changePassword: (oldPassword, newPassword) => 
    api.post('/auth/change-password', { oldPassword, newPassword }),
  
  getProfile: () => 
    api.get('/auth/profile')
};

// Services utilisateurs
export const userService = {
  getAll: (params) => 
    api.get('/users', { params }),
  
  getById: (id) => 
    api.get(`/users/${id}`),
  
  create: (userData) => 
    api.post('/users', userData),
  
  update: (id, userData) => 
    api.put(`/users/${id}`, userData),
  
  delete: (id) => 
    api.delete(`/users/${id}`)
};

// Services de pointage
export const pointageService = {
  checkIn: (user_id) => 
    api.post('/pointages/checkin', { user_id }),
  
  checkOut: (user_id) => 
    api.post('/pointages/checkout', { user_id }),
  
  startBreak: () => 
    api.post('/pointages/break/start'),
  
  endBreak: () => 
    api.post('/pointages/break/end'),
  
  getAll: (params) => 
    api.get('/pointages', { params }),
  
  getStats: (params) => 
    api.get('/pointages/stats', { params })
};

export default api;
