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
  const [className, setClassName] = useState('');
  const [topic, setTopic] = useState('');
  const [duration, setDuration] = useState(30);
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [weight, setWeight] = useState(0); // New state for quiz weight
  const [quizType, setQuizType] = useState('mcq');
  const [questions, setQuestions] = useState([{ text: '', options: ['', ''], answer: '' }]);
  const [students, setStudents] = useState([]);
  const [visibleTo, setVisibleTo] = useState([]);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [totalUsedWeight, setTotalUsedWeight] = useState(0);
  const [currentQuizWeight, setCurrentQuizWeight] = useState(0);

  // Schedule states
  const [availableFrom, setAvailableFrom] = useState('');
  const [availableFromSec, setAvailableFromSec] = useState('00');
  const [availableUntil, setAvailableUntil] = useState('');
  const [availableUntilSec, setAvailableUntilSec] = useState('00');
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

  useEffect(() => {
    const fetchClassData = async (classId) => {
      try {
        // Fetch class name
        const classRes = await api.get(`/classes/${classId}`);
        setClassName(classRes.data.class_name);

        // Fetch students
        const studentsRes = await api.get(`/classes/${classId}/students`);
        setStudents(studentsRes.data || []);

        // Fetch total quiz weight
        const weightRes = await api.get(`/classes/${classId}/quiz-weights`);
        setTotalUsedWeight(weightRes.data.total_weight || 0);

      } catch (err) {
        console.error("Failed to fetch class data", err);
        setError("Failed to load class details.");
      }
    };

    if (isEditing) {
      setLoading(true);
      api.get(`/quizzes/${quizId}/details`)
        .then(res => {
          const quizData = res.data;
          setClassId(quizData.class_id);
          setTopic(quizData.topic);
          setDuration(quizData.duration_minutes);
          setMaxAttempts(quizData.max_attempts || 2);
          const initialWeight = quizData.weight || 0;
          setWeight(initialWeight);
          setCurrentQuizWeight(initialWeight);
          setQuizType(quizData.type);
          setQuestions(quizData.questions.map(q => ({ ...q, id: q.id || undefined })));
          setVisibleTo(quizData.visible_to || []);

          if (quizData.available_from) {
              const fromDate = new Date(quizData.available_from);
              setAvailableFrom(new Date(fromDate.getTime() - fromDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
              setAvailableFromSec(fromDate.getSeconds().toString().padStart(2, '0'));
          }
          if (quizData.available_until) {
              const untilDate = new Date(quizData.available_until);
              setAvailableUntil(new Date(untilDate.getTime() - untilDate.getTimezoneOffset() * 60000).toISOString().slice(0, 16));
              setAvailableUntilSec(untilDate.getSeconds().toString().padStart(2, '0'));
          }

          if (quizData.class_id) {
            setClassName(quizData.classes?.name || 'Loading...');
            fetchClassData(quizData.class_id);
          }
        })
        .catch(err => {
          setError(err.response?.data?.detail || 'Failed to load quiz for editing.');
          navigate('/teacher/dashboard');
        })
        .finally(() => setLoading(false));
    } else {
      const params = new URLSearchParams(location.search);
      const id = params.get('classId');
      if (id) {
        setClassId(id);
        fetchClassData(id);
      } else {
        navigate('/teacher/dashboard');
      }
    }
  }, [quizId, isEditing, navigate, location.search]);

  const maxWeight = 100 - totalUsedWeight + (isEditing ? currentQuizWeight : 0);

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

  const handleVisibilityChange = (studentId) => {
    setVisibleTo(prev => 
        prev.includes(studentId) 
            ? prev.filter(id => id !== studentId) 
            : [...prev, studentId]
    );
  };

  const handleSelectAll = () => {
    setVisibleTo(students.map(s => s.id));
  };

  const handleDeselectAll = () => {
    setVisibleTo([]);
  };

  const filteredStudents = students.filter(s => 
    (s.username || '').toLowerCase().includes(studentSearchTerm.toLowerCase())
  );
  
  const handleQuizTypeChange = (e) => {
    const newType = e.target.value;
    setQuizType(newType);
    const updatedQuestions = questions.map(q => ({
        ...q,
        type: newType,
        options: newType === 'mcq' ? (q.options.length > 0 ? q.options : ['', '']) : (newType === 'true_false' ? ['True', 'False'] : undefined),
        // Do NOT reset answer here, retain existing answer
    }));
    setQuestions(updatedQuestions);
  }

  const handleSubmit = async (e, status = 'published') => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');

    const fromDate = availableFrom ? new Date(availableFrom) : null;
    if (fromDate) {
        fromDate.setSeconds(parseInt(availableFromSec, 10) || 0);
    }

    const untilDate = availableUntil ? new Date(availableUntil) : null;
    if (untilDate) {
        untilDate.setSeconds(parseInt(availableUntilSec, 10) || 0);
    }

    const payload = {
      topic,
      type: quizType,
      duration_minutes: parseInt(duration, 10),
      max_attempts: parseInt(maxAttempts, 10),
      weight: parseInt(weight, 10),
      questions: questions.map(q => ({
        id: q.id || undefined, // Include ID for existing questions
        text: q.text,
        type: quizType,
        options: q.options,
        answer: q.answer
      })),
      visible_to: visibleTo,
      available_from: fromDate ? fromDate.toISOString() : null,
      available_until: untilDate ? untilDate.toISOString() : null,
      status: status, // Add status to the payload
    };

    try {
      const action = isEditing ? 'updated' : 'created';
      const finalMessage = `Quiz ${status === 'draft' ? 'saved as draft' : action} successfully! Redirecting to dashboard...`;

      if (isEditing) {
        await api.put(`/quizzes/${quizId}`, payload);
      } else {
        await api.post(`/quizzes/${classId}`, payload);
      }
      setMessage(finalMessage);
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
                    <label className="text-sm font-medium flex items-center gap-2"><Info size={16}/> Class</label>
                    <p className="font-semibold text-sm text-muted-foreground">{className || 'Loading...'}</p>
                </div>
              <div className="mb-4">
                <label htmlFor="duration_minutes" className="block text-sm font-medium text-gray-700">Durasi Kuis (menit)</label>
                <input
                  type="number"
                  id="duration_minutes"
                  value={duration}
                  onChange={e => setDuration(parseInt(e.target.value, 10))}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  required
                />
              </div>
              <div className="mb-4">
                <label htmlFor="weight" className="block text-sm font-medium text-gray-700">Bobot Kuis (%)</label>
                <input
                  type="number"
                  id="weight"
                  value={weight}
                  onChange={e => setWeight(parseInt(e.target.value, 10) || 0)}
                  className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-300 focus:ring focus:ring-indigo-200 focus:ring-opacity-50"
                  min="0"
                  max={maxWeight}
                  required
                />
                <p className="text-sm text-gray-500 mt-1">
                  Bobot maksimal yang tersedia untuk kuis ini adalah <strong>{maxWeight}%</strong>.
                </p>
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

            <h3 className="text-lg font-semibold pt-4 border-t border-border">Quiz Schedule</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
                <div className="space-y-2">
                    <label htmlFor="availableFrom" className="text-sm font-medium">Available From</label>
                    <div className="flex items-center gap-2">
                        <input type="datetime-local" id="availableFrom" value={availableFrom} onChange={e => setAvailableFrom(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"/>
                        <input type="number" min="0" max="59" value={availableFromSec} onChange={e => setAvailableFromSec(e.target.value)} className="w-20 px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" placeholder="SS"/>
                    </div>
                </div>
                <div className="space-y-2">
                    <label htmlFor="availableUntil" className="text-sm font-medium">Available Until</label>
                    <div className="flex items-center gap-2">
                        <input type="datetime-local" id="availableUntil" value={availableUntil} onChange={e => setAvailableUntil(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"/>
                        <input type="number" min="0" max="59" value={availableUntilSec} onChange={e => setAvailableUntilSec(e.target.value)} className="w-20 px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" placeholder="SS"/>
                    </div>
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

          <fieldset className="space-y-4 border-b border-border pb-6">
            <h3 className="text-lg font-semibold">Quiz Visibility</h3>
            <p className="text-sm text-muted-foreground">Select which students can see this quiz. If no students are selected, the quiz will be visible to all students in the class.</p>
            
            <div className="flex items-center gap-2">
                <button type="button" onClick={handleSelectAll} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-md hover:bg-blue-200 text-sm">Select All</button>
                <button type="button" onClick={handleDeselectAll} className="bg-red-100 text-red-700 px-3 py-1 rounded-md hover:bg-red-200 text-sm">Deselect All</button>
            </div>

            <div className="space-y-2">
                <input
                    type="text"
                    placeholder="Search students by username..."
                    value={studentSearchTerm}
                    onChange={e => setStudentSearchTerm(e.target.value)}
                    className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary"
                />
            </div>

            <div className="max-h-60 overflow-y-auto border border-border rounded-md p-2">
                {filteredStudents.length > 0 ? (
                    filteredStudents.map(student => (
                        <div key={student.id} className="flex items-center space-x-2 py-1">
                            <input
                                type="checkbox"
                                id={`student-${student.id}`}
                                checked={visibleTo.includes(student.id)}
                                onChange={() => handleVisibilityChange(student.id)}
                                className="form-checkbox h-4 w-4 text-primary rounded"
                            />
                            <label htmlFor={`student-${student.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                                {student.username} ({student.email})
                            </label>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No students found or enrolled in this class.</p>
                )}
            </div>
          </fieldset>

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
            <button type="button" onClick={() => navigate('/teacher/dashboard', { state: { classId: classId, activeTab: 'quizzes' } })} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300">
              Back
            </button>
            {!isEditing && (
              <button type="button" onClick={(e) => handleSubmit(e, 'draft')} disabled={loading || !classId} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300 disabled:opacity-50">
                Save as Draft
              </button>
            )}
            <button type="button" onClick={() => navigate('/teacher/dashboard')} className="bg-gray-200 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-300">
              Cancel
            </button>
            <button type="submit" onClick={(e) => handleSubmit(e, 'published')} disabled={loading || !classId} className="bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 disabled:opacity-50">
              {loading ? 'Saving...' : (isEditing ? 'Update & Publish' : 'Publish Quiz')}
            </button>
          </div>
          {message && <p className="text-sm text-green-600 text-center">{message}</p>}
          {error && <p className="text-sm text-destructive text-center">{error}</p>}
        </form>
    </div>
  );
}
