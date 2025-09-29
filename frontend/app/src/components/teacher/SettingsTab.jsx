import React, { useState, useEffect } from 'react';
import api from '../../services/api';

function SettingsTab({ classId }) {
  const [weights, setWeights] = useState({ mcq_weight: 0, true_false_weight: 0, essay_weight: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setLoading(true);
    // NOTE: This endpoint is assumed to exist. It needs to be implemented in the backend.
    api.get(`/classes/${classId}/quiz-weights`)
      .then(res => {
        if (res.data) {
          setWeights(res.data);
        }
      })
      .catch(() => setError("Failed to load quiz weights. Please make sure the backend endpoint is implemented."))
      .finally(() => setLoading(false));
  }, [classId]);

  const handleWeightChange = (e) => {
    const { name, value } = e.target;
    setWeights(prev => ({ ...prev, [name]: parseInt(value, 10) || 0 }));
  };

  const handleSave = () => {
    setSaving(true);
    setError("");
    // NOTE: This endpoint is assumed to exist. It needs to be implemented in the backend.
    api.patch(`/classes/${classId}/quiz-weights`, weights)
      .then(() => {
        alert("Quiz weights saved successfully!");
      })
      .catch(() => setError("Failed to save quiz weights. Please make sure the backend endpoint is implemented."))
      .finally(() => setSaving(false));
  };

  if (loading) return <p>Loading settings...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Quiz Weight Settings</h2>
      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Multiple Choice Question Weight</label>
          <input
            type="number"
            name="mcq_weight"
            value={weights.mcq_weight}
            onChange={handleWeightChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">True/False Question Weight</label>
          <input
            type="number"
            name="true_false_weight"
            value={weights.true_false_weight}
            onChange={handleWeightChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700">Essay Question Weight</label>
          <input
            type="number"
            name="essay_weight"
            value={weights.essay_weight}
            onChange={handleWeightChange}
            className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
          />
        </div>
        <div className="flex justify-end">
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 disabled:bg-blue-400"
          >
            {saving ? "Saving..." : "Save Weights"}
          </button>
        </div>
      </div>
    </div>
  );
}

export default SettingsTab;
