import { useEffect, useState } from "react";
import { BrowserRouter, Routes, Route, Link, Navigate } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE;

function Home() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    fetch(`${API.replace(/\/$/, "")}/../health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(console.error);
  }, []);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">RAG Learning Platform</h1>
      <pre className="text-sm bg-gray-100 p-3 rounded">
        {JSON.stringify(health, null, 2)}
      </pre>
    </div>
  );
}

function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      localStorage.setItem("access_token", data.access_token);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-md">
      <h2 className="text-lg font-semibold">Login</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border rounded px-3 py-2"
          required
        />
        <button
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Loading..." : "Login"}
        </button>
      </form>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {result && (
        <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}

function Materials() {
  const [classId, setClassId] = useState("");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const params = new URLSearchParams();
      if (classId) params.set("class_id", classId);
      if (topic) params.set("topic", topic);
      const res = await fetch(`${API}/materials?${params.toString()}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpload(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("class_id", classId);
      form.append("topic", topic);
      form.append("file_type", fileType);
      const res = await fetch(`${API}/materials`, {
        method: "POST",
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      setFile(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">Materials</h2>
      <form
        onSubmit={onUpload}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end max-w-3xl"
      >
        <div>
          <label className="block text-sm mb-1">Class ID</label>
          <input
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="XI-IPA-1"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">Topic</label>
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Fisika - Gelombang"
            required
          />
        </div>
        <div>
          <label className="block text-sm mb-1">File Type</label>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="pdf">PDF</option>
            <option value="ppt">PPT</option>
            <option value="txt">TXT</option>
          </select>
        </div>
        <div>
          <label className="block text-sm mb-1">File</label>
          <input
            type="file"
            accept=".pdf,.ppt,.pptx,.txt"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="w-full border rounded px-3 py-2"
            required
          />
        </div>
        <div>
          <button
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Daftar Materi</h3>
          <button onClick={load} className="text-sm text-blue-600">
            Refresh
          </button>
        </div>
        <div className="border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Class</th>
                <th className="text-left p-2">Topic</th>
                <th className="text-left p-2">Filename</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-2">{m.class_id}</td>
                  <td className="p-2">{m.topic}</td>
                  <td className="p-2">{m.filename}</td>
                  <td className="p-2">{m.file_type}</td>
                  <td className="p-2">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-2 text-gray-500" colSpan={5}>
                    Belum ada materi.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

function Quizzes() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Quizzes</h2>
      <p>Buat & kerjakan kuis.</p>
    </div>
  );
}

function Results() {
  return (
    <div className="p-6 space-y-4">
      <h2 className="text-lg font-semibold">Results</h2>
      <p>Riwayat hasil kuis.</p>
    </div>
  );
}

function Chat() {
  const [query, setQuery] = useState("");
  const [answer, setAnswer] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function ask(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setAnswer(null);
    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error(await res.text());
      setAnswer(await res.json());
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-2xl">
      <h2 className="text-lg font-semibold">AI Chat</h2>
      <form onSubmit={ask} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tanyakan materi..."
          className="flex-1 border rounded px-3 py-2"
        />
        <button
          disabled={loading}
          className="bg-indigo-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Mengirim..." : "Kirim"}
        </button>
      </form>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {answer && (
        <pre className="text-sm bg-gray-100 p-3 rounded overflow-auto">
          {JSON.stringify(answer, null, 2)}
        </pre>
      )}
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen">
        <nav className="flex gap-4 p-4 border-b">
          <Link to="/">Home</Link>
          <Link to="/login">Login</Link>
          <Link to="/materials">Materials</Link>
          <Link to="/quizzes">Quizzes</Link>
          <Link to="/results">Results</Link>
          <Link to="/chat">AI Chat</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/results" element={<Results />} />
          <Route path="/chat" element={<Chat />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
