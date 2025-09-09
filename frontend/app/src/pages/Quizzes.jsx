import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE;

export default function Quizzes() {
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

  // AI Quiz Generation state
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiQuestions, setAiQuestions] = useState(null);
  const [aiError, setAiError] = useState(null);
  const [numQuestions, setNumQuestions] = useState(5);

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

  async function generateAIQuiz() {
    if (!classId || !topic) {
      alert("Please fill in Class ID and Topic first");
      return;
    }

    setAiGenerating(true);
    setAiError(null);
    setAiQuestions(null);

    try {
      const payload = {
        topic,
        class_id: classId,
        question_type: type,
        num_questions: numQuestions,
      };

      const res = await fetch(`${API}/ai/generate-quiz`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setAiQuestions(data);

      // Auto-fill the questions form with AI-generated questions
      if (data.questions && Array.isArray(data.questions)) {
        setQuestions(
          data.questions.map((q) => ({
            text: q.text || "",
            options: q.options || [""],
            answer: q.answer || "",
          }))
        );
        setTab("create"); // Switch to create tab to show the questions
      }
    } catch (err) {
      setAiError(String(err));
    } finally {
      setAiGenerating(false);
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
        <button
          className={`px-3 py-1 rounded border ${
            tab === "ai-generate" ? "bg-gray-100" : ""
          }`}
          onClick={() => setTab("ai-generate")}
        >
          AI Generate Quiz
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

      {tab === "ai-generate" && (
        <div className="space-y-4 max-w-3xl">
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
            <h3 className="font-medium text-blue-900 mb-2">
              AI Quiz Generator
            </h3>
            <p className="text-sm text-blue-700">
              Generate quiz questions automatically using Gemini AI based on
              uploaded materials.
            </p>
          </div>

          <form className="space-y-4">
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
                max={20}
                placeholder="Number of questions"
                value={numQuestions}
                onChange={(e) => setNumQuestions(Number(e.target.value))}
              />
            </div>

            <button
              type="button"
              className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
              onClick={generateAIQuiz}
              disabled={aiGenerating || !classId || !topic}
            >
              {aiGenerating ? "Generating..." : "Generate Quiz with AI"}
            </button>
          </form>

          {aiError && (
            <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
              {aiError}
            </div>
          )}

          {aiQuestions && (
            <div className="bg-green-50 p-4 rounded-lg border border-green-200">
              <h4 className="font-medium text-green-900 mb-2">
                ✅ AI Quiz Generated Successfully!
              </h4>
              <p className="text-sm text-green-700 mb-3">{aiQuestions.note}</p>
              <div className="text-sm text-green-600">
                <p>Generated {aiQuestions.questions?.length || 0} questions</p>
                <p>Questions have been auto-filled in the "Create Quiz" tab</p>
              </div>
            </div>
          )}

          <div className="text-sm text-gray-600">
            <p>
              Note: This feature uses Gemini AI to analyze uploaded materials
              and generate relevant questions. The generated questions will
              automatically populate the quiz creation form.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
