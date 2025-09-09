import React from 'react';
import { X } from 'lucide-react';

export default function StudentProgressModal({ isOpen, onClose, progress }) {
  if (!isOpen || !progress) return null;

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50 p-4">
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-xl w-full max-w-3xl relative border border-border">
        <button onClick={onClose} className="absolute top-3 right-3 text-muted-foreground hover:text-foreground">
          <X size={24} />
        </button>
        <h2 className="text-2xl font-bold mb-4">Student Progress: {progress.user_id.slice(0, 8)}...</h2>

        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="bg-gradient-to-r from-primary to-blue-500 text-primary-foreground p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Overall Progress</h3>
            <div className="text-4xl font-bold">
              {progress.overall_percentage}%
            </div>
            <div className="opacity-80">Completed</div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Materials Progress */}
            <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Materials Progress</h3>
                <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-primary">{progress.materials.percentage}%</div>
                    <div className="text-sm text-muted-foreground">{progress.materials.completed} of {progress.materials.total} completed</div>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 mt-4">
                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress.materials.percentage}%` }}></div>
                </div>
                <h4 className="font-medium mt-4 mb-2">Material Details:</h4>
                <ul className="space-y-2 text-sm max-h-40 overflow-y-auto">
                    {progress.materials.progress.length > 0 ? (
                    progress.materials.progress.map((m) => (
                        <li key={m.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                        <span className="text-muted-foreground">Material ID: {m.material_id.slice(0, 8)}...</span>
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
                    <li className="text-muted-foreground">No material progress recorded.</li>
                    )}
                </ul>
            </div>

            {/* Quizzes Progress */}
            <div className="border rounded-lg p-4">
                <h3 className="font-semibold mb-2">Quizzes Progress</h3>
                <div className="flex items-center gap-4">
                    <div className="text-3xl font-bold text-green-600">{progress.quizzes.percentage}%</div>
                    <div className="text-sm text-muted-foreground">{progress.quizzes.completed} of {progress.quizzes.total} completed</div>
                </div>
                <div className="w-full bg-muted rounded-full h-2.5 mt-4">
                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${progress.quizzes.percentage}%` }}></div>
                </div>
                <h4 className="font-medium mt-4 mb-2">Recent Quiz Results:</h4>
                <ul className="space-y-2 text-sm max-h-40 overflow-y-auto">
                    {progress.quizzes.results.length > 0 ? (
                    progress.quizzes.results.map((r) => (
                        <li key={r.id} className="flex justify-between items-center p-2 bg-muted/50 rounded-md">
                        <span className="text-muted-foreground">Quiz ID: {r.quiz_id.slice(0, 8)}...</span>
                        <span className="font-semibold">Score: {r.score}/{r.total}</span>
                        </li>
                    ))
                    ) : (
                    <li className="text-muted-foreground">No quiz results recorded.</li>
                    )}
                </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
