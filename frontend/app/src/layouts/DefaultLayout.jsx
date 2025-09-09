import React from "react";
import { Link, Outlet, useNavigate } from "react-router-dom";
import { Home, Book, Users, BarChart, MessageSquare, LogOut } from 'lucide-react';

const navLinks = {
  admin: [
    { name: "Dashboard", path: "/admin/dashboard", icon: Home },
    { name: "Materials", path: "/materials", icon: Book },
    { name: "Users", path: "/admin/users", icon: Users },
    { name: "Reports", path: "/admin/reports", icon: BarChart },
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
  const userRole = localStorage.getItem("user_role");
  const links = navLinks[userRole] || [];

  return (
    <aside className="w-64 bg-card text-card-foreground p-4 border-r border-border">
      <h2 className="text-2xl font-bold mb-8">E-Learning</h2>
      <nav className="flex flex-col gap-2">
        {links.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            className="flex items-center gap-3 px-4 py-2 rounded-md text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
          >
            <link.icon className="w-5 h-5" />
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
    localStorage.removeItem("user_role");
    navigate("/login");
  }

  return (
    <header className="flex justify-end items-center p-4 border-b border-border">
      <button
        onClick={handleLogout}
        className="flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium text-muted-foreground hover:bg-accent hover:text-accent-foreground transition-colors"
      >
        <LogOut className="w-4 h-4" />
        <span>Logout</span>
      </button>
    </header>
  );
}

export default function DefaultLayout() {
  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 flex flex-col">
        <Header />
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
