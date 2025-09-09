import { useState } from "react";

const API = import.meta.env.VITE_API_BASE;

export default function Chat() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [chatHistory, setChatHistory] = useState([]);

  async function ask(e) {
    e.preventDefault();
    if (!query.trim()) return;

    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${API}/ai/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: query.trim() }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // Add to chat history
      const newChat = {
        id: Date.now(),
        query: query.trim(),
        answer: data.answer,
        sources: data.sources || [],
        timestamp: new Date().toISOString(),
      };

      setChatHistory((prev) => [newChat, ...prev]);
      setQuery("");
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      <h2 className="text-lg font-semibold">
        AI Learning Assistant (RAG Enhanced)
      </h2>

      {/* Chat Input */}
      <form onSubmit={ask} className="flex gap-2">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Tanyakan materi pembelajaran..."
          className="flex-1 border rounded px-3 py-2"
          disabled={loading}
        />
        <button
          disabled={loading || !query.trim()}
          className="bg-indigo-600 text-white px-4 py-2 rounded disabled:opacity-50"
        >
          {loading ? "Mengirim..." : "Kirim"}
        </button>
      </form>

      {error && (
        <div className="text-red-600 text-sm bg-red-50 p-3 rounded border border-red-200">
          {error}
        </div>
      )}

      {/* Chat History */}
      <div className="space-y-4">
        {chatHistory.map((chat) => (
          <div key={chat.id} className="border rounded-lg p-4 space-y-3">
            {/* User Query */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600 text-sm font-medium">
                U
              </div>
              <div className="flex-1">
                <div className="text-gray-900 font-medium">{chat.query}</div>
                <div className="text-xs text-gray-500">
                  {new Date(chat.timestamp).toLocaleString()}
                </div>
              </div>
            </div>

            {/* AI Answer */}
            <div className="flex items-start gap-3">
              <div className="w-8 h-8 bg-indigo-100 rounded-full flex items-center justify-center text-indigo-600 text-sm font-medium">
                AI
              </div>
              <div className="flex-1 space-y-3">
                <div className="text-gray-900 whitespace-pre-wrap">
                  {chat.answer}
                </div>

                {/* Sources */}
                {chat.sources && chat.sources.length > 0 && (
                  <div className="bg-gray-50 p-3 rounded border">
                    <div className="text-sm font-medium text-gray-700 mb-2">
                      📚 Sumber Materi:
                    </div>
                    <div className="space-y-2">
                      {chat.sources.map((source, idx) => (
                        <div
                          key={idx}
                          className="text-sm text-gray-600 flex items-center gap-2"
                        >
                          <span className="w-2 h-2 bg-indigo-400 rounded-full"></span>
                          <span className="font-medium">
                            {source.topic || source.filename}
                          </span>
                          {source.class_id && (
                            <span className="text-gray-500">
                              ({source.class_id})
                            </span>
                          )}
                          {source.relevance_score && (
                            <span className="text-xs bg-indigo-100 text-indigo-700 px-2 py-1 rounded">
                              {Math.round(source.relevance_score * 100)}%
                              relevan
                            </span>
                          )}
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {chatHistory.length === 0 && (
          <div className="text-center text-gray-500 py-8">
            <div className="text-4xl mb-2">🤖</div>
            <div className="font-medium">AI Learning Assistant</div>
            <div className="text-sm">
              Tanyakan materi pembelajaran dan dapatkan jawaban berdasarkan
              konten yang tersedia
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
