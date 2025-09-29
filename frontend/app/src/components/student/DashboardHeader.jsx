import { useState } from "react";
import { LogIn } from "lucide-react";
import api from "../../services/api";

// Header Component
export default function DashboardHeader({ username, onClassJoined }) {
  const [joinCode, setJoinCode] = useState("");
  const [isJoining, setIsJoining] = useState(false);
  const [joinError, setJoinError] = useState("");

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode) return setJoinError("Please enter a class code.");
    setIsJoining(true);
    setJoinError("");
    try {
      await api.post("/classes/join", { class_code: joinCode });
      setJoinCode("");
      onClassJoined(); // Callback to refresh class list
    } catch (err) {
      setJoinError(err.response?.data?.detail || "Failed to join class.");
    } finally {
      setIsJoining(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Student Dashboard</h1>
        <p className="text-gray-500">Welcome back, {username}!</p>
      </div>
      <div className="flex flex-col md:flex-row items-start md:items-center gap-4 w-full md:w-auto">
        <form onSubmit={handleJoinClass} className="flex items-center gap-2 w-full md:w-auto">
          <input
            type="text"
            value={joinCode}
            onChange={(e) => setJoinCode(e.target.value)}
            placeholder="Enter Class Code"
            className="w-full md:w-48 px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="submit"
            disabled={isJoining}
            className="py-2 px-4 text-sm font-semibold text-white bg-blue-600 rounded-md hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:bg-blue-400"
          >
            <LogIn size={16} />
            {isJoining ? "Joining..." : "Join"}
          </button>
        </form>
      </div>
      {joinError && <p className="text-sm text-red-500 mt-2 text-right w-full">{joinError}</p>}
    </div>
  );
}
