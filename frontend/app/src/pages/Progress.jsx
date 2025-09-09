import { useState } from "react";

const API = import.meta.env.VITE_API_BASE;

export default function Progress() {
  const [userId, setUserId] = useState("");
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadProgress() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/progress/${userId}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProgress(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">Progress Tracking</h2>
      <div className="flex items-center gap-3 mb-4">
        <input
          className="border rounded px-3 py-2"
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <button
          onClick={loadProgress}
          disabled={!userId || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Loading..." : "Load Progress"}
        </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {progress && (
        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Overall Progress</h3>
            <div className="text-4xl font-bold">
              {progress.overall_percentage}%
            </div>
            <div className="text-blue-100">Complete</div>
          </div>

          {/* Materials Progress */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Materials Progress</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-2xl font-bold text-blue-600">
                {progress.materials.percentage}%
              </div>
              <div className="text-gray-600">
                {progress.materials.completed} of {progress.materials.total}{" "}
                materials completed
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.materials.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Quizzes Progress */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Quizzes Progress</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-2xl font-bold text-green-600">
                {progress.quizzes.percentage}%
              </div>
              <div className="text-gray-600">
                {progress.quizzes.completed} of {progress.quizzes.total} quizzes
                completed
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.quizzes.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Detailed Progress Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Materials Details */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Materials Status</h4>
              <div className="space-y-2 text-sm">
                {progress.materials.progress.length > 0 ? (
                  progress.materials.progress.map((m) => (
                    <div
                      key={m.id}
                      className="flex justify-between items-center"
                    >
                      <span className="text-gray-700">
                        {m.material_id?.slice(0, 8)}...
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          m.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : m.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">
                    No materials progress recorded
                  </div>
                )}
              </div>
            </div>

            {/* Quiz Results */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Recent Quiz Results</h4>
              <div className="space-y-2 text-sm">
                {progress.quizzes.results.length > 0 ? (
                  progress.quizzes.results.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between items-center"
                    >
                      <span className="text-gray-700">
                        {r.quiz_id?.slice(0, 8)}...
                      </span>
                      <span className="text-gray-600">
                        {r.score}/{r.total}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No quiz results yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
