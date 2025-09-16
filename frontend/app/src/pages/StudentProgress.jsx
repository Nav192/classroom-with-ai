import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import api from "../services/api";

export default function StudentProgress() {
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const location = useLocation();
  const searchParams = new URLSearchParams(location.search);
  const classId = searchParams.get("classId");
  const className = searchParams.get("className");

  useEffect(() => {
    if (!classId) {
      setError("No class ID provided.");
      setLoading(false);
      return;
    }

    const fetchStudentProgress = async () => {
      try {
        setLoading(true);
        const studentsRes = await api.get(`/progress/class/${classId}/students`);
        setStudents(studentsRes.data);
      } catch (err) {
        setError(
          err.response?.data?.detail || "Failed to load student progress."
        );
      } finally {
        setLoading(false);
      }
    };

    fetchStudentProgress();
  }, [classId]);

  if (loading) {
    return <div className="p-6">Loading student progress...</div>;
  }

  if (error) {
    return <div className="p-6 text-destructive">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <header>
        <h1 className="text-3xl font-bold">
          Student Progress: {className}
        </h1>
      </header>
      <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border p-6">
        {students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Student Name
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Email
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Materials Completed
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Quizzes Attempted
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                    Average Score
                  </th>
                </tr>
              </thead>
              <tbody className="bg-card divide-y divide-border">
                {students.map((student) => (
                  <tr key={student.user_id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">
                      {student.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {student.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {student.materials_completed}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {student.quizzes_attempted}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                      {student.average_score?.toFixed(2) ?? "N/A"}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-muted-foreground text-center py-4">
            No students in this class yet.
          </p>
        )}
      </div>
    </div>
  );
}
