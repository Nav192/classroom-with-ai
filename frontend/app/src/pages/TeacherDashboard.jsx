import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UploadCloud, BookOpen, Plus, Download, LogIn, Users, Trash2 } from "lucide-react";
import api from "../services/api";

// Main Dashboard Component
export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClass, setSelectedClass] = useState(null);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classError, setClassError] = useState("");

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("user_role");
    if (!storedUserId || storedUserRole !== "teacher") {
      navigate("/login");
    } else {
      setUser({ id: storedUserId, role: storedUserRole });
      fetchMyClasses();
      api.get(`/users/${storedUserId}`).then(res => setUsername(res.data.username));
    }
  }, [navigate]);

  const fetchMyClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await api.get("/classes/me");
      const classes = response.data || [];
      setMyClasses(classes);
      if (classes.length > 0 && !selectedClass) {
        setSelectedClass(classes[0]);
      }
    } catch (err) {
      setClassError("Failed to load your classes.");
    } finally {
      setLoadingClasses(false);
    }
  };

  if (!user) return <div className="p-6 text-center">Loading user profile...</div>;

  return (
    <div className="space-y-6">
      <DashboardHeader 
        username={username} 
        myClasses={myClasses} 
        selectedClass={selectedClass} 
        setSelectedClass={setSelectedClass} 
        loadingClasses={loadingClasses}
        onClassJoined={fetchMyClasses}
      />

      {classError && <p className="text-sm text-red-500 text-center py-2">{classError}</p>}

      {selectedClass ? (
        <ClassTabs selectedClass={selectedClass} onDataChange={fetchMyClasses} />
      ) : (
        <div className="text-center py-20 bg-white rounded-lg shadow-md border border-gray-200">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Welcome, {username}!</h2>
          <p className="text-gray-500 mt-2">You have not joined any classes yet.</p>
          <p className="text-gray-500 mt-1">Join a class to get started.</p>
        </div>
      )}
    </div>
  );
}

// Header Component
function DashboardHeader({ username, myClasses, selectedClass, setSelectedClass, loadingClasses, onClassJoined }) {
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
        <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
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
            {isJoining ? "Joining..." : "Join Class"}
          </button>
        </form>
        <div className="w-full md:w-64">
          {loadingClasses ? <p className="text-sm text-gray-500">Loading classes...</p> : (
            <select 
              value={selectedClass ? selectedClass.id : ""} 
              onChange={(e) => {
                const newClass = myClasses.find(c => c.id === e.target.value);
                setSelectedClass(newClass);
              }}
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              disabled={myClasses.length === 0}
            >
              {myClasses.length > 0 ? 
                myClasses.map(c => <option key={c.id} value={c.id}>{c.class_name} ({c.class_code})</option>) : 
                <option>No classes available</option>}
            </select>
          )}
        </div>
      </div>
      {joinError && <p className="text-sm text-red-500 mt-2 text-right w-full">{joinError}</p>}
    </div>
  );
}

