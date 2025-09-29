import "../index.css";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle } from "lucide-react";

const API = import.meta.env.VITE_API_BASE;

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      // This should ideally be a dedicated admin login endpoint
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      // Assuming the backend verifies admin role and returns 'admin'
      if (data.role !== 'admin') {
        throw new Error("Access Denied: Not an administrator.");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("role", data.role); // Should be 'admin'

      console.log("AdminLogin: localStorage set. access_token:", localStorage.getItem("access_token"));
      console.log("AdminLogin: localStorage set. user_id:", localStorage.getItem("user_id"));
      console.log("AdminLogin: localStorage set. role:", localStorage.getItem("role"));

      navigate(`/admin/dashboard`);
    } catch (err) {
      setError(err.message || "Admin login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-blue-500 via-purple-600 to-pink-500 relative overflow-hidden">
      {/* Background decorations */}
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-10 dark:opacity-20" />
      <div className="absolute -top-40 -left-40 w-96 h-96 bg-pink-400 dark:bg-pink-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>
      <div className="absolute -bottom-40 -right-40 w-96 h-96 bg-blue-400 dark:bg-indigo-600 rounded-full mix-blend-multiply filter blur-3xl opacity-30 animate-pulse"></div>

      {/* Card */}
      <div
        className="w-full max-w-md p-6 sm:p-8 space-y-6 
                      bg-white/20 dark:bg-black/30 backdrop-blur-lg 
                      shadow-2xl rounded-3xl border border-white/30 
                      animate-fade-in"
      >
        {/* Header */}
        <div className="flex flex-col items-center gap-3 text-center">
          <img src="/logo.svg" alt="App Logo" className="w-14 h-14" />
          <h1 className="text-4xl font-extrabold text-white drop-shadow-md">
            Admin Login 👋
          </h1>
          <p className="mt-1 text-gray-200 dark:text-gray-300 text-sm">
            Login to your administrator account
          </p>
        </div>

        {/* Form */}
        <form onSubmit={onSubmit} className="space-y-5">
          {/* Email */}
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="Admin Email address"
              className="w-full pl-10 pr-4 py-3 text-white placeholder-gray-300 
                         border border-white/40 rounded-xl 
                         bg-gradient-to-r from-white/10 to-white/5 
                         focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:border-transparent 
                         outline-none transition-all duration-300"
              required
            />
          </div>

          {/* Password */}
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Admin Password"
              className="w-full pl-10 pr-10 py-3 text-white placeholder-gray-300 
                         border border-white/40 rounded-xl 
                         bg-gradient-to-r from-white/10 to-white/5 
                         focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:border-transparent 
                         outline-none transition-all duration-300"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-300 hover:text-white transition"
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>

          {/* Button */}
          <button
            type="submit"
            disabled={loading}
            className="relative w-full flex justify-center items-center gap-2 py-3 px-4 
                       text-white bg-gradient-to-r from-pink-500 via-purple-500 to-indigo-500 
                       rounded-xl font-semibold shadow-lg overflow-hidden group
                       hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-pink-400 
                       disabled:opacity-50 transition-all duration-300"
          >
            <span className="relative z-10 flex items-center gap-2">
              {loading ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-t-2 border-b-2 border-white"></div>
                  <span>Logging In...</span>
                </>
              ) : (
                <>
                  <LogIn className="w-5 h-5" />
                  <span>Login as Admin</span>
                </>
              )}
            </span>
            {/* Shine effect */}
            <span
              className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent 
                         opacity-0 group-hover:opacity-100 
                         -translate-x-full group-hover:translate-x-full 
                         transition-transform duration-700"
            ></span>
          </button>
        </form>

        {/* Error */}
        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-100 bg-red-500/30 p-3 rounded-lg border border-red-400/40">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        {/* Footer */}
        <p className="text-sm text-center text-gray-200 dark:text-gray-300">
          <Link
            to="/login"
            className="font-medium text-pink-300 hover:text-pink-200 underline underline-offset-2"
          >
            Back to User Login
          </Link>
        </p>
      </div>
    </div>
  );
}
