import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

export default function ResultsPage() {
  const navigate = useNavigate();
  const [userId, setUserId] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [studentIdInput, setStudentIdInput] = useState("");
  const [fetchedStudentId, setFetchedStudentId] = useState(null);
  const [studentResults, setStudentResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("user_role");

    if (!storedUserId || storedUserRole !== "teacher") {
      navigate("/login"); // Redirect to login if not authenticated as teacher
    } else {
      setUserId(storedUserId);
      setUserRole(storedUserRole);
    }
  }, [navigate]);

  const handleFetchStudentResults = async () => {
    if (!studentIdInput) {
      setError("Please enter a student ID.");
      return;
    }

    setLoading(true);
    setError(null);
    setStudentResults([]);
    setFetchedStudentId(studentIdInput);

    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(
        `http://localhost:8000/api/results/history/${studentIdInput}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      setStudentResults(response.data);
    } catch (err) {
      console.error("Error fetching student results:", err);
      setError(
        "Failed to fetch results. Make sure the student ID is correct and you have permission."
      );
      setStudentResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handleExportToCSV = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.post(
        `http://localhost:8000/api/reports/results/export-to-storage`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );
      if (response.data && response.data.url) {
        window.open(response.data.url, "_blank");
      } else {
        setError("Failed to get CSV download URL.");
      }
    } catch (err) {
      console.error("Error exporting to CSV:", err);
      setError("Failed to export results to CSV. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!userId) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">Student Quiz Results</h2>
      <p>Welcome, Teacher {userId}!</p>
      <p>Your role: {userRole}</p>

      <div className="mt-6">
        <h3 className="text-lg font-semibold mb-3">
          View Student Quiz Results
        </h3>
        <input
          type="text"
          placeholder="Enter Student ID"
          value={studentIdInput}
          onChange={(e) => setStudentIdInput(e.target.value)}
          className="border p-2 rounded mr-2"
        />
        <button
          onClick={handleFetchStudentResults}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          Fetch Results
        </button>
        <button
          onClick={handleExportToCSV}
          className="bg-green-600 text-white px-4 py-2 rounded"
          disabled={loading || studentResults.length === 0}
        >
          Export to CSV
        </button>

        {loading && <p className="mt-4">Loading results...</p>}
        {error && <p className="mt-4 text-red-500">Error: {error}</p>}

        {studentResults.length > 0 && (
          <div className="mt-6">
            <h4 className="text-md font-semibold mb-2">
              Results for Student ID: {fetchedStudentId}
            </h4>
            <ul className="list-disc pl-5">
              {studentResults.map((result) => (
                <li
                  key={result.id}
                  className="mb-2 p-3 border rounded shadow-sm"
                >
                  <p>Quiz ID: {result.quiz_id}</p>
                  <p>
                    Score: {result.score}/{result.total}
                  </p>
                  <p>
                    Started At: {new Date(result.started_at).toLocaleString()}
                  </p>
                  <p>Ended At: {new Date(result.ended_at).toLocaleString()}</p>
                </li>
              ))}
            </ul>
          </div>
        )}
        {studentResults.length === 0 &&
          !loading &&
          !error &&
          fetchedStudentId && (
            <p className="mt-4">
              No results found for Student ID: {fetchedStudentId}
            </p>
          )}
      </div>
    </div>
  );
}
