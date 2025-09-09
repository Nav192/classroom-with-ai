import React from 'react';
import { Link, Outlet, useNavigate } from 'react-router-dom';

function AuthStatus() {
  const isAuthenticated = localStorage.getItem("access_token");
  const userRole = localStorage.getItem("user_role");
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_role");
    navigate("/login");
  }

  return (
    <div className="flex items-center gap-4">
      {isAuthenticated ? (
        <>
          <span className="text-sm text-gray-700">
            Logged in as: {userRole}
          </span>
          <button
            onClick={handleLogout}
            className="bg-red-500 text-white px-3 py-1 rounded text-sm"
          >
            Logout
          </button>
        </>
      ) : (
        <>
          <Link to="/login" className="text-blue-600">
            Login
          </Link>
          <Link to="/signup" className="text-blue-600">
            Sign Up
          </Link>
        </>
      )}
    </div>
  );
}

export default function DefaultLayout() {
  return (
    <div className="min-h-screen">
      <nav className="flex justify-between items-center p-4 border-b">
        <div className="flex gap-4">
          <>
            <Link to="/">Home</Link>
            <Link to="/materials">Materials</Link>
            <Link to="/quizzes">Quizzes</Link>
            <Link to="/results">Results</Link>
            <Link to="/progress">Progress</Link>
            <Link to="/chat">AI Chat</Link>
          </>
        </div>
        <AuthStatus />
      </nav>
      <div className="p-4">
        <Outlet />
      </div>
    </div>
  );
}
