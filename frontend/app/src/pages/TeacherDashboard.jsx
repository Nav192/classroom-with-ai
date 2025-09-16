import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UploadCloud, BookOpen, Plus, Download, LogIn, Users } from "lucide-react";
import api from "../services/api";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");

  // Class management state
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [classError, setClassError] = useState("");
  const [classMessage, setClassMessage] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);

  // State for data within a class
  const [materials, setMaterials] = useState([]);
  const [classProgress, setClassProgress] = useState(null);
  const [loadingData, setLoadingData] = useState(false);

  // Upload state
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMessage, setUploadMessage] = useState("");
  const [uploadError, setUploadError] = useState("");

  // Fetch initial data (user & classes)
  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("user_role");

    if (!storedUserId || storedUserRole !== "teacher") {
      navigate("/login");
    } else {
      setUser({ id: storedUserId, role: storedUserRole });
      fetchMyClasses();
      api.get(`/users/${storedUserId}`).then(res => {
        setUsername(res.data.username);
      });
    }
  }, [navigate]);

  // Fetch class-specific data when a class is selected
  useEffect(() => {
    if (selectedClassId) {
      setMaterials([]);
      setClassProgress(null);
      fetchClassData(selectedClassId);
    }
  }, [selectedClassId]);

  const fetchMyClasses = async () => {
    try {
      setLoadingClasses(true);
      const response = await api.get("/classes/me");
      setMyClasses(response.data || []);
      if (response.data && response.data.length > 0) {
        setSelectedClassId(response.data[0].id);
      }
    } catch (err) {
      setClassError("Failed to load your classes.");
    } finally {
      setLoadingClasses(false);
    }
  };

  const fetchClassData = async (classId) => {
    setLoadingData(true);
    try {
      const materialsPromise = api.get(`/materials/${classId}`);
      const progressPromise = api.get(`/progress/class/${classId}`);
      const [materialsRes, progressRes] = await Promise.all([
        materialsPromise,
        progressPromise,
      ]);
      setMaterials(materialsRes.data || []);
      setClassProgress(progressRes.data || null);
    } catch (error) {
      setUploadError("Failed to load class data. Please try selecting the class again.");
    } finally {
      setLoadingData(false);
    }
  };

  const handleJoinClass = async (e) => {
    e.preventDefault();
    if (!joinCode) return setClassError("Please enter a class code.");
    setClassError("");
    setClassMessage("");
    try {
      await api.post("/classes/join", { class_code: joinCode });
      setClassMessage(`Successfully joined class with code: ${joinCode}!`);
      setJoinCode("");
      fetchMyClasses(); // Refresh class list
    } catch (err) {
      setClassError(err.response?.data?.detail || "Failed to join class.");
    }
  };

  const handleFileChange = (e) => setFile(e.target.files[0]);

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !selectedClassId || !topic) return setUploadError("Please select a class, fill the topic, and select a file.");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("topic", topic);
    setUploading(true);
    setUploadError("");
    setUploadMessage("");
    try {
      const response = await api.post(`/materials/${selectedClassId}`, formData);
      setUploadMessage(response.data.message);
      fetchClassData(selectedClassId);
      setTopic("");
      setFile(null);
      e.target.reset();
    } catch (err) {
      setUploadError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadReport = () => {
    if (!selectedClassId) return;
    const url = `${api.defaults.baseURL}/reports/${selectedClassId}/students.csv`;
    const token = localStorage.getItem('access_token');
    
    fetch(url, {
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.blob())
    .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `report_class_${selectedClassId}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
    })
    .catch(err => setUploadError("Failed to download report."));
  };

  if (!user) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-8">
      <header><h1 className="text-3xl font-bold">Teacher Dashboard</h1><p className="text-muted-foreground">Welcome, {username}</p></header>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-card text-card-foreground p-6 rounded-lg shadow-md border border-border">
        <div>
          <h2 className="text-xl font-semibold mb-4">Join a New Class</h2>
          <form onSubmit={handleJoinClass} className="flex items-center gap-2">
            <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value)} placeholder="Enter Class Code" className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" />
            <button type="submit" className="py-2 px-4 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"><LogIn size={18} /> Join</button>
          </form>
          {classError && <p className="text-sm text-destructive mt-2">{classError}</p>}
          {classMessage && <p className="text-sm text-green-600 mt-2">{classMessage}</p>}
        </div>
        <div>
          <label htmlFor="class-select" className="block text-sm font-medium mb-2">Select Class</label>
          {loadingClasses ? <p>Loading classes...</p> : (
            <select id="class-select" value={selectedClassId} onChange={(e) => setSelectedClassId(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" disabled={myClasses.length === 0}>
              {myClasses.length > 0 ? myClasses.map(c => <option key={c.id} value={c.id}>{c.class_name} ({c.class_code})</option>) : <option>Join a class to begin</option>}
            </select>
          )}
        </div>
      </div>

      {selectedClassId ? (
        loadingData ? <p className="text-center">Loading class data...</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1 bg-card text-card-foreground rounded-lg shadow-md border border-border">
            <div className="p-6">
              <h2 className="text-xl font-semibold mb-4">Upload New Material</h2>
              <form onSubmit={handleUpload} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="topic" className="text-sm font-medium">Topic</label>
                  <input id="topic" type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Basic Algebra" className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="file" className="text-sm font-medium">File</label>
                  <input id="file" type="file" onChange={handleFileChange} className="w-full text-sm text-muted-foreground file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-primary-foreground hover:file:bg-primary/90" required />
                </div>
                <button type="submit" disabled={uploading} className="w-full py-2 text-sm font-semibold text-primary-foreground bg-primary rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                  {uploading ? "Uploading..." : <><UploadCloud size={18} /> Upload</>}
                </button>
                {uploadMessage && <p className="text-sm text-green-600 mt-2">{uploadMessage}</p>}
                {uploadError && <p className="text-sm text-destructive mt-2">{uploadError}</p>}
              </form>
            </div>
          </div>

          <div className="lg:col-span-2 bg-card text-card-foreground rounded-lg shadow-md border border-border">
            <div className="p-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Class Materials</h2>
              <Link to={`/teacher/quiz/new?classId=${selectedClassId}`} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 flex items-center gap-2 transition-colors"><Plus size={18} /> Create Quiz</Link>
            </div>
            <div className="px-6 pb-6">
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {materials.length > 0 ? materials.map((material) => (
                  <li key={material.id} className="flex items-center justify-between p-3 bg-muted/50 rounded-md">
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-primary" size={20} />
                      <div>
                        <p className="font-semibold">{material.filename}</p>
                        <p className="text-sm text-muted-foreground">Topic: {material.topic}</p>
                      </div>
                    </div>
                  </li>
                )) : <p className="text-muted-foreground">No materials uploaded for this class yet.</p>}
              </ul>
            </div>
          </div>

          <div className="lg:col-span-3 bg-card text-card-foreground rounded-lg shadow-md border border-border">
            <div className="p-6 flex justify-between items-center">
              <h2 className="text-xl font-semibold">Student Progress</h2>
              <div className="flex items-center gap-2">
                <Link to={`/teacher/student-progress?classId=${selectedClassId}&className=${myClasses.find(c => c.id === selectedClassId)?.class_name}`} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2 transition-colors"><Users size={18} /> View All Progress</Link>
                <button onClick={handleDownloadReport} className="bg-secondary text-secondary-foreground px-4 py-2 rounded-md hover:bg-secondary/80 flex items-center gap-2 transition-colors"><Download size={18} /> Download Report</button>
              </div>
            </div>
            <div className="px-6 pb-6">
              {classProgress && classProgress.student_summaries.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-border">
                    <thead className="bg-muted/50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Student Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Materials Done</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Quizzes Done</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Overall Progress</th>
                      </tr>
                    </thead>
                    <tbody className="bg-card divide-y divide-border">
                      {classProgress.student_summaries.map((student) => (
                        <tr key={student.user_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{student.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{student.materials_completed} / {classProgress.total_materials}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{student.quizzes_attempted} / {classProgress.total_quizzes}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{student.overall_progress}%</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-muted-foreground text-center py-4">No student progress to show for this class yet.</p>
              )}
            </div>
          </div>
        </div>
      ))
       : (
        <div className="text-center py-10 bg-card rounded-lg shadow-md border border-border">
          <Users size={48} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Welcome, Teacher!</h2>
          <p className="text-muted-foreground mt-2">Please join a class or select one from the dropdown above to begin.</p>
        </div>
      )}
    </div>
  );
}