// Tabs Component
function ClassTabs({ selectedClass, onDataChange }) {
  const [activeTab, setActiveTab] = useState("students");

  const tabs = [
    { id: "students", label: "Students & Progress" },
    { id: "materials", label: "Materials" },
    { id: "quizzes", label: "Quizzes" },
  ];

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`${
                activeTab === tab.id
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              } whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>
      <div className="py-6">
        {activeTab === "students" && <StudentsTab classId={selectedClass.id} className={selectedClass.class_name} />}
        {activeTab === "materials" && <MaterialsTab classId={selectedClass.id} onDataChange={onDataChange} />}
        {activeTab === "quizzes" && <QuizzesTab classId={selectedClass.id} />}
      </div>
    </div>
  );
}

// Students Tab Component
function StudentsTab({ classId, className }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/progress/class/${classId}`)
      .then(res => setProgress(res.data))
      .catch(() => setError("Failed to load student progress."))
      .finally(() => setLoading(false));
  }, [classId]);

  const handleDownloadReport = () => {
    const url = `${api.defaults.baseURL}/reports/${classId}/students.csv`;
    const token = localStorage.getItem('access_token');
    fetch(url, { headers: { 'Authorization': `Bearer ${token}` } })
      .then(response => response.blob())
      .then(blob => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = downloadUrl;
        a.download = `report_${className.replace(/\s+/g, '_')}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => setError("Failed to download report."));
  };

  if (loading) return <p>Loading student progress...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Student Progress</h2>
        <div className="flex items-center gap-2">
          <Link to={`/teacher/student-progress?classId=${classId}&className=${className}`} className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 flex items-center gap-2 transition-colors text-sm"><Users size={16} /> View Details</Link>
          <button onClick={handleDownloadReport} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2 transition-colors text-sm"><Download size={16} /> Download Report</button>
        </div>
      </div>
      {progress && progress.student_summaries.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materials</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quizzes</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Progress</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {progress.student_summaries.map((student) => (
                <tr key={student.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.materials_completed} / {progress.total_materials} ({student.materials_progress_percentage}%)</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.quizzes_attempted} / {progress.total_quizzes} ({student.quizzes_progress_percentage}%)</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.overall_progress_percentage}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-gray-500 text-center py-10">No student progress to show yet.</p>}
    </div>
  );
}

// Materials Tab Component
function MaterialsTab({ classId, onDataChange }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchMaterials = () => {
    setLoading(true);
    api.get(`/materials/${classId}`)
      .then(res => setMaterials(res.data || []))
      .catch(() => setError("Failed to load materials."))
      .finally(() => setLoading(false));
  };

  useEffect(fetchMaterials, [classId]);

  const handleDelete = async (materialId) => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      try {
        await api.delete(`/materials/${materialId}`);
        fetchMaterials(); // Refresh list
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to delete material.");
      }
    }
  };

  if (loading) return <p>Loading materials...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Class Materials</h2>
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm"><Plus size={16} /> Upload Material</button>
      </div>
      {materials.length > 0 ? (
        <ul className="space-y-3">
          {materials.map(material => (
            <li key={material.id} className="p-4 rounded-lg bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <BookOpen className="text-blue-500 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-gray-800">{material.topic}</p>
                  <p className="text-sm text-gray-500">{material.filename}</p>
                </div>
              </div>
              <button onClick={() => handleDelete(material.id)} className="p-2 text-gray-500 hover:text-red-600 transition-colors" title="Delete"><Trash2 size={20} /></button>
            </li>
          ))}
        </ul>
      ) : <p className="text-gray-500 text-center py-10">No materials uploaded yet.</p>}
      {isModalOpen && <UploadMaterialModal classId={classId} setIsModalOpen={setIsModalOpen} onMaterialUploaded={fetchMaterials} />}
    </div>
  );
}

// Upload Material Modal
function UploadMaterialModal({ classId, setIsModalOpen, onMaterialUploaded }) {
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !topic) return setError("Please provide both a topic and a file.");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("topic", topic);
    setUploading(true);
    setError("");
    try {
      await api.post(`/materials/${classId}`, formData);
      onMaterialUploaded();
      setIsModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Upload New Material</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label htmlFor="topic" className="block text-sm font-medium text-gray-700 mb-1">Topic</label>
            <input id="topic" type="text" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="e.g., Basic Algebra" className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label htmlFor="file" className="block text-sm font-medium text-gray-700 mb-1">File</label>
            <input id="file" type="file" onChange={(e) => setFile(e.target.files[0])} className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200" required />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="py-2 px-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={uploading} className="py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400">
              {uploading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Quizzes Tab Component
function QuizzesTab({ classId }) {
  // This would be built out similarly to the other tabs
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold">Class Quizzes</h2>
            <Link to={`/teacher/quiz/new?classId=${classId}`} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm"><Plus size={16} /> Create Quiz</Link>
        </div>
        <p className="text-gray-500 text-center py-10">Quiz management UI goes here.</p>
    </div>
  );
}
