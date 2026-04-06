import axios from 'axios';
import toast from 'react-hot-toast';

const API_URL = import.meta.env.VITE_API_URL || '/api';

const api = axios.create({ baseURL: API_URL, timeout: 30000, withCredentials: true });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('ss_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
}, (err) => Promise.reject(err));

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const msg = err.response?.data?.message || err.message || 'Something went wrong';
    if (err.response?.status === 401) { localStorage.removeItem('ss_token'); localStorage.removeItem('ss_user'); }
    else if (err.response?.status === 429) toast.error('Too many requests.');
    else if (err.response?.status >= 500) toast.error('Server error. Try again later.');
    return Promise.reject({ message: msg, status: err.response?.status });
  }
);

export const authAPI = {
  register: (d) => api.post('/auth/register', d),
  loginEmail: (d) => api.post('/auth/login', d),
  requestOTP: (d) => api.post('/auth/otp/request', d),
  verifyOTP: (d) => api.post('/auth/otp/verify', d),
  loginGovId: (d) => api.post('/auth/govid', d),
  googleCallback: (d) => api.post('/auth/google', d),
  getMe: () => api.get('/auth/me'),
  updateProfile: (d) => api.put('/auth/profile', d),
  logout: () => api.post('/auth/logout'),
  forgotPassword: (d) => api.post('/auth/forgot-password', d),
};

export const issuesAPI = {
  getAll: (p) => api.get('/issues', { params: p }),
  getById: (id) => api.get(`/issues/${id}`),
  create: (fd) => api.post('/issues', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updateStatus: (id, d) => api.patch(`/issues/${id}/status`, d),
  vote: (id) => api.post(`/issues/${id}/vote`),
  submitFeedback: (id, d) => api.post(`/issues/${id}/feedback`, d),
  take: (id) => api.post(`/issues/${id}/take`),
  delete: (id) => api.delete(`/issues/${id}`),
  getNearby: (p) => api.get('/issues/nearby', { params: p }),
  getByGovBody: (id, p) => api.get(`/issues/gov/${id}`, { params: p }),
};

export const commentsAPI = {
  get: (issueId, p) => api.get(`/issues/${issueId}/comments`, { params: p }),
  add: (issueId, d) => api.post(`/issues/${issueId}/comments`, d),
  delete: (id) => api.delete(`/issues/comments/${id}`),
  like: (id) => api.post(`/issues/comments/${id}/like`),
};

export const aiAPI = {
  classify: (d) => api.post('/ai/classify', d),
  translate: (d) => api.post('/ai/translate', d),
  summary: (p) => api.get('/ai/summary', { params: p }),
};

export const notifAPI = {
  getAll: (p) => api.get('/notifications', { params: p }),
  markRead: (ids) => api.patch('/notifications/read', { ids }),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const statsAPI = {
  global: () => api.get('/stats/global'),
  dashboard: () => api.get('/stats/dashboard'),
};

export const govAPI = {
  getAll: () => api.get('/government'),
  getNearby: (p) => api.get('/government/nearby', { params: p }),
  getStats: (id) => api.get(`/government/${id}/stats`),
};

export const uploadAPI = {
  image: (fd) => api.post('/upload/image', fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export const volunteerAPI = {
  getAvailable: (p) => api.get('/volunteers/available-issues', { params: p }),
  uploadProgress: (id, fd) => api.post(`/volunteers/${id}/progress`, fd, { headers: { 'Content-Type': 'multipart/form-data' } }),
};

export default api;
