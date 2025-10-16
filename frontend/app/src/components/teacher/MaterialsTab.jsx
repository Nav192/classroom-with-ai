import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { BookOpen, Plus, Trash2, Eye } from 'lucide-react';

function MaterialsTab({ classId, onDataChange }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedMaterial, setSelectedMaterial] = useState(null);

  const fetchMaterials = () => {
    setLoading(true);
    api
      .get(`/materials/${classId}`)
      .then((res) => setMaterials(res.data || []))
      .catch(() => setError("Failed to load materials."))
      .finally(() => setLoading(false));
  };

  useEffect(fetchMaterials, [classId]);

  const handleDelete = async (materialId) => {
    if (window.confirm("Are you sure you want to delete this material?")) {
      try {
        await api.delete(`/materials/${materialId}`);
        fetchMaterials(); // Refresh list
      } catch (err) {
        setError(err.response?.data?.detail || "Failed to delete material.");
      }
    }
  };

  if (loading) return <p>Loading materials...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Class Materials</h2>
        <button
          onClick={() => setIsModalOpen(true)}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm"
        >
          <Plus size={16} /> Upload Material
        </button>
      </div>
      {materials.length > 0 ? (
        <ul className="space-y-3">
          {materials.map((material) => (
            <li
              key={material.id}
              className="p-4 rounded-lg bg-gray-50 flex justify-between items-center"
            >
              <div className="flex items-center gap-4">
                <BookOpen className="text-blue-500 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-gray-800">
                    {material.topic}
                  </p>
                  <p className="text-sm text-gray-500">{material.filename}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedMaterial(material)}
                  className="p-2 text-gray-500 hover:text-blue-600 transition-colors"
                  title="View Access Log"
                >
                  <Eye size={20} />
                </button>
                <button
                  onClick={() => handleDelete(material.id)}
                  className="p-2 text-gray-500 hover:text-red-600 transition-colors"
                  title="Delete"
                >
                  <Trash2 size={20} />
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-gray-500 text-center py-10">
          No materials uploaded yet.
        </p>
      )}
      {isModalOpen && (
        <UploadMaterialModal
          classId={classId}
          setIsModalOpen={setIsModalOpen}
          onMaterialUploaded={fetchMaterials}
        />
      )}
      {selectedMaterial && (
        <MaterialAccessLogModal
          material={selectedMaterial}
          onClose={() => setSelectedMaterial(null)}
        />
      )}
    </div>
  );
}

function UploadMaterialModal({ classId, setIsModalOpen, onMaterialUploaded }) {
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !topic)
      return setError("Please provide both a topic and a file.");
    const formData = new FormData();
    formData.append("file", file);
    formData.append("topic", topic);
    setUploading(true);
    setError("");
    try {
      await api.post(`/materials/${classId}`, formData);
      onMaterialUploaded();
      setIsModalOpen(false);
    } catch (err) {
      setError(err.response?.data?.detail || "Upload failed.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Upload New Material</h2>
        <form onSubmit={handleUpload} className="space-y-4">
          <div>
            <label
              htmlFor="topic"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              Topic
            </label>
            <input
              id="topic"
              type="text"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g., Basic Algebra"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
          </div>
          <div>
            <label
              htmlFor="file"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              File
            </label>
            <input
              id="file"
              type="file"
              onChange={(e) => setFile(e.target.files[0])}
              className="w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
              required
            />
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-4 pt-4">
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className="py-2 px-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading}
              className="py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400 flex items-center justify-center gap-2"
            >
              {uploading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-t-2 border-b-2 border-white"></div>
                  <span>Uploading...</span>
                </>
              ) : (
                <span>Upload</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function MaterialAccessLogModal({ material, onClose }) {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (material) {
      console.log("Fetching access logs for material:", material.id);
      setLoading(true);
      api
        .get(`/materials/${material.id}/access`)
        .then((res) => {
          console.log("Access logs received:", res.data);
          setLogs(res.data || []);
        })
        .catch((err) => {
          console.error("Failed to load access logs:", err);
          setError("Failed to load access logs.");
        })
        .finally(() => setLoading(false));
    }
  }, [material]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-6">Access Log for {material.topic}</h2>
        {loading ? (
          <p>Loading logs...</p>
        ) : error ? (
          <p className="text-red-500">{error}</p>
        ) : logs.length > 0 ? (
          <ul className="space-y-2 max-h-96 overflow-y-auto">
            {logs.map((log) => (
              <li key={log.user_id} className="flex justify-between p-2 bg-gray-50 rounded">
                <span>{log.user_name}</span>
                <span className="text-gray-500">{new Date(log.accessed_at).toLocaleString()}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p>No access logs found for this material.</p>
        )}
        <div className="flex justify-end mt-6">
          <button
            onClick={onClose}
            className="py-2 px-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

export default MaterialsTab;
