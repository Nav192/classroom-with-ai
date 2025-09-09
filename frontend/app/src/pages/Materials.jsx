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
      if (classId) params.set("class_id", classId);
      if (topic) params.set("topic", topic);
      const res = await fetch(`${API}/materials?${params.toString()}`);
      const data = await res.json();
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    }
  }

  useEffect(() => {
    load();
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
      form.append("class_id", classId);
      form.append("topic", topic);
      form.append("file_type", fileType);
      const access_token = localStorage.getItem("access_token");
      const res = await fetch(`${API}/materials`, {
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

  return (
    <div className="p-6 space-y-6">
      <h2 className="text-lg font-semibold">Materials</h2>
      <form
        onSubmit={onUpload}
        className="grid grid-cols-1 sm:grid-cols-2 gap-3 items-end max-w-3xl"
      >
        <div>
          <label className="block text-sm mb-1">Class ID</label>
          <input
            value={classId}
            onChange={(e) => setClassId(e.target.value)}
            className="w-full border rounded px-3 py-2"
            placeholder="XI-IPA-1"
            required
          />
        </div>
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
          <label className="block text-sm mb-1">File Type</label>
          <select
            value={fileType}
            onChange={(e) => setFileType(e.target.value)}
            className="w-full border rounded px-3 py-2"
          >
            <option value="pdf">PDF</option>
            <option value="ppt">PPT</option>
            <option value="txt">TXT</option>
          </select>
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
        <div>
          <button
            disabled={loading}
            className="bg-green-600 text-white px-4 py-2 rounded"
          >
            {loading ? "Uploading..." : "Upload"}
          </button>
        </div>
      </form>
      {error && <div className="text-red-600 text-sm">{error}</div>}

      <div className="max-w-4xl">
        <div className="flex items-center justify-between mb-2">
          <h3 className="font-medium">Daftar Materi</h3>
          <button onClick={load} className="text-sm text-blue-600">
            Refresh
          </button>
        </div>
        <div className="border rounded">
          <table className="w-full text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="text-left p-2">Class</th>
                <th className="text-left p-2">Topic</th>
                <th className="text-left p-2">Filename</th>
                <th className="text-left p-2">Type</th>
                <th className="text-left p-2">Created</th>
              </tr>
            </thead>
            <tbody>
              {items.map((m) => (
                <tr key={m.id} className="border-t">
                  <td className="p-2">{m.class_id}</td>
                  <td className="p-2">{m.topic}</td>
                  <td className="p-2">{m.filename}</td>
                  <td className="p-2">{m.file_type}</td>
                  <td className="p-2">
                    {new Date(m.created_at).toLocaleString()}
                  </td>
                </tr>
              ))}
              {items.length === 0 && (
                <tr>
                  <td className="p-2 text-gray-500" colSpan={5}>
                    Belum ada materi.
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
