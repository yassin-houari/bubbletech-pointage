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
    const token = localStorage.getItem('token') || sessionStorage.getItem('pointage_token');
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
      const hasFullSession = !!localStorage.getItem('token');
      if (hasFullSession) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
      sessionStorage.removeItem('pointage_token');
      sessionStorage.removeItem('pointage_user');
    }
    return Promise.reject(error);
  }
);

// Services d'authentification
export const authService = {
  login: (email, password) => 
    api.post('/auth/login', { email, password }),

  pointageDirectLogin: (code_secret) =>
    api.post('/auth/pointage-direct', { code_secret }),
  
  loginWithCode: (code_secret) => 
    api.post('/auth/login-code', { code_secret }),
  
  requestPasswordReset: (email) => 
    api.post('/auth/request-password-reset', { email }),
  
  changePassword: (oldPassword, newPassword) => 
    api.post('/auth/change-password', { oldPassword, newPassword }),

  changeSecretCode: (oldCode, newCode) =>
    api.post('/auth/change-secret-code', { oldCode, newCode }),
  
  getProfile: () => 
    api.get('/auth/profile')
};

// Services utilisateurs
export const userService = {
  getAll: (params) => 
    api.get('/users', { params }),

  getManagerTeamMembers: () =>
    api.get('/users/manager/team-members'),

  getManagerAssignableUsers: () =>
    api.get('/users/manager/assignable-users'),

  addManagerTeamMember: (membre_id) =>
    api.post('/users/manager/team-members', { membre_id }),

  removeManagerTeamMember: (memberId) =>
    api.delete(`/users/manager/team-members/${memberId}`),
  
  getById: (id) => 
    api.get(`/users/${id}`),
  
  create: (userData) => 
    api.post('/users', userData),
  
  update: (id, userData) => 
    api.put(`/users/${id}`, userData),
  
  delete: (id) => 
    api.delete(`/users/${id}`)
};

export const departementService = {
  getAll: () =>
    api.get('/departements'),
  create: (data) =>
    api.post('/departements', data)
};

export const posteService = {
  getAll: () =>
    api.get('/postes'),
  create: (data) =>
    api.post('/postes', data)
};

// Services de pointage
export const pointageService = {
  checkIn: () => 
    api.post('/pointages/checkin'),
  
  checkOut: () => 
    api.post('/pointages/checkout'),
  
  getAll: (params) => 
    api.get('/pointages', { params }),
  
  getStats: (params) => 
    api.get('/pointages/stats', { params })
};

export default api;
