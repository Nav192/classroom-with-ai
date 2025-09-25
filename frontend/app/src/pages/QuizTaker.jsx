import { useEffect, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
  const [submissionMessage, setSubmissionMessage] = useState('');
  
  // Cheating detection states
  const [blurred, setBlurred] = useState(false);
  const [copyPasteDetected, setCopyPasteDetected] = useState(false);
  const [cheatingEventsCount, setCheatingEventsCount] = useState(0);

  // Function to send cheating event to backend
  const sendCheatingEvent = useCallback(async (eventType, details = null, currentResultId = null) => {
    try {
      await api.post('/results/cheating-log', {
        quiz_id: quizId,
        event_type: eventType,
        details: details,
        result_id: currentResultId,
      });
      setCheatingEventsCount(prev => prev + 1);
    } catch (err) {
      console.error("Failed to log cheating event:", err);
    }
  }, [quizId]);

  // Event listeners for cheating detection
  useEffect(() => {
    const handleBlur = () => {
      setBlurred(true);
      sendCheatingEvent('tab_switch', 'User switched tabs/windows');
    };
    const handleFocus = () => setBlurred(false);
    const handleCopy = (e) => {
      setCopyPasteDetected(true);
      sendCheatingEvent('copy_paste', 'User copied content');
    };
    const handlePaste = (e) => {
      setCopyPasteDetected(true);
      sendCheatingEvent('copy_paste', 'User pasted content');
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    window.addEventListener('copy', handleCopy);
    window.addEventListener('paste', handlePaste);

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      window.removeEventListener('copy', handleCopy);
      window.removeEventListener('paste', handlePaste);
    };
  }, [sendCheatingEvent]);

  useEffect(() => {
    const fetchQuiz = async () => {
      try {
        setLoading(true);
        const response = await api.get(`/quizzes/${quizId}/details`);
        setQuiz(response.data);
        console.log("Fetched Quiz Data:", response.data); // Add this line
        setStartedAt(new Date());
        setTimeLeft(response.data.duration_minutes * 60);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load quiz.');
      } finally {
        setLoading(false);
      }
    };

    fetchQuiz();
  }, [quizId]);

  const handleAnswerChange = (questionId, value) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const handleSubmit = useCallback(async (isAutoSubmit = false) => {
    if (endedAt) return;

    const now = new Date();
    setEndedAt(now);

    const payload = {
      quiz_id: quiz.id,
      answers: quiz.questions.map(q => ({
        question_id: q.id,
        response: answers[q.id] || '',
      })),
      started_at: startedAt.toISOString(),
      ended_at: now.toISOString(),
    };

    try {
      const response = await api.post('/results/submit', payload);
      const submittedResultId = response.data.id;
      // Send any pending cheating logs with the result_id
      if (cheatingEventsCount > 0) {
        sendCheatingEvent('quiz_submission', `Quiz submitted with ${cheatingEventsCount} detected events.`, submittedResultId);
      }
      setSubmissionMessage(`Quiz submitted successfully! Your score: ${response.data.score}/${response.data.total}.`);
    } catch (err) {
      setSubmissionMessage(err.response?.data?.detail || 'Failed to submit quiz.');
    } 
  }, [endedAt, quiz, answers, startedAt, cheatingEventsCount, sendCheatingEvent]);

  useEffect(() => {
    if (timeLeft <= 0 || endedAt) return;

    const timer = setInterval(() => {
      setTimeLeft(prevTime => {
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
    return `${minutes}:${remainingSeconds < 10 ? '0' : ''}${remainingSeconds}`;
  };

  if (submissionMessage) {
    return (
      <div className="max-w-4xl mx-auto text-center py-16">
        <div className={`p-8 rounded-lg shadow-md border ${submissionMessage.includes('successfully') ? 'bg-green-100 border-green-200' : 'bg-red-100 border-red-200'}`}>
          <h2 className="text-2xl font-bold mb-4">{submissionMessage.includes('successfully') ? 'Quiz Submitted!' : 'Submission Failed'}</h2>
          <p className={`text-lg ${submissionMessage.includes('successfully') ? 'text-green-800' : 'text-red-800'}`}>{submissionMessage}</p>
          <button
            type="button"
            onClick={() => navigate('/student/dashboard')}
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
        <p className="text-muted-foreground mb-2">Class: {quiz.classes?.name || quiz.class_id} | Type: {quiz.type}</p>
        <p className="text-muted-foreground mb-6">Duration: {quiz.duration_minutes} minutes</p>

        <div className="flex justify-between items-center mb-6 p-3 bg-primary/10 rounded-md border border-primary/20">
          <span className="text-lg font-semibold text-primary">Time Left: {formatTime(timeLeft)}</span>
          {cheatingEventsCount > 0 && <span className="text-sm font-medium text-destructive">Suspicious activity detected! ({cheatingEventsCount} events)</span>}
        </div>

        {submissionMessage && (
          <div className={`p-4 mb-4 rounded-md ${submissionMessage.includes('successfully') ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
            {submissionMessage}
          </div>
        )}

        <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }} className="space-y-6">
          {quiz.questions.map((q, index) => (
            <div key={q.id} className="border border-border p-4 rounded-lg">
              <p className="font-medium mb-3">{index + 1}. {q.text}</p>
              
              {q.type === 'mcq' && (
                <div className="space-y-2">
                  {q.options.map((option, optIndex) => (
                    <label key={optIndex} className="flex items-center gap-3 p-3 rounded-md hover:bg-muted/50 cursor-pointer">
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

              {q.type === 'true_false' && (
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

              {q.type === 'essay' && (
                <textarea
                  value={answers[q.id] || ''}
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
              onClick={() => navigate('/student/dashboard')}
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
      </div>
    </div>
  );
}

