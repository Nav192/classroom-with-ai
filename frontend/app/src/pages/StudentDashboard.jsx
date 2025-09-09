import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BookCopy, Send, User, Bot, PlayCircle } from "lucide-react";
import api from "../services/api";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Hello! Ask me anything about the available materials.' }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  const [progress, setProgress] = useState(null);
  const [loadingProgress, setLoadingProgress] = useState(true);
  const [progressError, setProgressError] = useState(null);

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("user_role");

    if (!storedUserId || storedUserRole !== "student") {
      navigate("/login");
    } else {
      setUser({ id: storedUserId, role: storedUserRole });
      fetchMaterials();
      fetchQuizzes();
      fetchProgress(storedUserId);
    }
  }, [navigate]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const fetchMaterials = async () => {
    try {
      setLoadingMaterials(true);
      const response = await api.get("/materials");
      setMaterials(response.data);
    } catch (err) {
      console.error("Failed to load materials:", err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const fetchQuizzes = async () => {
    try {
      setLoadingQuizzes(true);
      const response = await api.get("/quizzes");
      setQuizzes(response.data);
    } catch (err) {
      console.error("Failed to load quizzes:", err);
    } finally {
      setLoadingQuizzes(false);
    }
  };

  const fetchProgress = async (studentId) => {
    try {
      setLoadingProgress(true);
      const response = await api.get(`/progress/${studentId}`);
      setProgress(response.data);
    } catch (err) {
      setProgressError("Failed to load your progress.");
      console.error(err);
    } finally {
      setLoadingProgress(false);
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
        <header className="flex justify-between items-center">
            <h1 className="text-3xl font-bold">Student Dashboard</h1>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Left Column */}
            <div className="lg:col-span-2 space-y-8">
                {/* AI Chat Section */}
                <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border flex flex-col h-[600px]">
                    <div className="p-6 border-b border-border">
                        <h2 className="text-xl font-semibold">AI Learning Assistant</h2>
                    </div>
                    <div className="p-6 flex-1 overflow-y-auto">
                        <div className="space-y-6">
                            {messages.map((msg, index) => (
                                <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    {msg.sender === 'ai' && <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground flex-shrink-0"><Bot size={20}/></div>}
                                    <div className={`px-4 py-3 rounded-2xl max-w-xl ${msg.sender === 'user' ? 'bg-primary text-primary-foreground rounded-br-none' : 'bg-muted text-muted-foreground rounded-bl-none'}`}>
                                        <p className="text-sm" style={{whiteSpace: "pre-wrap"}}>{msg.text}</p>
                                    </div>
                                    {msg.sender === 'user' && <div className="w-9 h-9 bg-secondary rounded-full flex items-center justify-center text-secondary-foreground flex-shrink-0"><User size={20}/></div>}
                                </div>
                            ))}
                            {isTyping && (
                                <div className="flex items-start gap-3">
                                    <div className="w-9 h-9 bg-primary rounded-full flex items-center justify-center text-primary-foreground flex-shrink-0"><Bot size={20}/></div>
                                    <div className="px-4 py-3 rounded-2xl bg-muted text-muted-foreground">
                                        <div className="flex items-center justify-center gap-1.5">
                                            <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                                            <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                                            <span className="h-2 w-2 bg-muted-foreground rounded-full animate-bounce"></span>
                                        </div>
                                    </div>
                                </div>
                            )}
                            <div ref={chatEndRef} />
                        </div>
                    </div>
                    <div className="p-4 bg-card border-t border-border">
                        <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                            <input
                                type="text"
                                value={inputQuery}
                                onChange={(e) => setInputQuery(e.target.value)}
                                placeholder="Type your question here..."
                                className="flex-1 px-4 py-2 bg-input border border-border rounded-full focus:outline-none focus:ring-2 focus:ring-primary"
                                disabled={isTyping}
                            />
                            <button
                                type="submit"
                                className="bg-primary text-primary-foreground p-3 rounded-full hover:bg-primary/90 disabled:bg-primary/50 transition-colors"
                                disabled={isTyping || !inputQuery.trim()}
                            >
                                <Send size={20} />
                            </button>
                        </form>
                    </div>
                </div>

                {/* My Progress Section */}
                <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold">My Learning Progress</h2>
                    </div>
                    <div className="p-6">
                        {loadingProgress ? <p>Loading progress...</p> : (
                            <>
                                {progressError && <p className="text-destructive text-sm mb-4">{progressError}</p>}
                                {progress ? (
                                    <div className="space-y-6">
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                            {/* Materials Progress */}
                                            <div className="border rounded-lg p-4">
                                                <h3 className="font-semibold mb-2">Materials Progress</h3>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-3xl font-bold text-primary">{progress.materials.percentage}%</div>
                                                    <div className="text-sm text-muted-foreground">{progress.materials.completed} of {progress.materials.total} completed</div>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-2.5 mt-4">
                                                    <div className="bg-primary h-2.5 rounded-full" style={{ width: `${progress.materials.percentage}%` }}></div>
                                                </div>
                                            </div>
                                            {/* Quizzes Progress */}
                                            <div className="border rounded-lg p-4">
                                                <h3 className="font-semibold mb-2">Quizzes Progress</h3>
                                                <div className="flex items-center gap-4">
                                                    <div className="text-3xl font-bold text-green-600">{progress.quizzes.percentage}%</div>
                                                    <div className="text-sm text-muted-foreground">{progress.quizzes.completed} of {progress.quizzes.total} completed</div>
                                                </div>
                                                <div className="w-full bg-muted rounded-full h-2.5 mt-4">
                                                    <div className="bg-green-600 h-2.5 rounded-full" style={{ width: `${progress.quizzes.percentage}%` }}></div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <p className="text-muted-foreground">No progress data available.</p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Right Column */}
            <div className="lg:col-span-1 space-y-8">
                {/* Available Materials Section */}
                <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold">Available Materials</h2>
                    </div>
                    <div className="px-6 pb-6">
                        {loadingMaterials ? <p>Loading...</p> : (
                            <ul className="space-y-3 max-h-80 overflow-y-auto">
                                {materials.map(material => (
                                    <li key={material.id} className="p-3 rounded-lg bg-muted/50">
                                        <div className="flex items-center gap-3">
                                            <BookCopy className="text-primary flex-shrink-0" size={20} />
                                            <div>
                                                <p className="font-semibold text-sm">{material.topic}</p>
                                                <p className="text-xs text-muted-foreground">Class: {material.class_id}</p>
                                            </div>
                                        </div>
                                    </li>
                                ))}
                            </ul>
                        )}
                    </div>
                </div>

                {/* Available Quizzes Section */}
                <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border">
                    <div className="p-6">
                        <h2 className="text-xl font-semibold">Available Quizzes</h2>
                    </div>
                    <div className="px-6 pb-6">
                        {loadingQuizzes ? <p>Loading...</p> : (
                            <ul className="space-y-3 max-h-80 overflow-y-auto">
                                {quizzes.length > 0 ? quizzes.map(quiz => (
                                    <li key={quiz.id} className="p-3 rounded-lg bg-muted/50 flex justify-between items-center">
                                        <div>
                                            <p className="font-semibold text-sm">{quiz.topic}</p>
                                            <p className="text-xs text-muted-foreground">Class: {quiz.class_id} | Type: {quiz.type}</p>
                                        </div>
                                        <Link 
                                            to={`/student/quiz/${quiz.id}`}
                                            className="bg-primary text-primary-foreground p-2 rounded-full hover:bg-primary/90 transition-colors"
                                        >
                                            <PlayCircle size={18} />
                                        </Link>
                                    </li>
                                )) : <p className="text-muted-foreground text-sm">No quizzes available yet.</p>}
                            </ul>
                        )}
                    </div>
                </div>
            </div>
        </div>
    </div>
  );
}