import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BookCopy, Send, User, Bot, PlayCircle, LogIn, Users } from "lucide-react";
import api from "../services/api";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);

  // Class management state
  const [myClasses, setMyClasses] = useState([]);
  const [selectedClassId, setSelectedClassId] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [classError, setClassError] = useState("");
  const [classMessage, setClassMessage] = useState("");
  const [loadingClasses, setLoadingClasses] = useState(true);

  // Data state for selected class
  const [materials, setMaterials] = useState([]);
  const [quizzes, setQuizzes] = useState([]);
  const [progress, setProgress] = useState(null);
  const [loadingData, setLoadingData] = useState(false);
  const [dataError, setDataError] = useState("");

  // AI Chat state
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! Ask me anything about the materials in your joined classes.' }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Initial data fetch
  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("user_role");
    if (!storedUserId || storedUserRole !== "student") {
      navigate("/login");
    } else {
      setUser({ id: storedUserId, role: storedUserRole });
      fetchMyClasses();
    }
  }, [navigate]);

  // Fetch data when a class is selected
  useEffect(() => {
    if (selectedClassId) {
      fetchClassData(selectedClassId);
    }
  }, [selectedClassId]);

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMyClasses = async () => {
    setLoadingClasses(true);
    try {
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
    setDataError("");
    try {
      const materialsPromise = api.get(`/materials/${classId}`);
      const quizzesPromise = api.get(`/quizzes/${classId}`);
      const progressPromise = api.get(`/progress/my/${classId}`);
      const [materialsRes, quizzesRes, progressRes] = await Promise.all([
        materialsPromise,
        quizzesPromise,
        progressPromise,
      ]);
      setMaterials(materialsRes.data || []);
      setQuizzes(quizzesRes.data || []);
      setProgress(progressRes.data || null);
    } catch (error) {
      setDataError("Failed to load class data. Please try selecting the class again.");
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
      setClassMessage(`Successfully joined class!`);
      setJoinCode("");
      fetchMyClasses();
    } catch (err) {
      setClassError(err.response?.data?.detail || "Failed to join class.");
    }
  };

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

  if (!user) return <div className="p-6">Loading...</div>;

  return (
    <div className="space-y-8">
      <header><h1 className="text-3xl font-bold">Student Dashboard</h1></header>

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
        loadingData ? <p className="text-center py-10">Loading class data...</p> : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border flex flex-col h-[600px]">
              <div className="p-6 border-b border-border"><h2 className="text-xl font-semibold">AI Learning Assistant</h2></div>
              <div className="p-6 flex-1 overflow-y-auto">
                <div className="space-y-6">
                  {messages.map((msg, index) => (
                    <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                      {msg.sender === 'ai' && <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground flex-shrink-0"><Bot size={20}/></div>}
                      <div className={`px-4 py-3 rounded-2xl max-w-xl ${msg.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-muted-foreground rounded-bl-none'}`}><p className="text-sm" style={{whiteSpace: "pre-wrap"}}>{msg.text}</p></div>
                      {msg.sender === 'user' && <div className="w-9 h-9 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground flex-shrink-0"><User size={20}/></div>}
                    </div>
                  ))}
                  {isTyping && <div className="flex items-start gap-3"><div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground flex-shrink-0"><Bot size={20}/></div><div className="px-4 py-3 rounded-2xl bg-muted text-muted-foreground"><div className="flex items-center justify-center gap-1.5"><span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span><span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span><span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></span></div></div></div>}
                  <div ref={chatEndRef} />
                </div>
              </div>
              <div className="p-4 bg-card border-t border-border">
                <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                  <input type="text" value={inputQuery} onChange={(e) => setInputQuery(e.target.value)} placeholder="Ask about materials in your classes..." className="flex-1 px-4 py-2 bg-input border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary" disabled={isTyping} />
                  <button type="submit" className="bg-primary text-primary-foreground p-3 rounded-full hover:bg-primary/90 disabled:bg-primary/50 transition-colors" disabled={isTyping || !inputQuery.trim()}><Send size={20} /></button>
                </form>
              </div>
            </div>
            {progress && (
              <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border p-6">
                <h2 className="text-xl font-semibold mb-4">My Progress in This Class</h2>
                <div className="space-y-6">
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Materials Progress</h3>
                    <div className="flex items-center gap-4"><div className="text-3xl font-bold text-primary">{progress.overall_progress}%</div><div className="text-sm text-muted-foreground">{progress.materials_completed} of {progress.total_materials} completed</div></div>
                    <div className="w-full bg-muted rounded-full h-2.5 mt-4"><div className="bg-primary h-2.5 rounded-full" style={{ width: `${(progress.materials_completed/progress.total_materials)*100}%` }}></div></div>
                  </div>
                  <div className="border rounded-lg p-4">
                    <h3 className="font-semibold mb-2">Quizzes Progress</h3>
                    <div className="flex items-center gap-4"><div className="text-3xl font-bold text-green-600">{progress.overall_progress}%</div><div className="text-sm text-muted-foreground">{progress.quizzes_attempted} of {progress.total_quizzes} completed</div></div>
                    <div className="w-full bg-muted rounded-full h-2.5 mt-4"><div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${(progress.quizzes_attempted/progress.total_quizzes)*100}%` }}></div></div>
                  </div>
                </div>
              </div>
            )}
          </div>
          <div className="lg:col-span-1 space-y-8">
            <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border">
              <div className="p-6"><h2 className="text-xl font-semibold">Available Materials</h2></div>
              <div className="px-6 pb-6">
                <ul className="space-y-3 max-h-80 overflow-y-auto">
                  {materials.length > 0 ? materials.map(material => (
                    <li key={material.id} className="p-3 rounded-lg bg-muted/50 flex items-center gap-3"><BookCopy className="text-primary flex-shrink-0" size={20} /><div><p className="font-semibold text-sm">{material.topic}</p><p className="text-xs text-muted-foreground">{material.filename}</p></div></li>
                  )) : <p className="text-muted-foreground text-sm">No materials in this class.</p>}
                </ul>
              </div>
            </div>
            <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border">
              <div className="p-6"><h2 className="text-xl font-semibold">Available Quizzes</h2></div>
              <div className="px-6 pb-6">
                <ul className="space-y-3 max-h-80 overflow-y-auto">
                  {quizzes.length > 0 ? quizzes.map(quiz => (
                    <li key={quiz.id} className="p-3 rounded-lg bg-muted/50 flex justify-between items-center"><div><p className="font-semibold text-sm">{quiz.topic}</p><p className="text-xs text-muted-foreground">Type: {quiz.type}</p></div><Link to={`/student/quiz/${quiz.id}`} className="bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90 transition-colors"><PlayCircle size={18} /></Link></li>
                  )) : <p className="text-muted-foreground text-sm">No quizzes in this class.</p>}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ))
       : (
        <div className="text-center py-10 bg-card rounded-lg shadow-md border border-border">
          <Users size={48} className="mx-auto text-muted-foreground mb-4" />
          <h2 className="text-xl font-semibold">Welcome!</h2>
          <p className="text-muted-foreground mt-2">Please join a class or select one from the dropdown above to begin.</p>
        </div>
      )}
    </div>
  );
}
