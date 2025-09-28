import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BookCopy, Send, User, Bot, PlayCircle, LogIn, Users, Download, Eye, ChevronDown, PlusCircle, ChevronLeft } from "lucide-react";
import api from "../services/api";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [myClasses, setMyClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classError, setClassError] = useState("");
  const [selectedClassDetails, setSelectedClassDetails] = useState(null);
  const [activeGridTab, setActiveGridTab] = useState('active'); // State for the grid tabs

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("user_role");
    if (!storedUserId || storedUserRole !== "student") {
      navigate("/login");
    } else {
      setUser({ id: storedUserId, role: storedUserRole });
      api.get(`/users/${storedUserId}`).then(res => setUsername(res.data.username));
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchMyClasses();
    }
  }, [user]); // Fetch classes once when user is loaded

  const fetchMyClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await api.get(`/classes/me?show_archived=true`);
      const classes = response.data || [];
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
      />

      {classError && <p className="text-sm text-destructive text-center py-2">{classError}</p>}

      {loadingClasses ? (
        <p className="text-center py-20">Loading your classes...</p>
      ) : selectedClassDetails ? (
        <ClassTabs selectedClass={selectedClassDetails} onBackToClassSelection={() => setSelectedClassDetails(null)} />
      ) : myClasses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg shadow-md border border-gray-200">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">Welcome, {username}!</h2>
          <p className="text-gray-500 mt-2">You are not enrolled in any classes yet.</p>
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
              <ClassGridDisplay myClasses={activeClasses} onSelectClass={setSelectedClassDetails} />
            ) : (
              <ClassGridDisplay myClasses={archivedClasses} onSelectClass={setSelectedClassDetails} />
            )}
          </div>
      )}
    </div>
  );
}

