import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE;

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("user_role", data.role); // Store the role from the initial login response

      navigate(`/${data.role}/dashboard`); // Redirect to role-specific dashboard
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-md mx-auto">
      <h2 className="text-lg font-semibold">Login</h2>
      <form onSubmit={onSubmit} className="space-y-3">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Email"
          className="w-full border rounded px-3 py-2"
          required
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="w-full border rounded px-3 py-2"
          required
        />
        <button
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Logging In..." : "Login"}
        </button>
      </form>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      <p className="text-sm text-gray-600">
        Don't have an account?{" "}
        <Link to="/signup" className="text-blue-600">
          Sign Up
        </Link>
      </p>
    </div>
  );
}
