import { useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { Mail, AlertCircle } from 'lucide-react';
import Logo from "../assets/SMA.png";

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    setError('');
    try {
      await api.post('/auth/forgot-password', { email });
      setMessage('If your email is registered, you will receive a password reset link.');
    } catch (err) {
      setError('Failed to send password reset request. Please try again.');
    } finally {
      setLoading(false);
    }
  };

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
            Forgot Password
          </h1>
          <p className="mt-1 text-gray-200 dark:text-gray-300 text-sm">
            Enter your email to receive a reset link
          </p>
        </div>

        {message ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-green-200 bg-green-500/30 p-3 rounded-lg border border-green-400/40">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="flex-1">{message}</p>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email address"
                className="w-full pl-10 pr-4 py-3 text-white placeholder-gray-300 
                           border border-white/40 rounded-xl 
                           bg-gradient-to-r from-white/10 to-white/5 
                           focus-visible:ring-2 focus-visible:ring-pink-400 focus-visible:border-transparent 
                           outline-none transition-all duration-300"
              />
            </div>

            <div>
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
                {loading ? 'Sending...' : 'Send Reset Link'}
              </button>
            </div>
          </form>
        )}

        {error && (
          <div className="mt-4 flex items-center gap-2 text-sm text-red-100 bg-red-500/30 p-3 rounded-lg border border-red-400/40">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="flex-1">{error}</p>
          </div>
        )}

        <div className="text-sm text-center text-gray-200 dark:text-gray-300">
          <Link to="/login" className="font-medium text-pink-300 hover:text-pink-200 underline underline-offset-2">
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}