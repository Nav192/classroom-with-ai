import { useState, useEffect } from "react";
import { BookCopy, Eye, Download } from "lucide-react";
import api from "../../services/api";

// Materials Tab Component
export default function MaterialsTab({ classId }) {
  const [materials, setMaterials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    setLoading(true);
    api.get(`/materials/${classId}`)
      .then(res => setMaterials(res.data || []))
      .catch(() => setError("Failed to load materials."))
      .finally(() => setLoading(false));
  }, [classId]);

  const handleAction = async (materialId, action) => {
    try {
      console.log("handleAction called with materialId:", materialId, "and action:", action);
      const res = await api.get(`/materials/download/${materialId}`);
      if (res.data && res.data.download_url) {
        window.open(res.data.download_url, "_blank");
        
        console.log("Recording access for material:", materialId);
        await api.post(`/materials/${materialId}/access`);
        console.log("Access recorded successfully.");

      } else {
        setError("Could not retrieve material link.");
      }
    } catch (err) {
      console.error("An error occurred during handleAction:", err);
      setError(err.response?.data?.detail || `An error occurred during ${action}.`);
    }
  };

  if (loading) return <p>Loading materials...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h2 className="text-xl font-semibold mb-4">Available Materials</h2>
      {materials.length > 0 ? (
        <ul className="space-y-3">
          {materials.map(material => (
            <li key={material.id} className="p-4 rounded-lg bg-gray-50 flex justify-between items-center">
              <div className="flex items-center gap-4">
                <BookCopy className="text-blue-500 flex-shrink-0" size={24} />
                <div>
                  <p className="font-semibold text-gray-800">{material.topic}</p>
                  <p className="text-sm text-gray-500">{material.filename}</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleAction(material.id, 'view')} className="p-2 text-gray-600 hover:text-blue-600 transition-colors" title="View & Mark as Complete"><Eye size={20} /></button>
                <button onClick={() => handleAction(material.id, 'download')} className="p-2 text-gray-600 hover:text-blue-600 transition-colors" title="Download"><Download size={20} /></button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-gray-500">No materials available in this class yet.</p>}
    </div>
  );
}
