import { useState } from "react";
import api from "../services/api";

// Create Class Modal (extracted component)
export default function CreateClassModal({ setIsModalOpen, onClassCreated }) {
  const [className, setClassName] = useState("");
  const [grade, setGrade] = useState("10");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setError("");
    try {
      console.log("Sending class data:", { class_name: className, grade: grade }); // Debug log
      await api.post("/classes", { class_name: className, grade: grade });
      onClassCreated();
    } catch (err) {
      console.error("Error creating class:", err.response?.data || err.message);
      setError(err.response?.data?.detail || err.message || "Failed to create class.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Create New Class</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
            <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g., Grade 10 Mathematics" className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="10">10</option>
              <option value="11">11</option>
              <option value="12">12</option>
            </select>
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="py-2 px-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isCreating} className="py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400">
              {isCreating ? "Creating..." : "Create Class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}