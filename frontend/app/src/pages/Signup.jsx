import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";

const API = import.meta.env.VITE_API_BASE;

export default function Signup() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState("student"); // Default role
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`${API}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, role }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      setResult(data);
      // After successful signup, automatically log in and redirect
      const loginRes = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!loginRes.ok) throw new Error(await loginRes.text());
      const loginData = await loginRes.json();
      localStorage.setItem("access_token", loginData.access_token);
      localStorage.setItem("user_id", loginData.user_id); // Assuming user_id is returned
      localStorage.setItem("user_role", role); // Store the role
      navigate(`/${role}/dashboard`); // Redirect to role-specific dashboard
    } catch (err) {
      setError(String(err));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-6 space-y-4 max-w-md mx-auto">
      <h2 className="text-lg font-semibold">Sign Up</h2>
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
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full border rounded px-3 py-2"
        >
          <option value="student">Student</option>
          <option value="teacher">Teacher</option>
          <option value="admin">Admin</option>
        </select>
        <button
          disabled={loading}
          className="bg-blue-600 text-white px-4 py-2 rounded w-full"
        >
          {loading ? "Signing Up..." : "Sign Up"}
        </button>
      </form>
      {error && <div className="text-red-600 text-sm">{error}</div>}
      {result && (
        <div className="text-green-600 text-sm">
          Account created successfully! Redirecting...
        </div>
      )}
      <p className="text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600">
          Login
        </Link>
      </p>
    </div>
  );
}
