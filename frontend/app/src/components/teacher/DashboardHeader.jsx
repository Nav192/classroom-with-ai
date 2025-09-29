import React from 'react';
import { Plus } from 'lucide-react';

function DashboardHeader({ username, onClassJoined, onCreateClassClick }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
      <div>
        <h1 className="text-3xl font-bold text-gray-800">Teacher Dashboard</h1>
        <p className="text-gray-500">Welcome back, {username}!</p>
      </div>
      <button
        onClick={onCreateClassClick}
        className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm"
      >
        <Plus size={16} /> Create Class
      </button>
    </div>
  );
}

export default DashboardHeader;