// Header Component
function DashboardHeader({ username, onClassJoined }) {
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

import StudentClassResults from './StudentClassResults.jsx';

// ... (rest of the file is the same until ClassTabs)

// Tabs Component
function ClassTabs({ selectedClass, onBackToClassSelection }) {
  const [activeTab, setActiveTab] = useState("overview");

  const tabs = [
    { id: "overview", label: "Overview" },
    { id: "materials", label: "Materials" },
    { id: "quizzes", label: "Quizzes" },
    { id: "results", label: "Results" },
    { id: "chat", label: "AI Assistant" },
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
        {activeTab === "overview" && <OverviewTab classId={selectedClass.id} />}
        {activeTab === "materials" && <MaterialsTab classId={selectedClass.id} />}
        {activeTab === "quizzes" && <QuizzesTab classId={selectedClass.id} />}
        {activeTab === "results" && <StudentClassResults classId={selectedClass.id} />}
        {activeTab === "chat" && <ChatTab />}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ classId }) {
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/progress/my/${classId}`)
      .then(res => setProgress(res.data))
      .catch(() => setError("Failed to load progress."))
      .finally(() => setLoading(false));
  }, [classId]);

  if (loading) return <p>Loading overview...</p>;
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
        <h3 className="font-semibold text-lg mt-6 mb-4">Overall Weighted Quiz Score</h3>
        <div className="flex items-center justify-between">
          <span className="text-3xl font-bold text-purple-600">{progress.weighted_average_quiz_score}%</span>
          <span className="text-sm text-gray-500">Based on quiz weights</span>
        </div>
      </div>
    </div>
  );
}

// Materials Tab Component
function MaterialsTab({ classId }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/materials/${classId}`)
      .then(res => setMaterials(res.data || []))
      .catch(() => setError("Failed to load materials."))
      .finally(() => setLoading(false));
  }, [classId]);

  const handleAction = async (materialId, action) => {
    try {
      const res = await api.get(`/materials/download/${materialId}`);
      if (res.data && res.data.download_url) {
        window.open(res.data.download_url, "_blank");
        if (action === 'view') {
          await api.post(`/progress/material/${materialId}/complete`);
          // Optionally refresh materials to show completion status
        }
      } else {
        setError("Could not retrieve material link.");
      }
    } catch (err) {
      setError(err.response?.data?.detail || `An error occurred during ${action}.`);
    }
  };

  if (loading) return <p>Loading materials...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Available Materials</h2>
      {materials.length > 0 ? (
        <ul className="space-y-3">
          {materials.map(material => (
            <li key={material.id} className="p-4 rounded-lg bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <BookCopy className="text-blue-500 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-gray-800">{material.topic}</p>
                  <p className="text-sm text-gray-500">{material.filename}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleAction(material.id, 'view')} className="p-2 text-gray-600 hover:text-blue-600 transition-colors" title="View & Mark as Complete"><Eye size={20} /></button>
                <button onClick={() => handleAction(material.id, 'download')} className="p-2 text-gray-600 hover:text-blue-600 transition-colors" title="Download"><Download size={20} /></button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-gray-500">No materials available in this class yet.</p>}
    </div>
  );
}

// Quizzes Tab Component
function QuizzesTab({ classId }) {
  const navigate = useNavigate();
  const [quizzes, setQuizzes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/quizzes/${classId}`)
      .then(res => setQuizzes(res.data || []))
      .catch(() => setError("Failed to load quizzes."))
      .finally(() => setLoading(false));
  }, [classId]);

  const handleOpenQuiz = (quizId) => {
    navigate(`/student/quiz/${quizId}`);
  };

  const getQuizAvailability = (quiz) => {
    if (!quiz.is_active) {
      return { text: 'Inactive', disabled: true, style: 'bg-gray-400 text-white cursor-not-allowed' };
    }
    const now = new Date();
    const from = quiz.available_from ? new Date(quiz.available_from) : null;
    const until = quiz.available_until ? new Date(quiz.available_until) : null;

    if (from && now < from) {
      return { text: `Starts ${from.toLocaleString()}`, disabled: true, style: 'bg-yellow-500 text-white cursor-not-allowed' };
    }
    if (until && now > until) {
      return { text: 'Expired', disabled: true, style: 'bg-red-500 text-white cursor-not-allowed' };
    }
    return { text: 'Open Quiz', disabled: false, style: 'bg-blue-600 text-white hover:bg-blue-700' };
  };

  if (loading) return <p>Loading quizzes...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Available Quizzes</h2>
      {quizzes.length > 0 ? (
        <ul className="space-y-3">
          {quizzes.map(quiz => {
            const availability = getQuizAvailability(quiz);
            return (
              <li 
                key={quiz.id} 
                className={`p-4 rounded-lg flex justify-between items-center transition-colors ${availability.disabled ? 'bg-gray-100 opacity-70' : 'bg-gray-50'}`}>
                <div>
                  <p className="font-semibold text-gray-800">{quiz.topic}</p>
                  <p className="text-sm text-gray-500">Type: {quiz.type}</p>
                  {(quiz.available_from || quiz.available_until) && (
                    <p className="text-xs text-gray-500 mt-1">
                      {quiz.available_from && <span>From: {new Date(quiz.available_from).toLocaleString()}</span>}
                      {quiz.available_from && quiz.available_until && <br />}
                      {quiz.available_until && <span>Until: {new Date(quiz.available_until).toLocaleString()}</span>}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {availability.disabled ? (
                    <div className={`py-2 px-4 rounded-full flex items-center gap-2 text-sm ${availability.style}`}>
                      <span>{availability.text}</span>
                    </div>
                  ) : (
                    <button
                      onClick={() => handleOpenQuiz(quiz.id)}
                      className={`py-2 px-4 rounded-full flex items-center gap-2 transition-colors text-sm ${availability.style}`}
                    >
                      <PlayCircle size={18} />
                      <span>{availability.text}</span>
                    </button>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      ) : <p className="text-gray-500 text-center py-10">No quizzes available in this class yet.</p>}
    </div>
  );
}

// Chat Tab Component
function ChatTab() {
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! Ask me anything about the materials in your joined classes.' }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!inputQuery.trim() || isTyping) return;
    const userMessage = { sender: 'user', text: inputQuery };
    setMessages(prev => [...prev, userMessage]);
    setInputQuery("");
    setIsTyping(true);
    try {
      const response = await api.post("/ai/chat", { query: inputQuery });
      const aiMessage = { sender: 'ai', text: response.data.answer };
      setMessages(prev => [...prev, aiMessage]);
    } catch (err) {
      const errorMessage = { sender: 'ai', text: 'Sorry, an error occurred. Please try again later.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md border border-gray-200 flex flex-col h-[70vh]">
      <div className="p-4 border-b border-gray-200"><h2 className="text-xl font-semibold text-gray-800">AI Learning Assistant</h2></div>
      <div className="p-6 flex-1 overflow-y-auto bg-gray-50">
        <div className="space-y-6">
          {messages.map((msg, index) => (
            <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
              {msg.sender === 'ai' && <div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0"><Bot size={22}/></div>}
              <div className={`px-4 py-3 rounded-2xl max-w-2xl shadow-sm ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-700 rounded-bl-none'}`}><p className="text-sm" style={{whiteSpace: "pre-wrap"}}>{msg.text}</p></div>
              {msg.sender === 'user' && <div className="w-10 h-10 bg-gray-300 rounded-full flex items-center justify-center text-gray-600 flex-shrink-0"><User size={22}/></div>}
            </div>
          ))}
          {isTyping && <div className="flex items-start gap-3"><div className="w-10 h-10 bg-blue-600 rounded-full flex items-center justify-center text-white flex-shrink-0"><Bot size={22}/></div><div className="px-4 py-3 rounded-2xl bg-white shadow-sm"><div className="flex items-center justify-center gap-1.5"><span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.3s]"></span><span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce [animation-delay:-0.15s]"></span><span className="h-2 w-2 bg-gray-500 rounded-full animate-bounce"></span></div></div></div>}
          <div ref={chatEndRef} />
        </div>
      </div>
      <div className="p-4 bg-white border-t border-gray-200">
        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
          <input type="text" value={inputQuery} onChange={(e) => setInputQuery(e.target.value)} placeholder="Ask about materials..." className="flex-1 px-4 py-2 bg-gray-100 border border-gray-300 rounded-full focus:outline-none focus:ring-2 focus:ring-blue-500" disabled={isTyping} />
          <button type="submit" className="bg-blue-600 text-white p-3 rounded-full hover:bg-blue-700 disabled:bg-blue-400 transition-colors" disabled={isTyping || !inputQuery.trim()}><Send size={20} /></button>
        </form>
      </div>
    </div>
  );
}

// Class Grid Display Component
function ClassGridDisplay({ myClasses, onSelectClass }) {
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
          <p className="text-gray-500 text-sm">Created: {new Date(c.created_at).toLocaleString('en-US', { year: 'numeric', month: 'long', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</p>
        </div>
      )) : (
        <p className="text-gray-500 col-span-full text-center">No classes to display in this view.</p>
      )}
    </div>
  );
}
