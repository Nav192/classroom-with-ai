import "../index.css";
import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Mail, Lock, LogIn, Eye, EyeOff, AlertCircle } from "lucide-react";
import Logo from "../assets/SMA.png";

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
      const res = await fetch(`${API}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();

      if (data.role !== 'admin') {
        throw new Error("Access Denied: Not an administrator.");
      }

      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_id", data.user_id);
      localStorage.setItem("role", data.role);

      navigate(`/admin/dashboard`);
    } catch (err) {
      setError(err.message || "Admin login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      className="flex items-center justify-center min-h-screen relative overflow-hidden"
      style={{ backgroundColor: "#3F0066" }}
    >
      <div
        className="w-full max-w-md p-6 sm:p-8 space-y-6 
                      shadow-2xl rounded-3xl border border-white/30 
                      animate-fade-in"
        style={{ backgroundColor: "#7E00CC" }}
      >
        <div className="flex flex-col items-center gap-3 text-center">
          <img src={Logo} alt="App Logo" className="w-25 h-25" />
          <h1 className="text-4xl font-extrabold text-white drop-shadow-md">
            Admin Login
          </h1>
          <p className="mt-1 text-gray-200 dark:text-gray-300 text-sm">
            Login to your administrator account
          </p>
        </div>

        <form onSubmit={onSubmit} className="space-y-5">
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

          <button
            type="submit"
            disabled={loading}
            className="relative w-full flex justify-center items-center gap-2 py-3 px-4 
                       text-white
                       rounded-xl font-semibold shadow-lg overflow-hidden group
                       hover:scale-[1.03] focus:outline-none focus-visible:ring-2 focus-visible:ring-purple-400 
                       disabled:opacity-50 transition-all duration-300"
            style={{ backgroundColor: '#341539' }}
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
          </button>
        </form>

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-100 bg-red-500/30 p-3 rounded-lg border border-red-400/40">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}

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