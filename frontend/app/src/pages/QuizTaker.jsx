import { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from "../services/api";
import { formatDistanceToNowStrict } from 'date-fns'; // For timer display

export default function QuizTaker() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [submissionMessage, setSubmissionMessage] = useState('');
  const [blurred, setBlurred] = useState(false); // Anti-cheat flag

  // Anti-cheat: detect tab switch
  useEffect(() => {
    const handleBlur = () => setBlurred(true);
    window.addEventListener('blur', handleBlur);
    return () => window.removeEventListener('blur', handleBlur);
  }, []);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/quizzes/${quizId}`);
        setQuiz(response.data);
        setStartedAt(new Date()); // Record start time
        setTimeLeft(response.data.duration_minutes * 60); // Convert minutes to seconds
      } catch (err) {
        setError(err.response?.data?.detail || 'Gagal memuat kuis.');
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0 || endedAt) return;

    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
        if (prevTime <= 1) {
          clearInterval(timer);
          handleSubmit(true); // Auto-submit when time runs out
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, endedAt]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = async (isAutoSubmit = false) => {
    if (endedAt) return; // Prevent multiple submissions

    const now = new Date();
    setEndedAt(now); // Record end time

    const payload = {
      quiz_id: quiz.id,
      answers: quiz.questions.map(q => ({
        question_id: q.id,
        response: answers[q.id] || '',
      })),
      started_at: startedAt.toISOString(),
      ended_at: now.toISOString(),
    };

    try {
      const response = await api.post('/results/submit', payload);
      setSubmissionMessage(`Kuis berhasil disubmit! Skor Anda: ${response.data.score}/${response.data.total}. ${blurred ? '(Deteksi perpindahan tab)' : ''}`);
    } catch (err) {
      setSubmissionMessage(err.response?.data?.detail || 'Gagal submit kuis.');
      console.error(err);
    } finally {
      // No need to set loading to false here, as the quiz is ended
    }
  };

  if (loading) return <div className="p-6">Memuat kuis...</div>;
  if (error) return <div className="p-6 text-red-600">{error}</div>;
  if (!quiz) return <div className="p-6">Kuis tidak ditemukan.</div>;

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-md">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">{quiz.topic}</h1>
        <p className="text-gray-600 mb-2">Kelas: {quiz.class_id} | Tipe: {quiz.type}</p>
        <p className="text-gray-600 mb-4">Durasi: {quiz.duration_minutes} menit</p>

        <div className="flex justify-between items-center mb-6 p-3 bg-indigo-50 rounded-md">
          <span className="text-lg font-semibold text-indigo-800">Waktu Tersisa: {formatTime(timeLeft)}</span>
          {blurred && <span className="text-red-600 font-medium">Deteksi Perpindahan Tab!</span>}
        </div>

        {submissionMessage && (
          <div className={`p-4 mb-4 rounded-md ${submissionMessage.includes('berhasil') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {submissionMessage}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
          {quiz.questions.map((q, index) => (
            <div key={q.id} className="border p-4 rounded-lg shadow-sm">
              <p className="font-medium text-gray-800 mb-3">{index + 1}. {q.text}</p>
              
              {quiz.type === 'mcq' && (
                <div className="space-y-2">
                  {q.options.map((option, optIndex) => (
                    <label key={optIndex} className="flex items-center gap-2 text-gray-700">
                      <input
                        type="radio"
                        name={`question-${q.id}`}
                        value={option}
                        onChange={() => handleAnswerChange(q.id, option)}
                        checked={answers[q.id] === option}
                        disabled={!!endedAt}
                        className="form-radio text-indigo-600"
                      />
                      <span>{option}</span>
                    </label>
                  ))}
                </div>
              )}

              {quiz.type === 'true_false' && (
                <div className="space-x-4">
                  <label className="inline-flex items-center gap-2 text-gray-700">
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      value="True"
                      onChange={() => handleAnswerChange(q.id, "True")}
                      checked={answers[q.id] === "True"}
                      disabled={!!endedAt}
                      className="form-radio text-indigo-600"
                    />
                    <span>Benar</span>
                  </label>
                  <label className="inline-flex items-center gap-2 text-gray-700">
                    <input
                      type="radio"
                      name={`question-${q.id}`}
                      value="False"
                      onChange={() => handleAnswerChange(q.id, "False")}
                      checked={answers[q.id] === "False"}
                      disabled={!!endedAt}
                      className="form-radio text-indigo-600"
                    />
                    <span>Salah</span>
                  </label>
                </div>
              )}

              {quiz.type === 'essay' && (
                <textarea
                  value={answers[q.id] || ''}
                  onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                  placeholder="Tulis jawaban Anda di sini..."
                  rows="4"
                  disabled={!!endedAt}
                  className="w-full p-2 border rounded-md focus:ring-indigo-500 focus:border-indigo-500"
                ></textarea>
              )}
            </div>
          ))}

          <div className="flex justify-end gap-4">
            <button
              type="button"
              onClick={() => navigate('/student/dashboard')}
              className="bg-gray-300 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-400 transition"
              disabled={!!endedAt}
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 transition disabled:bg-indigo-300"
              disabled={!!endedAt}
            >
              Submit Kuis
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
