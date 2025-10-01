import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import api from '../../services/api';
import { Plus, Pencil, Trash2, Copy } from 'lucide-react';
function QuizzesTab({ classId }) {
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [error, setError] = useState("");

  const fetchQuizzes = () => {
    setLoadingQuizzes(true);
    setError("");
    api
      .get(`/quizzes/${classId}?teacher_view=true`)
      .then((res) => setQuizzes(res.data || []))
      .catch(() => setError("Failed to load quizzes."))
      .finally(() => setLoadingQuizzes(false));
  };

  useEffect(fetchQuizzes, [classId]);

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold">Class Quizzes</h2>
        <div className="flex items-center gap-2">
          <Link
            to={`/teacher/quiz/new?classId=${classId}`}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm"
          >
            <Plus size={16} /> Create Quiz
          </Link>
        </div>
      </div>

      {loadingQuizzes ? (
        <p>Loading quizzes...</p>
      ) : quizzes.length > 0 ? (
        <div className="space-y-4">
          {quizzes.map((quiz) => (
            <QuizCard
              key={quiz.id}
              quiz={quiz}
              classId={classId}
              fetchQuizzes={fetchQuizzes}
              setError={setError}
            />
          ))}
        </div>
      ) : (
        <p className="text-gray-500 text-center py-10">
          No quizzes created for this class yet.
        </p>
      )}
      {error && (
        <p className="text-red-500 text-sm mt-4 text-center">{error}</p>
      )}
    </div>
  );
}

function QuizCard({ quiz, classId, fetchQuizzes, setError }) {
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isActive, setIsActive] = useState(quiz.is_active);

  const toLocalISOString = (dateString) => {
    if (!dateString) return "";
    const date = new Date(dateString);
    const timezoneOffset = date.getTimezoneOffset() * 60000;
    const localDate = new Date(date.getTime() - timezoneOffset);
    return localDate.toISOString().slice(0, 16);
  };

  const [availableFrom, setAvailableFrom] = useState(
    toLocalISOString(quiz.available_from)
  );
  const [availableFromSec, setAvailableFromSec] = useState(
    quiz.available_from
      ? new Date(quiz.available_from).getSeconds().toString().padStart(2, "0")
      : "00"
  );
  const [availableUntil, setAvailableUntil] = useState(
    toLocalISOString(quiz.available_until)
  );
  const [availableUntilSec, setAvailableUntilSec] = useState(
    quiz.available_until
      ? new Date(quiz.available_until).getSeconds().toString().padStart(2, "0")
      : "00"
  );
  const [isSaving, setIsSaving] = useState(false);

  const handleToggleActive = async (newIsActive) => {
    setIsActive(newIsActive);
    try {
      await api.patch(`/quizzes/${quiz.id}/settings`, {
        is_active: newIsActive,
      });
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update quiz status.");
      setIsActive(!newIsActive);
    }
  };

  const handleSaveSettings = async () => {
    setIsSaving(true);
    setError("");
    try {
      const fromDate = availableFrom ? new Date(availableFrom) : null;
      if (fromDate) {
        fromDate.setSeconds(parseInt(availableFromSec, 10) || 0);
      }

      const untilDate = availableUntil ? new Date(availableUntil) : null;
      if (untilDate) {
        untilDate.setSeconds(parseInt(availableUntilSec, 10) || 0);
      }

      await api.patch(`/quizzes/${quiz.id}/settings`, {
        available_from: fromDate ? fromDate.toISOString() : null,
        available_until: untilDate ? untilDate.toISOString() : null,
      });
      setIsSettingsOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to save schedule.");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDeleteQuiz = async () => {
    if (
      window.confirm(
        "Are you sure you want to delete this quiz? This action cannot be undone."
      )
    ) {
      try {
        await api.delete(`/quizzes/${quiz.id}`);
        fetchQuizzes();
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to delete quiz.");
      }
    }
  };

  const handleDuplicateQuiz = async () => {
    if (window.confirm("Are you sure you want to duplicate this quiz?")) {
      try {
        await api.post(`/quizzes/${quiz.id}/duplicate`);
        fetchQuizzes();
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to duplicate quiz.");
      }
    }
  };

  return (
    <div className="p-4 rounded-lg bg-gray-50 border border-gray-200 transition-shadow hover:shadow-sm">
      {/* Main Info Bar */}
      <div className="flex flex-wrap justify-between items-center gap-4">
        <div>
          <p className="font-semibold text-gray-800">{quiz.topic}</p>
          <p className="text-sm text-gray-500">Type: {quiz.type}</p>
          <p className="text-xs text-gray-500 mt-1">
            Created: {new Date(quiz.created_at).toLocaleString()}
          </p>
          <p className="text-sm text-gray-600">
            Students Taken: {quiz.students_taken} /{" "}
            {quiz.students_taken + quiz.students_not_taken}
          </p>
        </div>
        <div className="flex items-center gap-4">
          <div className="text-center">
            <p className="font-bold text-lg text-green-600">
              {quiz.students_taken}
            </p>
            <p className="text-xs text-gray-500">Taken</p>
          </div>
          <div className="text-center">
            <p className="font-bold text-lg text-red-600">
              {quiz.students_not_taken}
            </p>
            <p className="text-xs text-gray-500">Not Taken</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Link
            to={`/teacher/class/${classId}/quiz/${quiz.id}/submissions`}
            className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 text-sm font-medium"
          >
            View Details
          </Link>
          <Link
            to={`/teacher/quiz/edit/${quiz.id}`}
            className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
            title="Edit Quiz"
          >
            <Pencil size={18} />
          </Link>
          <button
            onClick={handleDuplicateQuiz}
            className="p-2 text-gray-500 hover:text-green-600 transition-colors"
            title="Duplicate Quiz"
          >
            <Copy size={18} />
          </button>
          <button
            onClick={handleDeleteQuiz}
            className="p-2 text-gray-500 hover:text-red-600 transition-colors"
            title="Delete Quiz"
          >
            <Trash2 size={18} />
          </button>
        </div>
        <div className="flex items-center">
          <label className="relative inline-flex items-center cursor-pointer">
            <input
              type="checkbox"
              checked={isActive}
              onChange={(e) => handleToggleActive(e.target.checked)}
              className="sr-only peer"
            />
            <div className="w-11 h-6 bg-gray-200 rounded-full peer peer-focus:ring-2 peer-focus:ring-blue-300 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-green-600"></div>
            <span className="ml-3 text-sm font-medium text-gray-600">
              {isActive ? "Active" : "Inactive"}
            </span>
          </label>
        </div>
      </div>
    </div>
  );
}

export default QuizzesTab;
