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
      localStorage.removeItem('role');
      // Arahkan pengguna kembali ke halaman login
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

export const getOverallStudentAverages = (classId) => api.get(`/dashboard/teacher/class/${classId}/overall_student_averages`);

export const fetchStudentQuizzes = (userId) => api.get(`/student/${userId}/quizzes`);
export const fetchStudentQuizResults = () => api.get(`/results/history`);
export const fetchStudentProgress = (userId) => api.get(`/student/${userId}/progress`);

export const leaveClass = (classId) => api.delete(`/classes/${classId}/leave`);

// Function to invoke the Supabase Edge Function for AI quiz generation
export const generateQuizFromMaterial = async (payload) => {
  const { material_id, question_type, num_questions } = payload;
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
  const functionUrl = `${supabaseUrl}/functions/v1/generate-quiz`;
  const token = localStorage.getItem('access_token');

  const response = await fetch(functionUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`,
    },
    body: JSON.stringify({ material_id, question_type, num_questions }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(errorData.error || 'Failed to generate quiz with AI.');
  }

  return response.json();
};

export default api;
