import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UploadCloud, BookOpen, Plus, Download, LogIn, Users, Trash2, Pencil, RefreshCw, ChevronLeft, Archive, ArchiveRestore, Copy } from "lucide-react";
import api from "../services/api";
import CreateClassModal from "../components/CreateClassModal";

// Main Dashboard Component
export default function TeacherDashboard() {
  const initialUser = () => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("user_role");
    if (storedUserId && storedUserRole === "teacher") {
      return { id: storedUserId, role: storedUserRole };
    }
    return null;
  };
  const [user, setUser] = useState(initialUser);
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [myClasses, setMyClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classError, setClassError] = useState("");
  const [selectedClassDetails, setSelectedClassDetails] = useState(null);
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [activeGridTab, setActiveGridTab] = useState('active'); // State for the grid tabs

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      fetchMyClasses();
      api.get(`/users/${user.id}`).then(res => setUsername(res.data.username));
    }
  }, [user, navigate]);

  const fetchMyClasses = async () => {
    setLoadingClasses(true);
    try {
      const [memberOfResponse, createdByResponse] = await Promise.all([
        api.get(`/classes/me?show_archived=true&_=${new Date().getTime()}`),
        api.get(`/classes/created-by-me?show_archived=true&_=${new Date().getTime()}`),
      ]);

      console.log("API Response - classes/me:", memberOfResponse.data);
      console.log("API Response - classes/created-by-me:", createdByResponse.data);

      const memberOfClasses = memberOfResponse.data || [];
      const createdByClasses = createdByResponse.data || [];

      // Combine and remove duplicates based on class ID
      const combinedClassesMap = new Map();
      memberOfClasses.forEach(c => combinedClassesMap.set(c.id, c));
      createdByClasses.forEach(c => combinedClassesMap.set(c.id, c));

      const classes = Array.from(combinedClassesMap.values());
      console.log("Combined and unique classes:", classes);
      setMyClasses(classes);
    } catch (err) {
      setClassError("Failed to load your classes.");
    } finally {
      setLoadingClasses(false);
    }
  };

  const activeClasses = myClasses.filter(c => !c.is_archived);
  const archivedClasses = myClasses.filter(c => c.is_archived);

  if (!user) return <div className="p-6 text-center">Loading user profile...</div>;

  return (
    <div className="space-y-6">
      <DashboardHeader 
        username={username} 
        onClassJoined={fetchMyClasses}
        onCreateClassClick={() => setIsCreateClassModalOpen(true)}
      />

      {classError && <p className="text-sm text-red-500 text-center py-2">{classError}</p>}

      <>
        {loadingClasses ? (
          <p className="text-center py-20">Loading your classes...</p>
        ) : selectedClassDetails ? (
          <ClassTabs selectedClass={selectedClassDetails} onBackToClassSelection={() => setSelectedClassDetails(null)} username={username} />
        ) : myClasses.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-lg shadow-md border border-gray-200">
            <Users size={48} className="mx-auto text-gray-400 mb-4" />
            <h2 className="text-xl font-semibold text-gray-700">Welcome, {username}!</h2>
            <p className="text-gray-500 mt-2">You have not joined any classes yet.</p>
            <p className="text-gray-500 mt-1">Join a class to get started.</p>
          </div>
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="border-b border-gray-200 mb-6">
              <nav className="-mb-px flex space-x-6" aria-label="Class Grid Tabs">
                <button 
                  onClick={() => setActiveGridTab('active')} 
                  className={`${activeGridTab === 'active' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                >
                  Active Classes
                </button>
                <button 
                  onClick={() => setActiveGridTab('archived')} 
                  className={`${activeGridTab === 'archived' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                >
                  Archived Classes
                </button>
              </nav>
            </div>
            {activeGridTab === 'active' ? (
              <TeacherClassGridDisplay myClasses={activeClasses} onSelectClass={setSelectedClassDetails} />
            ) : (
              <TeacherClassGridDisplay myClasses={archivedClasses} onSelectClass={setSelectedClassDetails} />
            )}
          </div>
        )}
      </>

      {isCreateClassModalOpen && (
        <CreateClassModal
          setIsModalOpen={setIsCreateClassModalOpen}
          onClassCreated={() => {
            fetchMyClasses();
            setIsCreateClassModalOpen(false);
          }}
        />
      )}
    </div>
  );
}

