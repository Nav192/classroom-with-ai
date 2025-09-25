import { useState, useEffect } from 'react';
import api from '../services/api';

export default function QuizVisibilityModal({ isOpen, onClose, quizId, classId, currentVisibleTo, onSave }) {
  const [students, setStudents] = useState([]);
  const [visibleTo, setVisibleTo] = useState(currentVisibleTo || []);
  const [studentSearchTerm, setStudentSearchTerm] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!isOpen || !classId) {
      return;
    }

    const fetchStudents = async () => {
      setLoading(true);
      setError('');
      try {
        const res = await api.get(`/classes/${classId}/students`);
        setStudents(res.data || []);
      } catch (err) {
        setError(err.response?.data?.detail || 'Failed to load students.');
      } finally {
        setLoading(false);
      }
    };

    fetchStudents();
  }, [isOpen, classId]);

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await onSave(quizId, visibleTo);
      onClose();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to update visibility.');
    } finally {
      setSaving(false);
    }
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex justify-center items-center z-50">
      <div className="bg-card text-card-foreground p-6 rounded-lg shadow-xl w-full max-w-md border border-border">
        <h2 className="text-xl font-semibold mb-4">Manage Quiz Visibility</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
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
                {loading ? (
                    <p className="text-sm text-muted-foreground text-center py-4">Loading students...</p>
                ) : error ? (
                    <p className="text-sm text-destructive text-center py-4">{error}</p>
                ) : filteredStudents.length > 0 ? (
                    filteredStudents.map(student => (
                        <div key={student.id} className="flex items-center space-x-2 py-1">
                            <input
                                type="checkbox"
                                id={`modal-student-${student.id}`}
                                checked={visibleTo.includes(student.id)}
                                onChange={() => handleVisibilityChange(student.id)}
                                className="form-checkbox h-4 w-4 text-primary rounded"
                            />
                            <label htmlFor={`modal-student-${student.id}`} className="text-sm font-medium text-gray-700 cursor-pointer">
                                {student.username} ({student.email})
                            </label>
                        </div>
                    ))
                ) : (
                    <p className="text-sm text-muted-foreground text-center py-4">No students found or enrolled in this class.</p>
                )}
            </div>
          </div>
          {error && <p className="text-sm text-destructive mt-4">{error}</p>}
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80 transition-colors"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 transition-colors"
              disabled={saving}
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
