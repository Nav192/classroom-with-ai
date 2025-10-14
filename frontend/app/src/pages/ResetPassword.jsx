import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { createClient } from '@supabase/supabase-js';
import { Lock, AlertCircle } from 'lucide-react';
import Logo from "../assets/SMA.png";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseAnonKey);

export default function ResetPassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'PASSWORD_RECOVERY') {
        // The user is in the password recovery flow
      } else if (session) {
        // The user is signed in
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(null);

    const { error } = await supabase.auth.updateUser({ password });

    if (error) {
      setError(error.message);
    } else {
      setSuccess('Password updated successfully! Redirecting to login...');
      setTimeout(() => {
        navigate('/login');
      }, 3000);
    }

    setLoading(false);
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
            Reset Your Password
          </h1>
          <p className="mt-1 text-gray-200 dark:text-gray-300 text-sm">
            Enter your new password below
          </p>
        </div>

        {success ? (
          <div className="mt-4 flex items-center gap-2 text-sm text-green-200 bg-green-500/30 p-3 rounded-lg border border-green-400/40">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <p className="flex-1">{success}</p>
          </div>
        ) : (
          <form className="space-y-5" onSubmit={handleSubmit}>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300 w-5 h-5" />
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="New Password"
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
                {loading ? 'Resetting...' : 'Reset Password'}
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
      </div>
    </div>
  );
}