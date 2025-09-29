import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { PlayCircle } from "lucide-react";
import api from "../../services/api";

// Quizzes Tab Component
export default function QuizzesTab({ classId }) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/quizzes/${classId}`)
      .then(res => setQuizzes(res.data || []))
      .catch(() => setError("Failed to load quizzes."))
      .finally(() => setLoading(false));
  }, [classId]);

  const handleOpenQuiz = (quizId) => {
    navigate(`/student/quiz/${quizId}`);
  };

  const getQuizAvailability = (quiz) => {
    if (!quiz.is_active) {
      return { text: 'Inactive', disabled: true, style: 'bg-gray-400 text-white cursor-not-allowed' };
    }
    const now = new Date();
    const from = quiz.available_from ? new Date(quiz.available_from) : null;
    const until = quiz.available_until ? new Date(quiz.available_until) : null;

    if (from && now < from) {
      return { text: `Starts ${from.toLocaleString()}`, disabled: true, style: 'bg-yellow-500 text-white cursor-not-allowed' };
    }
    if (until && now > until) {
      return { text: 'Expired', disabled: true, style: 'bg-red-500 text-white cursor-not-allowed' };
    }
    return { text: 'Open Quiz', disabled: false, style: 'bg-blue-600 text-white hover:bg-blue-700' };
  };

  if (loading) return <p>Loading quizzes...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Available Quizzes</h2>
      {quizzes.length > 0 ? (
        <ul className="space-y-3">
          {quizzes.map(quiz => {
            const availability = getQuizAvailability(quiz);
            return (
              <li
                key={quiz.id}
                className={`p-4 rounded-lg flex justify-between items-center transition-colors ${availability.disabled ? 'bg-gray-100 opacity-70' : 'bg-gray-50'}`}>
                <div>
                  <p className="font-semibold text-gray-800">{quiz.topic}</p>
                  <p className="text-sm text-gray-500">Type: {quiz.type}</p>
                  {(quiz.available_from || quiz.available_until) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {quiz.available_from && <span>From: {new Date(quiz.available_from).toLocaleString()}</span>}
                      {quiz.available_from && quiz.available_until && <br />}
                      {quiz.available_until && <span>Until: {new Date(quiz.available_until).toLocaleString()}</span>}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {availability.disabled ? (
                    <div className={`py-2 px-4 rounded-full flex items-center gap-2 text-sm ${availability.style}`}>
                      <span>{availability.text}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenQuiz(quiz.id)}
                      className={`py-2 px-4 rounded-full flex items-center gap-2 transition-colors text-sm ${availability.style}`}
                    >
                      <PlayCircle size={18} />
                      <span>{availability.text}</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-gray-500 text-center py-10">No quizzes available in this class yet.</p>}
    </div>
  );
}