// Teacher Class Grid Display Component
function TeacherClassGridDisplay({ myClasses, onSelectClass }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {myClasses.length > 0 ? myClasses.map(c => (
        <div
          key={c.id}
          className={`p-6 rounded-lg shadow-sm border border-gray-200 transition-all cursor-pointer hover:shadow-md ${
            c.is_archived ? 'bg-gray-100 opacity-75' : 'bg-gray-50'
          }`}
          onClick={() => onSelectClass(c)}
        >
          <div className="flex justify-between items-start">
            <h3 className="text-xl font-semibold text-gray-800 mb-2">{c.class_name}</h3>
            {c.is_archived && <span className="px-2 py-1 text-xs font-semibold rounded-full bg-yellow-200 text-yellow-800">Archived</span>}
          </div>
          <p className="text-gray-600 mb-1">Grade: {c.grade}</p>
          <p className="text-gray-600 mb-1">Teacher: {c.teacher_name || 'N/A'}</p>
          <p className="text-gray-500 text-sm">Code: <span className="font-mono">{c.class_code}</span></p>
          <p className="text-gray-500 text-sm">Created: {new Date(c.created_at).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      )) : (
        <p className="text-gray-500 col-span-full text-center">No classes to display in this view.</p>
      )}
    </div>
  );
}

// Header Component
function DashboardHeader({ username, onClassJoined, onCreateClassClick }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
        <p className="text-gray-500">Welcome back, {username}!</p>
      </div>
      <button
        onClick={onCreateClassClick}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm"
      >
        <Plus size={16} /> Create Class
      </button>
    </div>
  );
}

// Tabs Component
function ClassTabs({ selectedClass, onDataChange, username, onBackToClassSelection }) {
  const [activeTab, setActiveTab] = useState("statistics");

  const tabs = [
    { id: "statistics", label: "Statistics" },
    { id: "students", label: "Students" },
    { id: "materials", label: "Materials" },
    { id: "quizzes", label: "Quizzes" },
    { id: "class_management", label: "Class Management" },
  ];

  return (
    <div>
      <div className="border-b border-gray-200 flex justify-between items-center">
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
        <button 
          onClick={onBackToClassSelection} 
          className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 transition-colors text-sm flex items-center gap-1"
        >
          <ChevronLeft size={16} /> Back to Classes
        </button>
      </div>
      <div className="py-6">
        {activeTab === "statistics" && <StatisticsTab classId={selectedClass.id} />}
        {activeTab === "students" && <StudentsTab classId={selectedClass.id} className={selectedClass.class_name} />}
        {activeTab === "materials" && <MaterialsTab classId={selectedClass.id} onDataChange={onDataChange} />}
        {activeTab === "quizzes" && <QuizzesTab classId={selectedClass.id} />}
        {activeTab === "class_management" && <TeacherClassManagementTab teacherName={username} />}
      </div>
    </div>
  );
}

// Statistics Tab Component
function StatisticsTab({ classId }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/progress/class/${classId}`)
      .then(res => {
        const data = res.data;
        // Aggregate data for class-wide statistics
        const totalStudents = data.student_summaries.length;
        const materialsCompleted = data.student_summaries.reduce((acc, student) => acc + student.materials_completed, 0);
        const quizzesAttempted = data.student_summaries.reduce((acc, student) => acc + student.quizzes_attempted, 0);
        
        const classProgress = {
          total_materials: data.total_materials * totalStudents,
          total_quizzes: data.total_quizzes * totalStudents,
          materials_completed: materialsCompleted,
          quizzes_attempted: quizzesAttempted,
          materials_progress_percentage: (totalStudents > 0 && data.total_materials > 0) ? Math.round((materialsCompleted / (data.total_materials * totalStudents)) * 100) : 0,
          quizzes_progress_percentage: (totalStudents > 0 && data.total_quizzes > 0) ? Math.round((quizzesAttempted / (data.total_quizzes * totalStudents)) * 100) : 0,
        };
        setProgress(classProgress);
      })
      .catch(() => setError("Failed to load class progress."))
      .finally(() => setLoading(false));
  }, [classId]);

  if (loading) return <p>Loading statistics...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!progress) return <p>No progress data available.</p>;

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="font-semibold text-lg mb-4">Materials Progress</h3>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-blue-600">{progress.materials_progress_percentage}%</span>
          <span className="text-sm text-gray-500">{progress.materials_completed} of {progress.total_materials} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
          <div className="bg-blue-600 h-2.5 rounded-full" style={{ width: `${progress.materials_progress_percentage}%` }}></div>
        </div>
      </div>
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h3 className="font-semibold text-lg mb-4">Quizzes Progress</h3>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-green-600">{progress.quizzes_progress_percentage}%</span>
          <span className="text-sm text-gray-500">{progress.quizzes_attempted} of {progress.total_quizzes} completed</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 mt-4">
          <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${progress.quizzes_progress_percentage}%` }}></div>
        </div>
      </div>
    </div>
  );
}


