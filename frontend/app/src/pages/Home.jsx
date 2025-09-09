import { useEffect, useState } from "react";

const API = import.meta.env.VITE_API_BASE;

export default function Home() {
  const [health, setHealth] = useState(null);
  useEffect(() => {
    fetch(`${API.replace(/\/$/, "")}/../health`)
      .then((r) => r.json())
      .then(setHealth)
      .catch(console.error);
  }, []);
  return (
    <div className="p-6 space-y-4">
      <h1 className="text-xl font-bold">RAG Learning Platform</h1>
      <pre className="text-sm bg-gray-100 p-3 rounded">
        {JSON.stringify(health, null, 2)}
      </pre>
    </div>
  );
}
