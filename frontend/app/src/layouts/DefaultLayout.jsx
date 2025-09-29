import React from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import {
  Home,
  Book,
  Users,
  BarChart,
  MessageSquare,
  LogOut,
  Search,
  Bell,
  User as UserIcon,
} from "lucide-react";

const navLinks = {
  admin: [
    { name: "Dashboard - Users", path: "/admin/dashboard", icon: Home },
    { name: "Classes", path: "/admin/dashboard?tab=classes", icon: Book },
  ],
  teacher: [
    { name: "Dashboard", path: "/teacher/dashboard", icon: Home },
    { name: "Materials", path: "/materials", icon: Book },
    { name: "Quizzes", path: "/quizzes", icon: Users },
    { name: "Results", path: "/results", icon: BarChart },
    { name: "Chat", path: "/chat", icon: MessageSquare },
  ],
  student: [
    { name: "Dashboard", path: "/student/dashboard", icon: Home },
    { name: "Materials", path: "/materials", icon: Book },
    { name: "Quizzes", path: "/quizzes", icon: Users },
    { name: "Progress", path: "/progress", icon: BarChart },
    { name: "Chat", path: "/chat", icon: MessageSquare },
  ],
};

function Sidebar() {
  const userRole = localStorage.getItem("role");
  const links = navLinks[userRole] || [];
  const location = useLocation();

  return (
    <aside className="w-64 bg-gray-800 text-white p-4 border-r border-gray-700 flex flex-col">
      <h2 className="text-3xl font-bold mb-8 text-center">
        E-Learning Platform
      </h2>
      <nav className="flex flex-col gap-2 flex-grow">
        {links.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            className={`flex items-center gap-3 px-4 py-3 rounded-md transition-colors ${
              location.pathname + location.search === link.path
                ? "bg-blue-600 text-white"
                : "text-gray-400 hover:bg-gray-700 hover:text-white"
            }`}
          >
            <link.icon className="w-6 h-6" />
            <span>{link.name}</span>
          </Link>
        ))}
      </nav>
    </aside>
  );
}

function Header() {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("role");
    navigate("/login");
  }

  return (
    <header className="flex justify-end items-center p-4 bg-white shadow-md">
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-gray-600 hover:bg-gray-100 hover:text-gray-800 transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </button>
    </header>
  );
}

export default function DefaultLayout() {
  return (
    <div className="flex min-h-screen bg-gray-100">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8">
          <div className="bg-white p-8 rounded-lg shadow-md">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
