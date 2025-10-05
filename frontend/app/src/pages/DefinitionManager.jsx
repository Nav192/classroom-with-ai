import React, { useState, useEffect } from 'react';
import api from '../services/api';

function DefinitionManager() {
  const [term, setTerm] = useState('');
  const [definition, setDefinition] = useState('');
  const [definitions, setDefinitions] = useState([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const fetchDefinitions = async () => {
    try {
      // Note: We need an endpoint to get definitions. Assuming one exists at /definitions
      const response = await api.get('/definitions');
      setDefinitions(response.data || []);
    } catch (err) {
      setError('Failed to load definitions.');
    }
  };

  useEffect(() => {
    fetchDefinitions();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!term || !definition) {
      setError('Term and definition are required.');
      return;
    }
    setLoading(true);
    setError('');
    try {
      await api.post('/definitions', { term, definition });
      setTerm('');
      setDefinition('');
      fetchDefinitions(); // Refresh the list
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to add definition.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mx-auto p-8">
      <h1 className="text-3xl font-bold mb-6">Definition Manager</h1>
      
      <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
        <h2 className="text-xl font-semibold mb-4">Add New Definition</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="term" className="block text-sm font-medium text-gray-700">Term</label>
            <input
              id="term"
              type="text"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="e.g., Photosynthesis"
            />
          </div>
          <div>
            <label htmlFor="definition" className="block text-sm font-medium text-gray-700">Definition</label>
            <textarea
              id="definition"
              rows="4"
              value={definition}
              onChange={(e) => setDefinition(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm"
              placeholder="Explain the term here..."
            ></textarea>
          </div>
          {error && <p className="text-red-500 text-sm">{error}</p>}
          <div>
            <button
              type="submit"
              disabled={loading}
              className="inline-flex justify-center py-2 px-4 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:bg-indigo-400"
            >
              {loading ? 'Adding...' : 'Add Definition'}
            </button>
          </div>
        </form>
      </div>

      <div className="mt-8">
        <h2 className="text-xl font-semibold mb-4">Existing Definitions</h2>
        <div className="bg-white shadow overflow-hidden sm:rounded-md">
          <ul className="divide-y divide-gray-200">
            {definitions.length > 0 ? (
              definitions.map((def) => (
                <li key={def.id} className="px-6 py-4">
                  <p className="text-sm font-medium text-indigo-600 truncate">{def.term}</p>
                  <p className="mt-2 text-sm text-gray-500">{def.definition}</p>
                </li>
              ))
            ) : (
              <li className="px-6 py-4 text-sm text-gray-500">No definitions found.</li>
            )}
          </ul>
        </div>
      </div>
    </div>
  );
}

export default DefinitionManager;