// Students Tab Component
function StudentsTab({ classId, className }) {
  const [studentData, setStudentData] = useState({ total_materials: 0, student_details: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/progress/class/${classId}/students`)
      .then(res => setStudentData(res.data))
      .catch(() => setError("Failed to load students."))
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

  if (loading) return <p>Loading students...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const { total_materials, student_details } = studentData;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Students</h2>
        <button onClick={handleDownloadReport} className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2 transition-colors text-sm"><Download size={16} /> Download Report</button>
      </div>
      {student_details.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Materials Completed</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quizzes Attempted</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {student_details.map((student) => (
                <tr key={student.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.username || student.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${student.materials_completed} / ${total_materials}`}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.quizzes_attempted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : <p className="text-gray-500 text-center py-10">No students in this class yet.</p>}
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
            <button type="submit" disabled={uploading} className="py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2">
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Upload</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Quizzes Tab Component
function QuizzesTab({ classId }) {
  const [quizzes, setQuizzes] = useState([]);
  const [viewingResultsOfQuizId, setViewingResultsOfQuizId] = useState(null);
  const [studentStatuses, setStudentStatuses] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [loadingStatuses, setLoadingStatuses] = useState(false);
  const [error, setError] = useState("");

  const fetchQuizzes = () => {
    setLoadingQuizzes(true);
    setError("");
    // Fetch all quizzes for the teacher, bypassing student visibility rules
    api.get(`/quizzes/${classId}?teacher_view=true`)
      .then(res => setQuizzes(res.data || []))
      .catch(() => setError("Failed to load quizzes."))
      .finally(() => setLoadingQuizzes(false));
  };

  useEffect(fetchQuizzes, [classId]);

  const handleViewResults = (quizId) => {
    if (viewingResultsOfQuizId === quizId) {
      setViewingResultsOfQuizId(null);
    } else {
      setViewingResultsOfQuizId(quizId);
      setLoadingStatuses(true);
      setError("");
      api.get(`/dashboard/teacher/class/${classId}/quiz/${quizId}/status`)
        .then(res => setStudentStatuses(res.data || []))
        .catch(() => setError("Failed to load student quiz statuses."))
        .finally(() => setLoadingStatuses(false));
    }
  };

  const handleDeleteQuiz = async (quizId) => {
    if (window.confirm("Are you sure you want to delete this quiz? This action cannot be undone.")) {
      try {
        await api.delete(`/quizzes/${quizId}`);
        fetchQuizzes();
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to delete quiz.");
      }
    }
  };

  const handleDuplicateQuiz = async (quizId) => {
    if (window.confirm("Are you sure you want to duplicate this quiz?")) {
      try {
        await api.post(`/quizzes/${quizId}/duplicate`);
        fetchQuizzes(); // Refresh the list to show the new quiz
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to duplicate quiz.");
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <h2 className="text-xl font-semibold">Class Quizzes</h2>
        <Link to={`/teacher/quiz/new?classId=${classId}`} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm"><Plus size={16} /> Create Quiz</Link>
      </div>

      {loadingQuizzes ? <p>Loading quizzes...</p> : (
        quizzes.length > 0 ? (
          <ul className="space-y-4">
            {quizzes.map(quiz => (
              <li key={quiz.id} className="p-4 rounded-lg bg-gray-50 border border-gray-200">
                <div className="flex justify-between items-center">
                  <p className="font-semibold text-gray-800">{quiz.topic}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleViewResults(quiz.id)} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 text-sm font-medium">{viewingResultsOfQuizId === quiz.id ? 'Hide Results' : 'View Results'}</button>
                    <Link to={`/teacher/quiz/edit/${quiz.id}`} className="p-2 text-gray-500 hover:text-blue-600 transition-colors" title="Edit Quiz"><Pencil size={18} /></Link>
                    <button onClick={() => handleDuplicateQuiz(quiz.id)} className="p-2 text-gray-500 hover:text-green-600 transition-colors" title="Duplicate Quiz"><Copy size={18} /></button>
                    <button onClick={() => handleDeleteQuiz(quiz.id)} className="p-2 text-gray-500 hover:text-red-600 transition-colors" title="Delete Quiz"><Trash2 size={18} /></button>
                  </div>
                </div>
                {viewingResultsOfQuizId === quiz.id && (
                  <div className="mt-4">
                    {loadingStatuses ? <p>Loading results...</p> : (
                      studentStatuses.length > 0 ? (
                        <div className="overflow-x-auto border-t border-gray-200">
                          <table className="min-w-full divide-y divide-gray-200">
                            <thead className="bg-gray-50">
                              <tr>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Score</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Percentage</th>
                              </tr>
                            </thead>
                            <tbody className="bg-white divide-y divide-gray-200">
                              {studentStatuses.map((status) => (
                                <tr key={status.student_id}>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{status.username}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${status.status === 'Completed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}>
                                      {status.status}
                                    </span>
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{status.score !== null ? `${status.score} / ${status.total}` : 'N/A'}</td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{status.percentage !== null ? `${status.percentage}%` : 'N/A'}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : <p className="text-gray-500 text-center py-10">No student has taken this quiz yet.</p>
                    )}
                  </div>
                )}
              </li>
            ))}
          </ul>
        ) : <p className="text-gray-500 text-center py-10">No quizzes created for this class yet.</p>
      )}
      {error && <p className="text-red-500 text-sm mt-4">{error}</p>}
    </div>
  );
}

// Teacher Class Management Tab
function TeacherClassManagementTab() {
  const [allClasses, setAllClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState('active'); // 'active' or 'archived'

  const fetchClasses = async () => {
    setLoading(true);
    try {
      // Fetch all classes including archived ones
      const response = await api.get(`/classes/created-by-me?show_archived=true`);
      setAllClasses(response.data || []);
    } catch (err) {
      setError("Failed to fetch classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleResetCode = async (classId) => {
    if (window.confirm("Are you sure you want to reset the class code?")) {
      try {
        await api.patch(`/classes/${classId}/reset-code`);
        fetchClasses();
      } catch (err) {
        alert("Failed to reset class code.");
      }
    }
  };

  const handleArchiveAction = async (classId, isArchiving) => {
    const action = isArchiving ? "archive" : "unarchive";
    const confirmationText = `Are you sure you want to ${action} this class?`;
    if (window.confirm(confirmationText)) {
      try {
        await api.patch(`/classes/${classId}/${action}`);
        fetchClasses(); // Refresh the list after action
      } catch (err) {
        alert(`Failed to ${action} class.`);
      }
    }
  };

  const activeClasses = allClasses.filter(c => !c.is_archived);
  const archivedClasses = allClasses.filter(c => c.is_archived);
  const classesToDisplay = activeSubTab === 'active' ? activeClasses : archivedClasses;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-6" aria-label="Sub-tabs">
          <button 
            onClick={() => setActiveSubTab('active')} 
            className={`${activeSubTab === 'active' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
          >
            Active Classes
          </button>
          <button 
            onClick={() => setActiveSubTab('archived')} 
            className={`${activeSubTab === 'archived' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
          >
            Archived Classes
          </button>
        </nav>
      </div>

      {loading && <p>Loading classes...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Code</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classesToDisplay.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.class_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.grade}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{c.class_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {c.is_archived ? (
                      <button onClick={() => handleArchiveAction(c.id, false)} className="p-2 text-gray-500 hover:text-green-600" title="Unarchive Class"><ArchiveRestore size={18} /></button>
                    ) : (
                      <>
                        <button onClick={() => handleResetCode(c.id)} className="p-2 text-gray-500 hover:text-blue-600" title="Reset Code"><RefreshCw size={18} /></button>
                        <button onClick={() => handleArchiveAction(c.id, true)} className="p-2 text-gray-500 hover:text-yellow-600" title="Archive Class"><Archive size={18} /></button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
