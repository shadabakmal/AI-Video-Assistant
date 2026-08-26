import axios from 'axios';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const api = axios.create({
  baseURL: API_BASE,
});

// Interceptor to inject JWT token in every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Authentication APIs
export const registerUser = async (email, password) => {
  const res = await api.post('/api/auth/register', { email, password });
  return res.data;
};

export const loginUser = async (email, password) => {
  const formData = new FormData();
  formData.append('username', email);
  formData.append('password', password);
  const res = await api.post('/api/auth/login', formData);
  return res.data;
};

export const getCurrentUser = async () => {
  const res = await api.get('/api/auth/me');
  return res.data;
};

// Media Processing APIs
export const processMedia = async (mediaUrl, mediaType, language = 'english') => {
  const res = await api.post('/api/media/process', { mediaUrl, mediaType, language });
  return res.data;
};

export const getUserMediaList = async () => {
  const res = await api.get('/api/media/user/list');
  return res.data;
};

export const getMediaDetail = async (mediaId) => {
  const res = await api.get(`/api/media/${mediaId}`);
  return res.data;
};

// Chat & Q&A APIs (Grok RAG)
export const askGrokQuestion = async (media_content_id, question) => {
  const res = await api.post('/api/chat/ask', { media_content_id, question });
  return res.data;
};

export const getChatHistory = async (media_content_id) => {
  const res = await api.get(`/api/chat/history/${media_content_id}`);
  return res.data;
};

export default api;
