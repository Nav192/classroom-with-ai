import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UploadCloud, BookOpen, Plus, Eye, Download } from "lucide-react";
import api from "../services/api";
import StudentProgressModal from "../components/StudentProgressModal";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  const [classId, setClassId] = useState("");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedStudentProgress, setSelectedStudentProgress] = useState(null);
  const [progressError, setProgressError] = useState(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("user_role");

    if (!storedUserId || storedUserRole !== "teacher") {
      navigate("/login");
    } else {
      setUser({ id: storedUserId, role: storedUserRole });
      fetchMaterials();
      fetchStudents();
    }
  }, [navigate]);

  const fetchMaterials = async () => {
    try {
      setLoadingMaterials(true);
      const response = await api.get("/materials");
      setMaterials(response.data);
    } catch (err) {
      setError("Failed to load materials.");
    } finally {
      setLoadingMaterials(false);
    }
  };

  const fetchStudents = async () => {
    try {
      setLoadingStudents(true);
      const response = await api.get("/admin/users"); 
      setStudents(response.data.filter(u => u.role === 'student'));
    } catch (err) {
      setProgressError("Failed to load student list.");
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !classId || !topic) {
      setError("Please fill all fields and select a file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("class_id", classId);
    formData.append("topic", topic);

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/materials", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(response.data.message);
      fetchMaterials();
      setClassId("");
      setTopic("");
      setFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred while uploading.");
    } finally {
      setUploading(false);
    }
  };

  const handleViewProgress = async (studentId) => {
    try {
      setProgressError(null);
      const response = await api.get(`/progress/${studentId}`);
      setSelectedStudentProgress(response.data);
      setIsProgressModalOpen(true);
    } catch (err) {
      setProgressError("Failed to load student progress.");
    }
  };

  const handleCloseProgressModal = () => {
    setIsProgressModalOpen(false);
    setSelectedStudentProgress(null);
  };

  const handleDownloadReport = () => {
    window.open(`${api.defaults.baseURL}/reports/students.csv`, '_blank');
  };

  if (!user) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-8">
      <StudentProgressModal 
        isOpen={isProgressModalOpen}
        onClose={handleCloseProgressModal}
        progress={selectedStudentProgress}
      />

      <header className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="lg:col-span-1 bg-card text-card-foreground rounded-lg shadow-md border border-border">
          <div className="p-6">
            <h2 className="text-xl font-semibold mb-4">Upload New Material</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div className="space-y-2">
                <label htmlFor="classId" className="text-sm font-medium">Class ID</label>
                <input
                  id="classId"
                  type="text"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  placeholder="e.g., 10-A"
                  className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="topic" className="text-sm font-medium">Topic</label>
                <input
                  id="topic"
                  type="text"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="e.g., Basic Algebra"
                  className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                  required
                />
              </div>
              <div className="space-y-2">
                <label htmlFor="file" className="text-sm font-medium">File</label>
                <input
                  id="file"
                  type="file"
                  onChange={handleFileChange}
                  className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="w-full py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {uploading ? "Uploading..." : <><UploadCloud size={18} /> Upload</>}
              </button>
              {message && <p className="text-sm text-green-600 mt-2">{message}</p>}
              {error && <p className="text-sm text-destructive mt-2">{error}</p>}
            </form>
          </div>
        </div>

        {/* Materials List Section */}
        <div className="lg:col-span-2 bg-card text-card-foreground rounded-lg shadow-md border border-border">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Uploaded Materials</h2>
            <Link
              to="/teacher/quiz/new"
              className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 flex items-center gap-2 transition-colors"
            >
              <Plus size={18} />
              Create Quiz
            </Link>
          </div>
          <div className="px-6 pb-6">
            {loadingMaterials ? <p>Loading materials...</p> : (
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {materials.length > 0 ? materials.map((material) => (
                  <li key={material.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-primary" size={20} />
                      <div>
                        <p className="font-semibold">{material.filename}</p>
                        <p className="text-sm text-muted-foreground">Class: {material.class_id} | Topic: {material.topic}</p>
                      </div>
                    </div>
                  </li>
                )) : <p className="text-muted-foreground">No materials uploaded yet.</p>}
              </ul>
            )}
          </div>
        </div>

        {/* Student Progress Monitoring Section */}
        <div className="lg:col-span-3 bg-card text-card-foreground rounded-lg shadow-md border border-border">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold">Student Progress Monitoring</h2>
            <button
              onClick={handleDownloadReport}
              className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 flex items-center gap-2 transition-colors"
            >
              <Download size={18} /> Download Report (CSV)
            </button>
          </div>
          <div className="px-6 pb-6">
            {loadingStudents ? <p>Loading student list...</p> : (
              <> 
                {progressError && <p className="text-destructive text-sm mb-4">{progressError}</p>}
                {students.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-border">
                      <thead className="bg-muted/50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student Email</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="bg-card divide-y divide-border">
                        {students.map((student) => (
                          <tr key={student.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{student.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-right">
                              <button
                                onClick={() => handleViewProgress(student.id)}
                                className="text-primary hover:underline flex items-center justify-end gap-1"
                              >
                                <Eye size={16} /> View Progress
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-muted-foreground">No students registered yet.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}