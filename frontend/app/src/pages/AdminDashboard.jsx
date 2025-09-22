import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, RefreshCw, Users, BookCopy, Search } from "lucide-react";
import api from "../services/api";
import UserModal from "../components/UserModal";

// Main Dashboard Component
export default function AdminDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState({ users: 0, classes: 0, materials: 0 });

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("user_role");
    if (!storedUserId || storedUserRole !== "admin") {
      navigate("/login");
    } else {
      setUser({ id: storedUserId, role: storedUserRole });
      api.get(`/users/${storedUserId}`).then(res => setUsername(res.data.username));
    }
  }, [navigate]);

  if (!user) return <div className="p-6 text-center">Loading user profile...</div>;

  return (
    <div className="space-y-6">
      <DashboardHeader username={username} stats={stats} />
      <AdminTabs setStats={setStats} />
    </div>
  );
}

// Header Component
function DashboardHeader({ username, stats }) {
  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <h1 className="text-3xl font-bold text-gray-800">Admin Dashboard</h1>
      <p className="text-gray-500">Welcome back, {username}!</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-6 text-center">
        <div className="bg-blue-50 p-4 rounded-lg"><p className="text-2xl font-bold text-blue-600">{stats.users}</p><p className="text-sm text-blue-500">Total Users</p></div>
        <div className="bg-green-50 p-4 rounded-lg"><p className="text-2xl font-bold text-green-600">{stats.classes}</p><p className="text-sm text-green-500">Total Classes</p></div>
        <div className="bg-yellow-50 p-4 rounded-lg"><p className="text-2xl font-bold text-yellow-600">{stats.materials}</p><p className="text-sm text-yellow-500">Total Materials</p></div>
      </div>
    </div>
  );
}

