import React, { useState, Fragment } from "react";
import { Link, Outlet, useNavigate, useLocation } from "react-router-dom";
import { Transition } from '@headlessui/react';
import {
  Home,
  Book,
  Users,
  BarChart,
  MessageSquare,
  LogOut,
  Backpack,
  Menu,
} from "lucide-react";

const navLinks = {
  admin: [
    { name: "Dashboard - Users", path: "/admin/dashboard", icon: Home },
    { name: "Classes", path: "/admin/dashboard?tab=classes", icon: Backpack },
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

function Sidebar({ isOpen, setIsOpen }) {
  const userRole = localStorage.getItem("role");
  const links = navLinks[userRole] || [];
  const location = useLocation();

  const sidebarContent = (
    <div className="flex flex-col h-full">
        <h2 className="text-3xl font-bold mb-8 text-center text-white">
            E-Learning
        </h2>
        <nav className="flex flex-col gap-2 flex-grow">
            {links.map((link) => (
            <Link
                key={link.name}
                to={link.path}
                onClick={() => setIsOpen(false)} // Close sidebar on link click
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
    </div>
  );

  return (
    <Transition.Root show={isOpen} as={Fragment}>
        <div className="fixed inset-0 flex z-40">
            {/* Overlay */}
            <Transition.Child
                as={Fragment}
                enter="transition-opacity ease-linear duration-300"
                enterFrom="opacity-0"
                enterTo="opacity-100"
                leave="transition-opacity ease-linear duration-300"
                leaveFrom="opacity-100"
                leaveTo="opacity-0"
            >
                <div className="fixed inset-0 bg-gray-600 bg-opacity-75" onClick={() => setIsOpen(false)} />
            </Transition.Child>

            {/* Sidebar */}
            <Transition.Child
                as={Fragment}
                enter="transition ease-in-out duration-300 transform"
                enterFrom="-translate-x-full"
                enterTo="translate-x-0"
                leave="transition ease-in-out duration-300 transform"
                leaveFrom="translate-x-0"
                leaveTo="-translate-x-full"
            >
                <div className="relative flex-1 flex flex-col max-w-xs w-full bg-gray-800 p-4 border-r border-gray-700">
                    {sidebarContent}
                </div>
            </Transition.Child>
        </div>
    </Transition.Root>
  );
}

function Header({ onMenuClick }) {
  const navigate = useNavigate();

  function handleLogout() {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("role");
    navigate("/login");
  }

  return (
    <header className="flex justify-between items-center p-4 bg-white shadow-md">
        <button
            onClick={onMenuClick}
            className="p-2 rounded-md text-gray-500 hover:text-gray-700 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
        >
            <Menu className="h-6 w-6" aria-hidden="true" />
        </button>
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
    const [isSidebarOpen, setIsSidebarOpen] = useState(false);
    return (
        <div className="min-h-screen bg-[#1F0033]">
            <Sidebar isOpen={isSidebarOpen} setIsOpen={setIsSidebarOpen} />
            <div className="flex-1 flex flex-col">
                <Header onMenuClick={() => setIsSidebarOpen(true)} />
                <main className="p-4 sm:p-6 lg:p-8">
                    <div className="p-4 sm:p-6 lg:p-8 rounded-lg">
                        <Outlet />
                    </div>
                </main>
            </div>
        </div>
    );
}
