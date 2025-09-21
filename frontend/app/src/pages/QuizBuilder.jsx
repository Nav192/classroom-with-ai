import { useState, useEffect } from 'react';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { Plus, Trash2, Sparkles, Info } from 'lucide-react';
import api from '../services/api';

export default function QuizBuilder() {
  const navigate = useNavigate();
  const location = useLocation();
  const { quizId } = useParams(); // Get quizId from URL params
  const isEditing = !!quizId; // True if quizId exists, false otherwise

  const [classId, setClassId] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(30);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [quizType, setQuizType] = useState('mcq');
  const [questions, setQuestions] = useState([{ text: '', options: ['', ''], answer: '' }]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    if (isEditing) {
      // Fetch existing quiz data
      setLoading(true);
      api.get(`/quizzes/${quizId}/details`)
        .then(res => {
          const quizData = res.data;
          setTopic(quizData.topic);
          setDuration(quizData.duration_minutes);
          setMaxAttempts(quizData.max_attempts);
          setQuizType(quizData.type);
          // Ensure questions have an 'id' for updates
          setQuestions(quizData.questions.map(q => ({ ...q, id: q.id || undefined })));
          setClassId(quizData.class_id); // Set classId from fetched quiz
        })
        .catch(err => {
          setError(err.response?.data?.detail || 'Failed to load quiz for editing.');
          navigate('/teacher/dashboard'); // Redirect if quiz not found or error
        })
        .finally(() => setLoading(false));
    } else {
      // Get classId from URL search params for new quiz creation
      const params = new URLSearchParams(location.search);
      const id = params.get('classId');
      if (id) {
        setClassId(id);
      } else {
        navigate('/teacher/dashboard'); // Redirect if no classId is provided
      }
    }
  }, [location, navigate, quizId, isEditing]);

  const handleQuestionChange = (index, field, value) => {
    const newQuestions = [...questions];
    newQuestions[index][field] = value;
    setQuestions(newQuestions);
  };

  const handleOptionChange = (qIndex, oIndex, value) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options[oIndex] = value;
    setQuestions(newQuestions);
  };

  const addQuestion = () => {
    const newQuestion = { text: '', type: quizType, answer: '' };
    if (quizType === 'mcq') newQuestion.options = ['', ''];
    if (quizType === 'true_false') newQuestion.options = ['True', 'False'];
    setQuestions([...questions, newQuestion]);
  };

  const removeQuestion = (index) => {
    if (questions.length > 1) {
      const newQuestions = questions.filter((_, i) => i !== index);
      setQuestions(newQuestions);
    }
  };

  const addOption = (qIndex) => {
    const newQuestions = [...questions];
    newQuestions[qIndex].options.push('');
    setQuestions(newQuestions);
  };

  const removeOption = (qIndex, oIndex) => {
    const newQuestions = [...questions];
    if (newQuestions[qIndex].options.length > 2) {
      newQuestions[qIndex].options.splice(oIndex, 1);
      setQuestions(newQuestions);
    }
  };
  
  const handleQuizTypeChange = (e) => {
    const newType = e.target.value;
    setQuizType(newType);
    const resetQuestions = questions.map(q => ({
        ...q,
        type: newType,
        options: newType === 'mcq' ? ['', ''] : (newType === 'true_false' ? ['True', 'False'] : undefined),
        answer: ''
    }));
    setQuestions(resetQuestions);
  }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const payload = {
      topic,
      type: quizType,
      duration_minutes: parseInt(duration, 10),
      max_attempts: parseInt(maxAttempts, 10),
      questions: questions.map(q => ({
        id: q.id || undefined, // Include ID for existing questions
        text: q.text,
        type: quizType,
        options: q.options,
        answer: q.answer
      }))
    };

    try {
      if (isEditing) {
        await api.put(`/quizzes/${quizId}`, payload);
        setMessage('Quiz updated successfully! Redirecting to dashboard...');
      } else {
        await api.post(`/quizzes/${classId}`, payload);
        setMessage('Quiz created successfully! Redirecting to dashboard...');
      }
      setTimeout(() => navigate('/teacher/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || (isEditing ? 'Failed to update quiz.' : 'Failed to create quiz.'));
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIQuiz = async () => {
    if (!topic) {
      setAiError('Please fill in the Quiz Topic first.');
      return;
    }
    setAiGenerating(true);
    setAiError('');
    try {
      const response = await api.post(`/ai/generate-quiz/${classId}`, {
        topic,
        question_type: quizType,
        num_questions: aiNumQuestions,
      });
      
      const generatedQuestions = response.data.questions.map(q => ({
        text: q.text,
        type: q.type,
        options: q.options || (q.type === 'true_false' ? ['True', 'False'] : undefined),
        answer: q.answer || ''
      }));
      setQuestions(generatedQuestions);
      setMessage('AI-generated quiz questions are ready! Please review and save.');

    } catch (err) {
      setAiError(err.response?.data?.detail || 'Failed to generate quiz with AI.');
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="space-y-8">
        <header>
            <h1 className="text-3xl font-bold">{isEditing ? 'Edit Quiz' : 'Create New Quiz'}</h1>
        </header>
        <form onSubmit={handleSubmit} className="bg-card text-card-foreground p-8 rounded-lg shadow-md space-y-6 border border-border">
          <fieldset className="space-y-4 border-b border-border pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                    <label htmlFor="topic" className="text-sm font-medium">Quiz Topic</label>
                    <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} required className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"/>
                </div>
                <div className="space-y-2 bg-muted/50 p-3 rounded-md">
                    <label className="text-sm font-medium flex items-center gap-2"><Info size={16}/> Class ID</label>
                    <p className="font-mono text-sm text-muted-foreground">{classId || 'Loading...'}</p>
                </div>
                <div className="space-y-2">
                    <label htmlFor="duration" className="text-sm font-medium">Duration (minutes)</label>
                    <input type="number" id="duration" value={duration} onChange={e => setDuration(e.target.value)} required min="1" className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"/>
                </div>
                <div className="space-y-2">
                    <label htmlFor="maxAttempts" className="text-sm font-medium">Max Attempts</label>
                    <input type="number" id="maxAttempts" value={maxAttempts} onChange={e => setMaxAttempts(e.target.value)} required min="1" className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"/>
                </div>
                <div className="space-y-2">
                    <label htmlFor="quizType" className="text-sm font-medium">Question Type</label>
                    <select id="quizType" value={quizType} onChange={handleQuizTypeChange} className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary">
                        <option value="mcq">Multiple Choice</option>
                        <option value="true_false">True/False</option>
                        <option value="essay">Essay</option>
                    </select>
                </div>
            </div>
          </fieldset>

          <div className="bg-primary/10 p-4 rounded-lg border border-primary/20 space-y-3">
            <h3 className="text-lg font-semibold text-primary flex items-center gap-2"><Sparkles size={20}/> Generate with AI</h3>
            <p className="text-sm text-primary/80">Use AI to generate quiz questions based on the uploaded materials for the Topic in the selected Class.</p>
            <div className="flex items-center gap-3">
              <label htmlFor="aiNumQuestions" className="text-sm font-medium">Number of Questions:</label>
              <input type="number" id="aiNumQuestions" value={aiNumQuestions} onChange={e => setAiNumQuestions(parseInt(e.target.value, 10))} min="1" max="20" className="w-20 px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"/>
              <button type="button" onClick={handleGenerateAIQuiz} disabled={aiGenerating || !topic || !classId} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50 flex items-center gap-2">
                {aiGenerating ? 'Generating...' : <><Sparkles size={18}/> Generate</>}
              </button>
            </div>
            {aiError && <p className="text-sm text-destructive">{aiError}</p>}
          </div>

          {questions.map((q, qIndex) => (
            <fieldset key={q.id || qIndex} className="border-l-4 border-primary pl-4 py-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium">Question {qIndex + 1}</h3>
                <button type="button" onClick={() => removeQuestion(qIndex)} className="text-destructive hover:text-destructive/80"><Trash2 size={18}/></button>
              </div>
              <textarea value={q.text} onChange={e => handleQuestionChange(qIndex, 'text', e.target.value)} placeholder="Enter question text..." required className="w-full p-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"/>
              
              {quizType === 'mcq' && (
                <div className="space-y-2">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input type="text" value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Option ${oIndex + 1}`} required className="flex-grow p-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"/>
                      <button type="button" onClick={() => removeOption(qIndex, oIndex)} className="text-muted-foreground hover:text-destructive"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(qIndex)} className="text-sm text-primary font-medium">+ Add Option</button>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Correct Answer</label>
                <input type="text" value={q.answer} onChange={e => handleQuestionChange(qIndex, 'answer', e.target.value)} placeholder="Enter the correct answer" required className="w-full p-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"/>
              </div>
            </fieldset>
          ))}
          
          <button type="button" onClick={addQuestion} className="text-primary font-semibold flex items-center gap-2"><Plus size={16}/> Add Question</button>

          <div className="flex items-center justify-end gap-4 pt-6 border-t border-border">
            <button type="button" onClick={() => navigate('/teacher/dashboard')} className="text-muted-foreground hover:text-foreground">Cancel</button>
            <button type="submit" disabled={loading || !classId} className="bg-primary text-primary-foreground px-6 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50">
              {loading ? 'Saving...' : (isEditing ? 'Update Quiz' : 'Save Quiz')}
            </button>
          </div>
          {message && <p className="text-sm text-green-600 text-center">{message}</p>}
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </form>
    </div>
  );
}