// Tabs Component
function AdminTabs({ setStats }) {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div>
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-6" aria-label="Tabs">
          <button onClick={() => setActiveTab("users")} className={`${activeTab === 'users' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>User Management</button>
          <button onClick={() => setActiveTab("classes")} className={`${activeTab === 'classes' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>Class Management</button>
        </nav>
      </div>
      <div className="py-6">
        {activeTab === "users" && <UserManagementTab setStats={setStats} />}
        {activeTab === "classes" && <ClassManagementTab setStats={setStats} />}
      </div>
    </div>
  );
}

// User Management Tab
function UserManagementTab({ setStats }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeRoleTab, setActiveRoleTab] = useState('student');

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/users");
      setUsers(response.data);
      setStats(prev => ({ ...prev, users: response.data.length }));
    } catch (err) {
      setError("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchUsers(); }, []);

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user?")) {
      try {
        await api.delete(`/admin/users/${userId}`);
        fetchUsers();
      } catch (err) {
        alert("Failed to delete user.");
      }
    }
  };

  const handleSaveUser = async (userData) => {
    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, userData);
      } else {
        await api.post("/admin/users", userData);
      }
      fetchUsers();
      setIsModalOpen(false);
    } catch (err) {
      const errorMsg = err.response?.data?.detail || (editingUser ? "Failed to update user." : "Failed to create user.");
      alert(errorMsg);
    }
  };

  const filteredUsers = users
    .filter(u => u.role === activeRoleTab)
    .filter(u => 
      u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
      u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const roleTabs = [
    { role: 'student', label: 'Students' },
    { role: 'teacher', label: 'Teachers' },
    { role: 'admin', label: 'Admins' },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
          <input type="text" placeholder={`Search ${activeRoleTab}s...`} value={searchTerm} onChange={e => setSearchTerm(e.target.value)} className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" />
        </div>
        <button onClick={() => handleOpenModal()} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm"><Plus size={16} /> Add User</button>
      </div>

      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-6" aria-label="Role Tabs">
          {roleTabs.map(tab => (
            <button 
              key={tab.role}
              onClick={() => setActiveRoleTab(tab.role)}
              className={`${activeRoleTab === tab.role ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'} whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      {loading && <p>Loading users...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Username</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length > 0 ? filteredUsers.map((user) => (
                <tr key={user.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{user.username}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{user.email}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleOpenModal(user)} className="p-2 text-gray-500 hover:text-blue-600"><Edit size={18} /></button>
                    <button onClick={() => handleDeleteUser(user.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={18} /></button>
                  </td>
                </tr>
              )) : (
                <tr><td colSpan="3" className="text-center py-10 text-gray-500">No {activeRoleTab}s found.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {isModalOpen && <UserModal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} onSubmit={handleSaveUser} user={editingUser} />}
    </div>
  );
}

// Class Management Tab
function ClassManagementTab({ setStats }) {
  const [classes, setClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const fetchClasses = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/classes");
      setClasses(response.data);
      setStats(prev => ({ ...prev, classes: response.data.length }));
    } catch (err) {
      setError("Failed to fetch classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClasses(); }, []);

  const handleResetCode = async (classId) => {
    if (window.confirm("Are you sure you want to reset the class code?")) {
      try {
        await api.patch(`/admin/classes/${classId}/reset-code`);
        fetchClasses();
      } catch (err) {
        alert("Failed to reset class code.");
      }
    }
  };

  const handleDeleteClass = async (classId) => {
    if (window.confirm("DELETE this class? This is permanent.")) {
      try {
        await api.delete(`/admin/classes/${classId}`);
        fetchClasses();
      } catch (err) {
        alert("Failed to delete class.");
      }
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex justify-end mb-4">
        <button onClick={() => setIsModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm"><Plus size={16} /> Create Class</button>
      </div>
      {loading && <p>Loading classes...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Grade</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Class Code</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classes.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{c.class_name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{c.grade}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">{c.class_code}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <button onClick={() => handleResetCode(c.id)} className="p-2 text-gray-500 hover:text-blue-600" title="Reset Code"><RefreshCw size={18} /></button>
                    <button onClick={() => handleDeleteClass(c.id)} className="p-2 text-gray-500 hover:text-red-600" title="Delete Class"><Trash2 size={18} /></button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {isModalOpen && <CreateClassModal setIsModalOpen={setIsModalOpen} onClassCreated={() => { fetchClasses(); setIsModalOpen(false); }} />}
    </div>
  );
}

// Create Class Modal (extracted component)
function CreateClassModal({ setIsModalOpen, onClassCreated }) {
  const [className, setClassName] = useState("");
  const [grade, setGrade] = useState("10");
  const [isCreating, setIsCreating] = useState(false);
  const [error, setError] = useState("");

  const handleCreate = async (e) => {
    e.preventDefault();
    setIsCreating(true);
    setError("");
    try {
      await api.post("/classes", { class_name: className, grade: grade });
      onClassCreated();
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to create class.");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-8 rounded-lg shadow-2xl w-full max-w-md">
        <h2 className="text-2xl font-bold mb-6">Create New Class</h2>
        <form onSubmit={handleCreate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Class Name</label>
            <input type="text" value={className} onChange={(e) => setClassName(e.target.value)} placeholder="e.g., Grade 10 Mathematics" className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Grade</label>
            <select value={grade} onChange={(e) => setGrade(e.target.value)} className="w-full px-3 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
              <option value="10">10</option>
              <option value="11">11</option>
              <option value="12">12</option>
            </select>
          </div>
          {error && <p className="text-sm text-red-500">{error}</p>}
          <div className="flex justify-end gap-4 pt-4">
            <button type="button" onClick={() => setIsModalOpen(false)} className="py-2 px-4 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200">Cancel</button>
            <button type="submit" disabled={isCreating} className="py-2 px-4 text-sm font-medium text-white bg-blue-600 rounded-md hover:bg-blue-700 disabled:bg-blue-400">
              {isCreating ? "Creating..." : "Create Class"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
