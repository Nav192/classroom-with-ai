import { useState, useEffect } from 'react';
import api from '../services/api';

export default function QuizWeightSettings({ classId }) {
  const [weights, setWeights] = useState({ mcq: 0, true_false: 0, essay: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    const fetchWeights = async () => {
      try {
        const response = await api.get(`/classes/${classId}/quiz-weights`);
        if (response.data) {
          setWeights(response.data);
        }
      } catch (err) {
        if (err.response && err.response.status !== 404) {
          setError('Failed to load quiz weights.');
        }
        // if 404, it just means no weights are set yet, which is fine.
      } finally {
        setLoading(false);
      }
    };
    fetchWeights();
  }, [classId]);

  const handleWeightChange = (type, value) => {
    setWeights(prev => ({ ...prev, [type]: value }));
  };

  const handleSaveWeights = async () => {
    setError('');
    setSuccess('');
    try {
      await api.post(`/classes/${classId}/quiz-weights`, weights);
      setSuccess('Weights saved successfully!');
    } catch (err) {
      setError('Failed to save quiz weights.');
    }
  };

  if (loading) return <p>Loading quiz weight settings...</p>;

  return (
    <div className="bg-gray-100 p-4 rounded-lg mb-6">
      <h3 className="text-lg font-semibold mb-4">Quiz Type Weights</h3>
      {error && <p className="text-red-500 text-sm mb-4">{error}</p>}
      {success && <p className="text-green-500 text-sm mb-4">{success}</p>}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">MCQ Weight (%)</label>
          <input
            type="number"
            value={weights.mcq}
            onChange={e => handleWeightChange('mcq', parseInt(e.target.value, 10) || 0)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">True/False Weight (%)</label>
          <input
            type="number"
            value={weights.true_false}
            onChange={e => handleWeightChange('true_false', parseInt(e.target.value, 10) || 0)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Essay Weight (%)</label>
          <input
            type="number"
            value={weights.essay}
            onChange={e => handleWeightChange('essay', parseInt(e.target.value, 10) || 0)}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
      </div>
      <div className="mt-6 flex justify-end">
        <button
          onClick={handleSaveWeights}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700"
        >
          Save Weights
        </button>
      </div>
    </div>
  );
}
