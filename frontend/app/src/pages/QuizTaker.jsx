import { useEffect, useState, useCallback, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import api from "../services/api";

export default function QuizTaker() {
  const { quizId } = useParams();
  const navigate = useNavigate();
  const [quiz, setQuiz] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [answers, setAnswers] = useState({});
  const [timeLeft, setTimeLeft] = useState(0);
  const [startedAt, setStartedAt] = useState(null);
  const [endedAt, setEndedAt] = useState(null);
  const [submissionMessage, setSubmissionMessage] = useState("");
  const [attemptNumber, setAttemptNumber] = useState(1);
  const [resultId, setResultId] = useState(null);
  const [quizStarted, setQuizStarted] = useState(false);
  const [isSavingCheckpoint, setIsSavingCheckpoint] = useState(false);
  const saveTimeoutRef = useRef({});

  // Cheating detection states
  const [blurred, setBlurred] = useState(false);
  const [copyPasteDetected, setCopyPasteDetected] = useState(false);
  const [cheatingEventsCount, setCheatingEventsCount] = useState(0);

  // Function to send cheating event to backend
  const sendCheatingEvent = useCallback(
    async (eventType, details = null, currentResultId = null) => {
      try {
        await api.post("/results/cheating-log", {
          quiz_id: quizId,
          event_type: eventType,
          details: details,
          result_id: currentResultId,
        });
        setCheatingEventsCount((prev) => prev + 1);
      } catch (err) {
        console.error("Failed to log cheating event:", err);
      }
    },
    [quizId]
  );

  // Event listeners for cheating detection
  useEffect(() => {
    const handleBlur = () => {
      setBlurred(true);
      sendCheatingEvent("tab_switch", "User switched tabs/windows");
    };
    const handleFocus = () => setBlurred(false);
    const handleCopy = () => {
      setCopyPasteDetected(true);
      sendCheatingEvent("copy_paste", "User copied content");
    };
    const handlePaste = () => {
      setCopyPasteDetected(true);
      sendCheatingEvent("copy_paste", "User pasted content");
    };

    window.addEventListener("blur", handleBlur);
    window.addEventListener("focus", handleFocus);
    window.addEventListener("copy", handleCopy);
    window.addEventListener("paste", handlePaste);

    return () => {
      window.removeEventListener("blur", handleBlur);
      window.removeEventListener("focus", handleFocus);
      window.removeEventListener("copy", handleCopy);
      window.removeEventListener("paste", handlePaste);
    };
  }, [sendCheatingEvent]);

  const handleStartQuiz = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await api.post(`/quizzes/${quizId}/start`);
      const { result_id, started_at, attempt_number } = response.data;
      setResultId(result_id);
      setStartedAt(new Date(started_at));
      setAttemptNumber(attempt_number);
      setQuizStarted(true);

      const quizDetailsResponse = await api.get(`/quizzes/${quizId}/details`);
      setQuiz(quizDetailsResponse.data);

      const totalDurationSeconds =
        quizDetailsResponse.data.duration_minutes * 60;
      setTimeLeft(totalDurationSeconds);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to start quiz.");
      console.error("Error starting quiz:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/quizzes/${quizId}/details`);
        const quizData = response.data;
        setQuiz(quizData);

        if (quizData.result_id && quizData.started_at) {
          setResultId(quizData.result_id);

          const backendStartedAt = new Date(quizData.started_at);
          setStartedAt(backendStartedAt);

          const now = new Date();
          const elapsedSeconds = Math.floor(
            (now.getTime() - backendStartedAt.getTime()) / 1000
          );
          const totalDurationSeconds = quizData.duration_minutes * 60;
          const remainingTime = totalDurationSeconds - elapsedSeconds;

          setTimeLeft(remainingTime > 0 ? remainingTime : 0);
          setAttemptNumber(quizData.current_attempt_number);
          setQuizStarted(true);

          const checkpointsResponse = await api.get(
            `/quizzes/${quizId}/checkpoint?attempt_number=${quizData.current_attempt_number}`
          );
          if (checkpointsResponse.data && checkpointsResponse.data.length > 0) {
            const loadedAnswers = {};
            checkpointsResponse.data.forEach((cp) => {
              loadedAnswers[cp.question_id] = cp.answer;
            });
            setAnswers(loadedAnswers);
          }
        } else {
          setQuizStarted(false);
          setAttemptNumber(quizData.current_attempt_number);
        }
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to load quiz.");
        console.error("Error in fetchQuiz:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const saveCheckpoint = useCallback(
    async (questionId, answer, currentAttemptNumber) => {
      if (!quizId || !questionId || !answer || !currentAttemptNumber) return;

      setIsSavingCheckpoint(true);
      try {
        await api.post(`/quizzes/${quizId}/checkpoint`, {
          question_id: questionId,
          answer: answer,
          attempt_number: currentAttemptNumber,
        });
      } catch (err) {
        console.error("Failed to save checkpoint:", err);
      } finally {
        setIsSavingCheckpoint(false);
      }
    },
    [quizId]
  );

  const debouncedSaveCheckpoint = useCallback(
    (questionId, value, currentAttemptNumber) => {
      // Clear any existing timeout for this specific question
      if (saveTimeoutRef.current[questionId]) {
        clearTimeout(saveTimeoutRef.current[questionId]);
      }
      // Set a new timeout to save the checkpoint for this question after a delay
      saveTimeoutRef.current[questionId] = setTimeout(() => {
        saveCheckpoint(questionId, value, currentAttemptNumber);
      }, 1000); // 1-second delay
    },
    [saveCheckpoint]
  );

  const handleAnswerChange = (questionId, value) => {
    setAnswers((prev) => ({ ...prev, [questionId]: value }));
    debouncedSaveCheckpoint(questionId, value, attemptNumber);
  };

  const handleSubmit = useCallback(
    async (isAutoSubmit = false) => {
      if (endedAt) return;
      if (!resultId) {
        setSubmissionMessage("Error: Quiz attempt not properly started.");
        return;
      }

      // Clear all pending checkpoint saves before submitting
      if (saveTimeoutRef.current) {
        Object.values(saveTimeoutRef.current).forEach(clearTimeout);
      }

      const now = new Date();
      setEndedAt(now);

      const payload = {
        result_id: resultId,
        user_answers: answers,
      };

      try {
        const response = await api.post(`/quizzes/${quizId}/submit`, payload);
        if (cheatingEventsCount > 0) {
          sendCheatingEvent(
            "quiz_submission",
            `Quiz submitted with ${cheatingEventsCount} detected events.`,
            resultId
          );
        }
        setSubmissionMessage(
          `Quiz submitted successfully! Your score: ${response.data.score}.`
        );
      } catch (err) {
        setSubmissionMessage(
          err.response?.data?.detail || "Failed to submit quiz."
        );
      }
    },
    [endedAt, quizId, resultId, answers, cheatingEventsCount, sendCheatingEvent]
  );

  // Add a cleanup effect for component unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        Object.values(saveTimeoutRef.current).forEach(clearTimeout);
      }
    };
  }, []);

  useEffect(() => {
    if (timeLeft <= 0 || endedAt) return;

    const timer = setInterval(() => {
      setTimeLeft((prevTime) => {
        if (prevTime <= 1) {
          clearInterval(timer);
          handleSubmit(true);
          return 0;
        }
        return prevTime - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft, endedAt, handleSubmit]);

  if (loading) return <div className="p-6">Loading quiz...</div>;
  if (error) return <div className="p-6 text-destructive">{error}</div>;
  if (!quiz) return <div className="p-6">Quiz not found.</div>;

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = seconds % 60;
    return `${minutes}:${remainingSeconds < 10 ? "0" : ""}${remainingSeconds}`;
  };

  if (submissionMessage) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <div
          className={`p-8 rounded-lg shadow-md border ${
            submissionMessage.includes("successfully")
              ? "bg-green-100 border-green-200"
              : "bg-red-100 border-red-200"
          }`}
        >
          <h2 className="text-2xl font-bold mb-4">
            {submissionMessage.includes("successfully")
              ? "Quiz Submitted!"
              : "Submission Failed"}
          </h2>
          <p
            className={`text-lg ${
              submissionMessage.includes("successfully")
                ? "text-green-800"
                : "text-red-800"
            }`}
          >
            {submissionMessage}
          </p>
          <button
            type="button"
            onClick={() => navigate("/student/dashboard")}
            className="mt-6 bg-primary text-primary-foreground px-8 py-3 rounded-md hover:bg-primary/90 transition-colors"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card text-card-foreground p-8 rounded-lg shadow-md border border-border">
        <h1 className="text-3xl font-bold mb-2">{quiz.topic}</h1>
        <p className="text-muted-foreground mb-2">
          Class: {quiz.classes?.name || quiz.class_id} | Type: {quiz.type}
        </p>
        <p className="text-muted-foreground mb-6">
          Duration: {quiz.duration_minutes} minutes
        </p>

        {!quizStarted ? (
          <div className="text-center">
            <p className="text-lg mb-4">
              Click the button below to start the quiz.
            </p>
            <button
              type="button"
              onClick={handleStartQuiz}
              className="bg-primary text-primary-foreground px-8 py-3 rounded-md hover:bg-primary/90 transition-colors"
              disabled={loading}
            >
              Start Quiz
            </button>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6 p-3 bg-primary/10 rounded-md border border-primary/20">
              <span className="text-lg font-semibold text-primary">
                Time Left: {formatTime(timeLeft)}
              </span>
              {isSavingCheckpoint && (
                <span className="text-sm font-medium text-muted-foreground">
                  Saving...
                </span>
              )}
              {cheatingEventsCount > 0 && (
                <span className="text-sm font-medium text-destructive">
                  Suspicious activity detected! ({cheatingEventsCount} events)
                </span>
              )}
            </div>

            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSubmit();
              }}
              className="space-y-6"
            >
              {quiz.questions.map((q, index) => (
                <div key={q.id} className="border border-border p-4 rounded-lg">
                  <p className="font-medium mb-3">
                    {index + 1}. {q.text}
                  </p>

                  {q.type === "mcq" && (
                    <div className="space-y-2">
                      {q.options.map((option, optIndex) => (
                        <label
                          key={optIndex}
                          className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 cursor-pointer"
                        >
                          <input
                            type="radio"
                            name={`question-${q.id}`}
                            value={option}
                            onChange={() => handleAnswerChange(q.id, option)}
                            checked={answers[q.id] === option}
                            disabled={!!endedAt}
                            className="form-radio text-primary focus:ring-primary"
                          />
                          <span>{option}</span>
                        </label>
                      ))}
                    </div>
                  )}

                  {q.type === "true_false" && (
                    <div className="space-x-4">
                      <label className="inline-flex items-center gap-2 p-3 rounded-md hover:bg-muted/50 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          value="True"
                          onChange={() => handleAnswerChange(q.id, "True")}
                          checked={answers[q.id] === "True"}
                          disabled={!!endedAt}
                          className="form-radio text-primary focus:ring-primary"
                        />
                        <span>True</span>
                      </label>
                      <label className="inline-flex items-center gap-2 p-3 rounded-md hover:bg-muted/50 cursor-pointer">
                        <input
                          type="radio"
                          name={`question-${q.id}`}
                          value="False"
                          onChange={() => handleAnswerChange(q.id, "False")}
                          checked={answers[q.id] === "False"}
                          disabled={!!endedAt}
                          className="form-radio text-primary focus:ring-primary"
                        />
                        <span>False</span>
                      </label>
                    </div>
                  )}

                  {q.type === "essay" && (
                    <textarea
                      value={answers[q.id] || ""}
                      onChange={(e) => handleAnswerChange(q.id, e.target.value)}
                      placeholder="Type your answer here..."
                      rows="4"
                      disabled={!!endedAt}
                      className="w-full p-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                    ></textarea>
                  )}
                </div>
              ))}

              <div className="flex justify-end gap-4 pt-6 border-t border-border">
                <button
                  type="button"
                  onClick={async () => {
                    if (resultId) {
                      try {
                        await api.post(`/quizzes/${quizId}/cancel`, {
                          result_id: resultId,
                        });
                      } catch (err) {
                        console.error("Failed to cancel quiz attempt:", err);
                      }
                    }
                    navigate("/student/dashboard");
                  }}
                  className="bg-muted text-muted-foreground px-6 py-2 rounded-md hover:bg-muted/80 transition-colors"
                  disabled={!!endedAt}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 transition-colors disabled:opacity-50"
                  disabled={!!endedAt}
                >
                  Submit Quiz
                </button>
              </div>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
