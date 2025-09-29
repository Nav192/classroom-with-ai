import { useState, useEffect } from "react";
import api from "../../services/api";

// Overview Tab Component
export default function OverviewTab({ classId }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/progress/my/${classId}`)
      .then(res => setProgress(res.data))
      .catch(() => setError("Failed to load progress."))
      .finally(() => setLoading(false));
  }, [classId]);

  if (loading) return <p>Loading overview...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!progress) return <p>No progress data available.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="font-semibold text-lg mb-4">Materials Progress</h3>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-blue-600">{progress.materials_progress_percentage}%</span>
          <span className="text-sm text-gray-500">{progress.materials_completed} of {progress.total_materials} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress.materials_progress_percentage}%` }}></div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="font-semibold text-lg mb-4">Quizzes Progress</h3>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-green-600">{progress.quizzes_progress_percentage}%</span>
          <span className="text-sm text-gray-500">{progress.quizzes_attempted} of {progress.total_quizzes} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
          <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${progress.quizzes_progress_percentage}%` }}></div>
        </div>
        <h3 className="font-semibold text-lg mt-6 mb-4">Overall Weighted Quiz Score</h3>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-purple-600">{progress.weighted_average_quiz_score}%</span>
          <span className="text-sm text-gray-500">Based on quiz weights</span>
        </div>
      </div>
    </div>
  );
}
