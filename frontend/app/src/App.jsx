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
  const [tab, setTab] = useState("create");
  // Create quiz state
  const [classId, setClassId] = useState("");
  const [topic, setTopic] = useState("");
  const [type, setType] = useState("mcq");
  const [duration, setDuration] = useState(15);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [questions, setQuestions] = useState([
    { text: "", options: [""], answer: "" },
  ]);
  const [creating, setCreating] = useState(false);
  const [createMsg, setCreateMsg] = useState(null);

  // Take quiz state
  const [quizId, setQuizId] = useState("");
  const [quizPayload, setQuizPayload] = useState(null);
  const [answers, setAnswers] = useState({});
  const [userId, setUserId] = useState("");
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [attemptsUsed, setAttemptsUsed] = useState(0);
  const [blurred, setBlurred] = useState(false); // anti-cheat flag
  const [submitMsg, setSubmitMsg] = useState(null);

  // Anti-cheat basic: detect tab switch
  useEffect(() => {
    function onBlur() {
      setBlurred(true);
    }
    window.addEventListener("blur", onBlur);
    return () => window.removeEventListener("blur", onBlur);
  }, []);

  function updateQuestion(idx, field, value) {
    setQuestions((prev) =>
      prev.map((q, i) => (i === idx ? { ...q, [field]: value } : q))
    );
  }
  function updateOption(qIdx, oIdx, value) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx
          ? {
              ...q,
              options: q.options?.map((o, j) => (j === oIdx ? value : o)),
            }
          : q
      )
    );
  }
  function addQuestion() {
    setQuestions((prev) => [
      ...prev,
      { text: "", options: type === "essay" ? undefined : [""], answer: "" },
    ]);
  }
  function addOption(qIdx) {
    setQuestions((prev) =>
      prev.map((q, i) =>
        i === qIdx ? { ...q, options: [...(q.options || []), ""] } : q
      )
    );
  }

  async function createQuiz(e) {
    e.preventDefault();
    setCreating(true);
    setCreateMsg(null);
    try {
      const payload = {
        class_id: classId,
        topic,
        type,
        duration_minutes: Number(duration),
        max_attempts: Number(maxAttempts),
        questions: questions.map((q) => ({
          text: q.text,
          type,
          options: type === "essay" ? undefined : q.options,
          answer: q.answer ?? "",
        })),
      };
      const res = await fetch(`${API}/quizzes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setCreateMsg(`Quiz created with ID: ${data.quiz?.id || "(unknown)"}`);
    } catch (err) {
      setCreateMsg(String(err));
    } finally {
      setCreating(false);
    }
  }

  async function fetchQuiz() {
    setSubmitMsg(null);
    setBlurred(false);
    const res = await fetch(`${API}/quizzes/${quizId}`);
    if (!res.ok) {
      setQuizPayload(null);
      return;
    }
    const data = await res.json();
    setQuizPayload(data);
    setAnswers({});
    setStartedAt(new Date().toISOString());
    setEndedAt(null);
    setTimeLeft((data?.quiz?.duration_minutes || 0) * 60);
  }

  // countdown timer
  useEffect(() => {
    if (!timeLeft) return;
    const t = setInterval(() => setTimeLeft((s) => (s > 0 ? s - 1 : 0)), 1000);
    return () => clearInterval(t);
  }, [timeLeft]);

  useEffect(() => {
    if (timeLeft === 0 && quizPayload && !endedAt) {
      handleSubmitAnswers();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeLeft]);

  function setAnswerFor(qid, value) {
    setAnswers((prev) => ({ ...prev, [qid]: value }));
  }

  async function handleSubmitAnswers() {
    if (!quizPayload) return;
    const now = new Date().toISOString();
    setEndedAt(now);
    const payload = {
      quiz_id: quizPayload.quiz.id,
      user_id: userId,
      answers: (quizPayload.questions || []).map((q) => ({
        question_id: q.id,
        response: String(answers[q.id] ?? ""),
      })),
      started_at: startedAt,
      ended_at: now,
    };
    try {
      const res = await fetch(`${API}/results/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setSubmitMsg(
        `Submitted. Score ${data?.result?.score}/${data?.result?.total}. ${
          blurred ? "(Tab switched detected)" : ""
        }`
      );
      setAttemptsUsed((a) => a + 1);
    } catch (err) {
      setSubmitMsg(String(err));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">Quizzes</h2>
      <div className="flex gap-4">
        <button
          className={`px-3 py-1 rounded border ${
            tab === "create" ? "bg-gray-100" : ""
          }`}
          onClick={() => setTab("create")}
        >
          Buat Kuis
        </button>
        <button
          className={`px-3 py-1 rounded border ${
            tab === "take" ? "bg-gray-100" : ""
          }`}
          onClick={() => setTab("take")}
        >
          Kerjakan Kuis
        </button>
      </div>

      {tab === "create" && (
        <form onSubmit={createQuiz} className="space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <input
              className="border rounded px-3 py-2"
              placeholder="Class ID"
              value={classId}
              onChange={(e) => setClassId(e.target.value)}
              required
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="Topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              required
            />
            <select
              className="border rounded px-3 py-2"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              <option value="mcq">MCQ</option>
              <option value="true_false">True/False</option>
              <option value="essay">Essay</option>
            </select>
            <input
              className="border rounded px-3 py-2"
              type="number"
              min={1}
              placeholder="Duration (minutes)"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              type="number"
              min={1}
              placeholder="Max attempts"
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(e.target.value)}
            />
          </div>
          <div className="space-y-4">
            {questions.map((q, i) => (
              <div key={i} className="border rounded p-3 space-y-2">
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder={`Question ${i + 1}`}
                  value={q.text}
                  onChange={(e) => updateQuestion(i, "text", e.target.value)}
                />
                {type !== "essay" && (
                  <div className="space-y-2">
                    <div className="text-sm text-gray-600">Options</div>
                    {(q.options || []).map((opt, j) => (
                      <input
                        key={j}
                        className="w-full border rounded px-3 py-2"
                        placeholder={`Option ${j + 1}`}
                        value={opt}
                        onChange={(e) => updateOption(i, j, e.target.value)}
                      />
                    ))}
                    <button
                      type="button"
                      onClick={() => addOption(i)}
                      className="text-sm text-blue-600"
                    >
                      + Add option
                    </button>
                  </div>
                )}
                <input
                  className="w-full border rounded px-3 py-2"
                  placeholder="Answer (for auto-grade)"
                  value={q.answer}
                  onChange={(e) => updateQuestion(i, "answer", e.target.value)}
                />
              </div>
            ))}
            <button
              type="button"
              onClick={addQuestion}
              className="text-sm text-blue-600"
            >
              + Add question
            </button>
          </div>
          <button
            disabled={creating}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            {creating ? "Creating..." : "Create Quiz"}
          </button>
          {createMsg && <div className="text-sm">{createMsg}</div>}
        </form>
      )}

      {tab === "take" && (
        <div className="space-y-4 max-w-3xl">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 items-end">
            <input
              className="border rounded px-3 py-2"
              placeholder="Quiz ID"
              value={quizId}
              onChange={(e) => setQuizId(e.target.value)}
            />
            <input
              className="border rounded px-3 py-2"
              placeholder="User ID"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
            />
            <button
              onClick={fetchQuiz}
              className="bg-gray-200 px-3 py-2 rounded"
            >
              Load Quiz
            </button>
          </div>
          {quizPayload && (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="font-medium">{quizPayload.quiz.topic}</div>
                <div className="text-sm text-gray-600">
                  Time left: {Math.floor(timeLeft / 60)}:
                  {String(timeLeft % 60).padStart(2, "0")}
                </div>
                {blurred && (
                  <div className="text-xs text-red-600">
                    Tab switched detected
                  </div>
                )}
              </div>
              <div className="space-y-4">
                {(quizPayload.questions || []).map((q, idx) => (
                  <div key={q.id} className="border rounded p-3">
                    <div className="mb-2">
                      {idx + 1}. {q.text}
                    </div>
                    {quizPayload.quiz.type === "mcq" && (
                      <div className="space-y-2">
                        {(q.options || []).map((opt, j) => (
                          <label key={j} className="flex items-center gap-2">
                            <input
                              type="radio"
                              name={`q-${q.id}`}
                              value={opt}
                              onChange={() => setAnswerFor(q.id, opt)}
                            />
                            <span>{opt}</span>
                          </label>
                        ))}
                      </div>
                    )}
                    {quizPayload.quiz.type === "true_false" && (
                      <div className="space-x-4">
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value="true"
                            onChange={() => setAnswerFor(q.id, "true")}
                          />
                          True
                        </label>
                        <label className="inline-flex items-center gap-2">
                          <input
                            type="radio"
                            name={`q-${q.id}`}
                            value="false"
                            onChange={() => setAnswerFor(q.id, "false")}
                          />
                          False
                        </label>
                      </div>
                    )}
                    {quizPayload.quiz.type === "essay" && (
                      <textarea
                        className="w-full border rounded px-3 py-2"
                        rows={4}
                        onChange={(e) => setAnswerFor(q.id, e.target.value)}
                      />
                    )}
                  </div>
                ))}
              </div>
              <button
                onClick={handleSubmitAnswers}
                disabled={!userId || timeLeft === 0}
                className="bg-green-600 text-white px-4 py-2 rounded"
              >
                Submit
              </button>
              {submitMsg && <div className="text-sm">{submitMsg}</div>}
              <div className="text-xs text-gray-600">
                Attempts used: {attemptsUsed}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Results() {
  const [userId, setUserId] = useState("");
  const [topic, setTopic] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadHistory() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      if (topic) params.set("topic", topic);
      const res = await fetch(
        `${API}/results/history/${userId}?${params.toString()}`
      );
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function downloadCSV() {
    try {
      const res = await fetch(`${API}/reports/results.csv`);
      if (!res.ok) throw new Error(await res.text());
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = "quiz_results.csv";
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      setError(String(err));
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">Results</h2>
      <div className="flex items-center gap-3 mb-4">
        <input
          className="border rounded px-3 py-2"
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <input
          className="border rounded px-3 py-2"
          placeholder="Topic (optional)"
          value={topic}
          onChange={(e) => setTopic(e.target.value)}
        />
        <button
          onClick={loadHistory}
          disabled={!userId || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Loading..." : "Load History"}
        </button>
        <button
          onClick={downloadCSV}
          className="bg-green-600 text-white px-4 py-2 rounded"
        >
          Download CSV
        </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="max-w-4xl">
        <h3 className="font-medium mb-2">Riwayat Hasil Kuis</h3>
        <div className="border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Quiz ID</th>
                <th className="text-left p-2">Score</th>
                <th className="text-left p-2">Total</th>
                <th className="text-left p-2">Started</th>
                <th className="text-left p-2">Ended</th>
                <th className="text-left p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="p-2">{r.quiz_id}</td>
                  <td className="p-2">{r.score}</td>
                  <td className="p-2">{r.total}</td>
                  <td className="p-2">
                    {r.started_at
                      ? new Date(r.started_at).toLocaleString()
                      : "-"}
                  </td>
                  <td className="p-2">
                    {r.ended_at ? new Date(r.ended_at).toLocaleString() : "-"}
                  </td>
                  <td className="p-2">
                    {new Date(r.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="text-gray-500 p-2" colSpan={6}>
                    Belum ada hasil kuis.
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

function Progress() {
  const [userId, setUserId] = useState("");
  const [progress, setProgress] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  async function loadProgress() {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/progress/${userId}`);
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setProgress(data);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">Progress Tracking</h2>
      <div className="flex items-center gap-3 mb-4">
        <input
          className="border rounded px-3 py-2"
          placeholder="User ID"
          value={userId}
          onChange={(e) => setUserId(e.target.value)}
        />
        <button
          onClick={loadProgress}
          disabled={!userId || loading}
          className="bg-blue-600 text-white px-4 py-2 rounded"
        >
          {loading ? "Loading..." : "Load Progress"}
        </button>
      </div>

      {error && <div className="text-red-600 text-sm">{error}</div>}

      {progress && (
        <div className="space-y-6">
          {/* Overall Progress */}
          <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 rounded-lg">
            <h3 className="text-xl font-semibold mb-2">Overall Progress</h3>
            <div className="text-4xl font-bold">
              {progress.overall_percentage}%
            </div>
            <div className="text-blue-100">Complete</div>
          </div>

          {/* Materials Progress */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Materials Progress</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-2xl font-bold text-blue-600">
                {progress.materials.percentage}%
              </div>
              <div className="text-gray-600">
                {progress.materials.completed} of {progress.materials.total}{" "}
                materials completed
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.materials.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Quizzes Progress */}
          <div className="border rounded-lg p-6">
            <h3 className="text-lg font-semibold mb-4">Quizzes Progress</h3>
            <div className="flex items-center gap-4 mb-4">
              <div className="text-2xl font-bold text-green-600">
                {progress.quizzes.percentage}%
              </div>
              <div className="text-gray-600">
                {progress.quizzes.completed} of {progress.quizzes.total} quizzes
                completed
              </div>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div
                className="bg-green-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.quizzes.percentage}%` }}
              ></div>
            </div>
          </div>

          {/* Detailed Progress Tables */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Materials Details */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Materials Status</h4>
              <div className="space-y-2 text-sm">
                {progress.materials.progress.length > 0 ? (
                  progress.materials.progress.map((m) => (
                    <div
                      key={m.id}
                      className="flex justify-between items-center"
                    >
                      <span className="text-gray-700">
                        {m.material_id?.slice(0, 8)}...
                      </span>
                      <span
                        className={`px-2 py-1 rounded text-xs ${
                          m.status === "completed"
                            ? "bg-green-100 text-green-800"
                            : m.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {m.status}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">
                    No materials progress recorded
                  </div>
                )}
              </div>
            </div>

            {/* Quiz Results */}
            <div className="border rounded-lg p-4">
              <h4 className="font-medium mb-3">Recent Quiz Results</h4>
              <div className="space-y-2 text-sm">
                {progress.quizzes.results.length > 0 ? (
                  progress.quizzes.results.slice(0, 5).map((r) => (
                    <div
                      key={r.id}
                      className="flex justify-between items-center"
                    >
                      <span className="text-gray-700">
                        {r.quiz_id?.slice(0, 8)}...
                      </span>
                      <span className="text-gray-600">
                        {r.score}/{r.total}
                      </span>
                    </div>
                  ))
                ) : (
                  <div className="text-gray-500">No quiz results yet</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
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
          <Link to="/progress">Progress</Link>
          <Link to="/chat">AI Chat</Link>
        </nav>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/login" element={<Login />} />
          <Route path="/materials" element={<Materials />} />
          <Route path="/quizzes" element={<Quizzes />} />
          <Route path="/results" element={<Results />} />
          <Route path="/progress" element={<Progress />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}
