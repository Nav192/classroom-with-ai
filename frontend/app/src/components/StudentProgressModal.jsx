import React from 'react';
import { X } from 'lucide-react';

export default function StudentProgressModal({ isOpen, onClose, progress }) {
  if (!isOpen || !progress) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-3xl relative">
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-500 hover:text-gray-800">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Progres Belajar Siswa: {progress.user_id.slice(0, 8)}...</h2>

        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Progres Keseluruhan</h3>
            <div className="text-4xl font-bold">
              {progress.overall_percentage}%
            </div>
            <div className="text-blue-100">Selesai</div>
          </div>

          {/* Materials Progress */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Progres Materi</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-2xl font-bold text-blue-600">
                {progress.materials.percentage}%
              </div>
              <div className="text-gray-600">
                {progress.materials.completed} dari {progress.materials.total} materi selesai
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.materials.percentage}%` }}
              ></div>
            </div>
            <h4 className="font-medium mt-4 mb-2">Detail Materi:</h4>
            <ul className="space-y-2 text-sm max-h-40 overflow-y-auto">
              {progress.materials.progress.length > 0 ? (
                progress.materials.progress.map((m) => (
                  <li key={m.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                    <span className="text-gray-700">Materi ID: {m.material_id.slice(0, 8)}...</span>
                    <span
                      className={`px-2 py-1 rounded text-xs font-semibold ${
                        m.status === "completed" ? "bg-green-100 text-green-800" :
                        m.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                        "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {m.status}
                    </span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">Belum ada progres materi tercatat.</li>
              )}
            </ul>
          </div>

          {/* Quizzes Progress */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Progres Kuis</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-2xl font-bold text-green-600">
                {progress.quizzes.percentage}%
              </div>
              <div className="text-gray-600">
                {progress.quizzes.completed} dari {progress.quizzes.total} kuis selesai
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.quizzes.percentage}%` }}
              ></div>
            </div>
            <h4 className="font-medium mt-4 mb-2">Hasil Kuis Terbaru:</h4>
            <ul className="space-y-2 text-sm max-h-40 overflow-y-auto">
              {progress.quizzes.results.length > 0 ? (
                progress.quizzes.results.map((r) => (
                  <li key={r.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                    <span className="text-gray-700">Kuis ID: {r.quiz_id.slice(0, 8)}...</span>
                    <span className="text-gray-600">Skor: {r.score}/{r.total}</span>
                  </li>
                ))
              ) : (
                <li className="text-gray-500">Belum ada hasil kuis tercatat.</li>
              )}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
