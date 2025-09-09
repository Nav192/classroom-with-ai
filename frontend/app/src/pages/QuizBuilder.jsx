import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Trash2, Sparkles } from 'lucide-react'; // Added Sparkles icon
import api from '../services/api';

export default function QuizBuilder() {
  const navigate = useNavigate();
  const [topic, setTopic] = useState('');
  const [classId, setClassId] = useState('');
  const [duration, setDuration] = useState(30);
  const [quizType, setQuizType] = useState('mcq');
  const [questions, setQuestions] = useState([{ text: '', options: ['', ''], answer: '' }]);
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');

  // AI Generation State
  const [aiNumQuestions, setAiNumQuestions] = useState(5);
  const [aiGenerating, setAiGenerating] = useState(false);
  const [aiError, setAiError] = useState('');

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
      class_id: classId,
      topic,
      type: quizType,
      duration_minutes: parseInt(duration, 10),
      questions: questions.map(q => ({...q, type: quizType}))
    };

    try {
      await api.post('/quizzes', payload);
      setMessage('Kuis berhasil dibuat! Anda akan diarahkan kembali ke dasbor.');
      setTimeout(() => navigate('/teacher/dashboard'), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || 'Gagal membuat kuis.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateAIQuiz = async () => {
    if (!topic || !classId) {
      setAiError('Mohon isi Topik dan ID Kelas terlebih dahulu.');
      return;
    }
    setAiGenerating(true);
    setAiError('');
    try {
      const response = await api.post('/ai/generate-quiz', {
        topic,
        class_id: classId,
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
      setMessage('Soal kuis berhasil dibuat oleh AI! Silakan tinjau dan simpan.');

    } catch (err) {
      setAiError(err.response?.data?.detail || 'Gagal membuat soal kuis dengan AI.');
      console.error(err);
    } finally {
      setAiGenerating(false);
    }
  };

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-800 mb-6">Buat Kuis Baru</h1>
        <form onSubmit={handleSubmit} className="bg-white p-8 rounded-lg shadow-md space-y-6">
          {/* Quiz Details */}
          <fieldset className="space-y-4 border-b pb-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700">Topik Kuis</label>
                <input type="text" id="topic" value={topic} onChange={e => setTopic(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/>
              </div>
              <div>
                <label htmlFor="classId" className="block text-sm font-medium text-gray-700">ID Kelas</label>
                <input type="text" id="classId" value={classId} onChange={e => setClassId(e.target.value)} required className="mt-1 w-full p-2 border rounded-md"/>
              </div>
              <div>
                <label htmlFor="duration" className="block text-sm font-medium text-gray-700">Durasi (menit)</label>
                <input type="number" id="duration" value={duration} onChange={e => setDuration(e.target.value)} required min="1" className="mt-1 w-full p-2 border rounded-md"/>
              </div>
              <div>
                <label htmlFor="quizType" className="block text-sm font-medium text-gray-700">Tipe Pertanyaan</label>
                <select id="quizType" value={quizType} onChange={handleQuizTypeChange} className="mt-1 w-full p-2 border rounded-md bg-white">
                  <option value="mcq">Pilihan Ganda</option>
                  <option value="true_false">Benar/Salah</option>
                  <option value="essay">Esai</option>
                </select>
              </div>
            </div>
          </fieldset>

          {/* AI Generation Section */}
          <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 space-y-3">
            <h3 className="text-lg font-semibold text-blue-800 flex items-center gap-2"><Sparkles size={20}/> Buat Soal dengan AI</h3>
            <p className="text-sm text-blue-700">Gunakan AI untuk membuat soal kuis berdasarkan materi yang telah diunggah untuk Topik dan ID Kelas di atas.</p>
            <div className="flex items-center gap-3">
              <label htmlFor="aiNumQuestions" className="text-sm font-medium text-gray-700">Jumlah Soal:</label>
              <input type="number" id="aiNumQuestions" value={aiNumQuestions} onChange={e => setAiNumQuestions(parseInt(e.target.value, 10))} min="1" max="20" className="w-20 p-2 border rounded-md"/>
              <button type="button" onClick={handleGenerateAIQuiz} disabled={aiGenerating || !topic || !classId} className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 disabled:bg-purple-300 flex items-center gap-2">
                {aiGenerating ? 'Membuat...' : <><Sparkles size={18}/> Buat dengan AI</>}
              </button>
            </div>
            {aiError && <p className="text-red-600 text-sm">{aiError}</p>}
          </div>

          {/* Questions */}
          {questions.map((q, qIndex) => (
            <fieldset key={qIndex} className="border-l-4 border-indigo-500 pl-4 py-4 space-y-3">
              <div className="flex justify-between items-center">
                <h3 className="text-lg font-medium text-gray-800">Pertanyaan {qIndex + 1}</h3>
                <button type="button" onClick={() => removeQuestion(qIndex)} className="text-red-500 hover:text-red-700"><Trash2 size={18}/></button>
              </div>
              <textarea value={q.text} onChange={e => handleQuestionChange(qIndex, 'text', e.target.value)} placeholder="Tulis pertanyaan di sini..." required className="w-full p-2 border rounded-md"/>
              
              {quizType === 'mcq' && (
                <div className="space-y-2">
                  {q.options.map((opt, oIndex) => (
                    <div key={oIndex} className="flex items-center gap-2">
                      <input type="text" value={opt} onChange={e => handleOptionChange(qIndex, oIndex, e.target.value)} placeholder={`Opsi ${oIndex + 1}`} required className="flex-grow p-2 border rounded-md"/>
                      <button type="button" onClick={() => removeOption(qIndex, oIndex)} className="text-gray-500 hover:text-red-600"><Trash2 size={16}/></button>
                    </div>
                  ))}
                  <button type="button" onClick={() => addOption(qIndex)} className="text-sm text-indigo-600">+ Tambah Opsi</button>
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-600">Jawaban Benar</label>
                <input type="text" value={q.answer} onChange={e => handleQuestionChange(qIndex, 'answer', e.target.value)} placeholder="Tulis jawaban yang benar" required className="mt-1 w-full p-2 border rounded-md"/>
              </div>
            </fieldset>
          ))}
          
          <button type="button" onClick={addQuestion} className="text-indigo-600 font-medium">+ Tambah Pertanyaan</button>

          {/* Submission */}
          <div className="flex items-center justify-end gap-4 pt-6 border-t">
            <button type="button" onClick={() => navigate('/teacher/dashboard')} className="text-gray-700">Batal</button>
            <button type="submit" disabled={loading} className="bg-indigo-600 text-white px-6 py-2 rounded-md hover:bg-indigo-700 disabled:bg-indigo-400">
              {loading ? 'Menyimpan...' : 'Simpan Kuis'}
            </button>
          </div>
          {message && <p className="text-green-600 text-sm text-center">{message}</p>}
          {error && <p className="text-red-600 text-sm text-center">{error}</p>}
        </form>
      </div>
    </div>
  );
}
