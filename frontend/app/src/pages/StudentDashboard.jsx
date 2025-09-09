import { useEffect, useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { BookCopy, Send, User, Bot, PlayCircle } from "lucide-react";
import api from "../services/api";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // Materials State
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  // Quizzes State
  const [quizzes, setQuizzes] = useState([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);

  // Chat State
  const [messages, setMessages] = useState([
    { sender: 'ai', text: 'Halo! Tanyakan apa saja tentang materi yang tersedia.' }
  ]);
  const [inputQuery, setInputQuery] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Progress State
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
      fetchProgress(storedUserId); // Fetch student's own progress
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
      console.error("Gagal memuat materi:", err);
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
      console.error("Gagal memuat kuis:", err);
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
      setProgressError(err.response?.data?.detail || "Gagal memuat progres Anda.");
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
      const errorMessage = { sender: 'ai', text: 'Maaf, terjadi kesalahan. Coba lagi nanti.' };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (!user) return <div className="p-6">Memuat...</div>;

  return (
    <div className="flex h-screen bg-gray-100 font-sans">
      {/* Left Sidebar for Materials and Quizzes */}
      <aside className="w-1/3 lg:w-1/4 bg-white p-6 overflow-y-auto border-r flex flex-col">
        <h2 className="text-xl font-bold mb-4 text-gray-800">Materi Tersedia</h2>
        {loadingMaterials ? <p>Memuat...</p> : (
          <ul className="space-y-3 mb-6">
            {materials.map(material => (
              <li key={material.id} className="p-3 rounded-lg hover:bg-gray-50">
                <div className="flex items-center gap-3">
                    <BookCopy className="text-indigo-500 flex-shrink-0" size={20} />
                    <div>
                        <p className="font-semibold text-sm text-gray-700">{material.topic}</p>
                        <p className="text-xs text-gray-500">Kelas: {material.class_id}</p>
                    </div>
                </div>
              </li>
            ))}
          </ul>
        )}

        <h2 className="text-xl font-bold mb-4 text-gray-800">Kuis Tersedia</h2>
        {loadingQuizzes ? <p>Memuat...</p> : (
          <ul className="space-y-3">
            {quizzes.length > 0 ? quizzes.map(quiz => (
              <li key={quiz.id} className="p-3 rounded-lg hover:bg-gray-50 flex justify-between items-center">
                <div>
                  <p className="font-semibold text-sm">{quiz.topic}</p>
                  <p className="text-xs text-gray-500">Kelas: {quiz.class_id} | Tipe: {quiz.type}</p>
                </div>
                <Link 
                  to={`/student/quiz/${quiz.id}`}
                  className="bg-blue-500 text-white p-2 rounded-full hover:bg-blue-600 transition"
                >
                  <PlayCircle size={18} />
                </Link>
              </li>
            )) : <p className="text-gray-500 text-sm">Belum ada kuis tersedia.</p>}
          </ul>
        )}

        <div className="mt-auto pt-4">
            <button
                onClick={handleLogout}
                className="w-full bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
            >
                Logout
            </button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="flex-1 flex flex-col h-screen">
        <header className="p-4 bg-white border-b text-center">
          <h1 className="text-2xl font-bold text-gray-800">Dasbor Siswa</h1>
        </header>

        <div className="flex-1 p-6 overflow-y-auto bg-gray-50 grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* AI Chat Section */}
          <div className="flex flex-col bg-white rounded-lg shadow-md p-4">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Asisten Belajar AI</h2>
            <div className="flex-1 overflow-y-auto mb-4">
              <div className="space-y-6">
                {messages.map((msg, index) => (
                  <div key={index} className={`flex items-start gap-3 ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.sender === 'ai' && <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-white flex-shrink-0"><Bot size={20}/></div>}
                    <div className="px-4 py-3 rounded-2xl max-w-xl ${msg.sender === 'user' ? 'bg-blue-500 text-white rounded-br-none' : 'bg-white text-gray-800 rounded-bl-none shadow-sm'}">
                  <p className="text-sm" style={{whiteSpace: "pre-wrap"}}>{msg.text}</p>
                </div>
                 {msg.sender === 'user' && <div className="w-9 h-9 bg-blue-500 rounded-full flex items-center justify-center text-white flex-shrink-0"><User size={20}/></div>}
              </div>
            ))}
            {isTyping && (
              <div className="flex items-start gap-3">
                <div className="w-9 h-9 bg-indigo-500 rounded-full flex items-center justify-center text-white flex-shrink-0"><Bot size={20}/></div>
                <div className="px-4 py-3 rounded-2xl bg-white text-gray-800 shadow-sm">
                  <div className="flex items-center justify-center gap-1.5">
                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                    <span className="h-2 w-2 bg-gray-400 rounded-full animate-bounce"></span>
                  </div>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>
        </div>
            <footer className="p-4 bg-white border-t">
              <form onSubmit={handleSendMessage} className="flex items-center gap-3">
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder="Ketik pertanyaan Anda di sini..."
                  className="flex-1 px-4 py-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-indigo-400"
                  disabled={isTyping}
                />
                <button
                  type="submit"
                  className="bg-indigo-600 text-white p-3 rounded-full hover:bg-indigo-700 disabled:bg-indigo-300 transition-colors"
                  disabled={isTyping || !inputQuery.trim()}
                >
                  <Send size={20} />
                </button>
              </form>
            </footer>
          </div>

          {/* Student Progress Section */}
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Progres Belajar Saya</h2>
            {loadingProgress ? <p>Memuat progres...</p> : (
              <>
                {progressError && <p className="text-red-600 text-sm mb-4">{progressError}</p>}
                {progress ? (
                  <div className="space-y-6">
                    {/* Overall Progress */}
                    <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
                      <h3 className="text-xl font-semibold mb-2">Progres Keseluruhan</h3>
                      <div className="text-4xl font-bold">
                        {progress.overall_percentage}%
                      </div>
                      <div className="text-blue-100">Selesai</div>
                    </div>

                    {/* Materials Progress */}
                    <div className="border rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Progres Materi</h3>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-2xl font-bold text-blue-600">
                          {progress.materials.percentage}%
                        </div>
                        <div className="text-gray-600">
                          {progress.materials.completed} dari {progress.materials.total} materi selesai
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${progress.materials.percentage}%` }}
                        ></div>
                      </div>
                      <h4 className="font-medium mt-4 mb-2">Detail Materi:</h4>
                      <ul className="space-y-2 text-sm max-h-40 overflow-y-auto">
                        {progress.materials.progress.length > 0 ? (
                          progress.materials.progress.map((m) => (
                            <li key={m.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                              <span className="text-gray-700">Materi ID: {m.material_id.slice(0, 8)}...</span>
                              <span
                                className={`px-2 py-1 rounded text-xs font-semibold ${m.status === "completed" ? "bg-green-100 text-green-800" :                                  m.status === "completed" ? "bg-green-100 text-green-800" :
                                  m.status === "in_progress" ? "bg-yellow-100 text-yellow-800" :
                                  "bg-gray-100 text-gray-800"
                                }`}
                              >
                                {m.status}
                              </span>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-500">Belum ada progres materi tercatat.</li>
                        )}
                      </ul>
                    </div>

                    {/* Quizzes Progress */}
                    <div className="border rounded-lg p-6">
                      <h3 className="text-lg font-semibold mb-4">Progres Kuis</h3>
                      <div className="flex items-center gap-4 mb-4">
                        <div className="text-2xl font-bold text-green-600">
                          {progress.quizzes.percentage}%
                        </div>
                        <div className="text-gray-600">
                          {progress.quizzes.completed} dari {progress.quizzes.total} kuis selesai
                        </div>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className="bg-green-600 h-3 rounded-full transition-all duration-300"
                          style={{ width: `${progress.quizzes.percentage}%` }}
                        ></div>
                      </div>
                      <h4 className="font-medium mt-4 mb-2">Hasil Kuis Terbaru:</h4>
                      <ul className="space-y-2 text-sm max-h-40 overflow-y-auto">
                        {progress.quizzes.results.length > 0 ? (
                          progress.quizzes.results.map((r) => (
                            <li key={r.id} className="flex justify-between items-center p-2 bg-gray-50 rounded-md">
                              <span className="text-gray-700">Kuis ID: {r.quiz_id.slice(0, 8)}...</span>
                              <span className="text-gray-600">Skor: {r.score}/{r.total}</span>
                            </li>
                          ))
                        ) : (
                          <li className="text-gray-500">Belum ada hasil kuis tercatat.</li>
                        )}
                      </ul>
                    </div>
                  </div>
                ) : (
                  <p className="text-gray-500">Tidak ada data progres yang tersedia.</p>
                )}
              </>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}