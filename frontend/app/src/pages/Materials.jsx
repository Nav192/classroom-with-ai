import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE;

export default function Materials() {
  const [classId, setClassId] = useState("");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [fileType, setFileType] = useState("pdf");
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [error, setError] = useState(null);

  async function load() {
    try {
      const params = new URLSearchParams();
      // This part needs to be adapted based on how you get the class_id for a student
      // For now, let's assume a student might need to input it or it's fetched from their profile
      // This component seems to be shared by teacher and student, which might need refactoring later
      if (classId) params.set("class_id", classId);
      if (topic) params.set("topic", topic);
      const access_token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/materials/${classId}`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      setError("Failed to load materials. Make sure you have entered a valid Class ID.");
    }
  }

  // Simplified useEffect for demonstration
  // In a real app, you'd likely fetch materials for a student's specific class
  useEffect(() => {
    // load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function onUpload(e) {
    e.preventDefault();
    if (!file) return;
    setLoading(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("topic", topic);
      const access_token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/materials/${classId}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
        body: form,
      });
      if (!res.ok) throw new Error(await res.text());
      await load();
      setFile(null);
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  async function handleDownload(materialId) {
    setError(null);
    try {
      const access_token = localStorage.getItem("access_token");
      if (!access_token) {
        setError("You must be logged in to download materials.");
        return;
      }
      const res = await fetch(`${API}/materials/download/${materialId}`, {
        headers: {
          Authorization: `Bearer ${access_token}`,
        },
      });
      if (!res.ok) {
        const errData = await res.json();
        throw new Error(errData.detail || "Failed to get download link.");
      }
      const data = await res.json();
      if (data.download_url) {
        window.open(data.download_url, "_blank");
      }
    } catch (err) {
      setError(err.message);
    }
  }

  // A simple check to conditionally render the upload form
  // In a real app, this would be based on a proper role from user context
  const userRole = localStorage.getItem("role");

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">Materials</h2>

      {/* Search/Filter Form - Visible to all */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end max-w-3xl">
        <div>
          <label className="block text-sm mb-1">Class ID</label>
          <input
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="Enter Class ID to see materials"
            required
          />
        </div>
        <div>
          <button
            onClick={load}
            className="bg-blue-600 text-white px-4 py-2 rounded"
          >
            Search Materials
          </button>
        </div>
      </div>

      {/* Upload Form - Conditionally rendered for teachers */}
      {userRole === 'teacher' && (
        <form
          onSubmit={onUpload}
          className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end max-w-3xl p-4 border rounded bg-gray-50"
        >
          <h3 className="col-span-full font-medium">Upload New Material</h3>
          <div>
            <label className="block text-sm mb-1">Topic</label>
            <input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              className="w-full border rounded px-3 py-2"
              placeholder="Fisika - Gelombang"
              required
            />
          </div>
          <div>
            <label className="block text-sm mb-1">File</label>
            <input
              type="file"
              accept=".pdf,.ppt,.pptx,.txt"
              onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              className="w-full border rounded px-3 py-2"
              required
            />
          </div>
          <div className="col-span-full">
            <button
              disabled={loading}
              className="bg-green-600 text-white px-4 py-2 rounded"
            >
              {loading ? "Uploading..." : "Upload"}
            </button>
          </div>
        </form>
      )}

      {error && <div className="text-red-600 text-sm py-2">{error}</div>}

      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Daftar Materi</h3>
        </div>
        <div className="border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Topic</th>
                <th className="text-left p-2">Filename</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Created</th>
                <th className="text-left p-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-2">{m.topic}</td>
                  <td className="p-2">{m.filename}</td>
                  <td className="p-2">{m.file_type}</td>
                  <td className="p-2">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                  <td className="p-2">
                    <button
                      onClick={() => handleDownload(m.id)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-xs"
                    >
                      Download
                    </button>
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-2 text-gray-500" colSpan={5}>
                    Enter a Class ID and click 'Search Materials' to begin.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
