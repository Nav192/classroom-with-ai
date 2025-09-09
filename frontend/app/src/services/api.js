import axios from 'axios';

const api = axios.create({
  baseURL: 'http://127.0.0.1:8000/api', // URL base untuk API backend Anda
});

// Interceptor untuk menambahkan token otentikasi ke setiap request
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('access_token');
    if (token) {
      config.headers['Authorization'] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Interceptor untuk menangani jika token tidak valid/expired (error 401)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // Hapus data sesi dari local storage
      localStorage.removeItem('access_token');
      localStorage.removeItem('user_id');
      localStorage.removeItem('user_role');
      // Arahkan pengguna kembali ke halaman login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export default api;
