import { useState, useEffect } from "react";
import { Plus, Edit, Trash2, Search, KeyRound } from "lucide-react";
import api from "../../services/api";
import UserModal from "../UserModal";

// User Management Tab
export default function UserManagementTab({ setStats }) {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [activeRoleTab, setActiveRoleTab] = useState("student");

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const response = await api.get("/admin/users");
      setUsers(response.data);
      setStats((prev) => ({ ...prev, users: response.data.length }));
    } catch (err) {
      setError("Failed to fetch users.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleResetPassword = async (userId) => {
    if (
      window.confirm(
        "Apakah Anda yakin ingin mereset password pengguna ini ke password default?"
      )
    ) {
      try {
        await api.post(`/admin/users/${userId}/reset-password`);
        alert("Password berhasil direset.");
      } catch (err) {
        alert("Gagal mereset password.");
      }
    }
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
      const errorMsg =
        err.response?.data?.detail ||
        (editingUser ? "Failed to update user." : "Failed to create user.");
      alert(errorMsg);
    }
  };

  const filteredUsers = users
    .filter((u) => u.role === activeRoleTab)
    .filter(
      (u) =>
        u.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
        u.email.toLowerCase().includes(searchTerm.toLowerCase())
    );

  const roleTabs = [
    { role: "student", label: "Students" },
    { role: "teacher", label: "Teachers" },
    { role: "admin", label: "Admins" },
  ];

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="flex flex-col md:flex-row justify-between md:items-center gap-4 mb-4">
        <div className="relative w-full md:w-72">
          <Search
            className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"
            size={20}
          />
          <input
            type="text"
            placeholder={`Search ${activeRoleTab}s...`}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 transition-colors text-sm"
        >
          <Plus size={16} /> Add User
        </button>
      </div>

      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-6" aria-label="Role Tabs">
          {roleTabs.map((tab) => (
            <button
              key={tab.role}
              onClick={() => setActiveRoleTab(tab.role)}
              className={`${
                activeRoleTab === tab.role
                  ? "border-blue-500 text-blue-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
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
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Username
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Email
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredUsers.length > 0 ? (
                filteredUsers.map((user) => (
                  <tr key={user.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {user.username}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.email}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <button
                        onClick={() => handleResetPassword(user.id)}
                        className="p-2 text-gray-500 hover:text-green-600"
                        title="Reset Password"
                      >
                        <KeyRound size={18} />
                      </button>
                      <button
                        onClick={() => handleOpenModal(user)}
                        className="p-2 text-gray-500 hover:text-blue-600"
                      >
                        <Edit size={18} />
                      </button>
                      <button
                        onClick={() => handleDeleteUser(user.id)}
                        className="p-2 text-gray-500 hover:text-red-600"
                      >
                        <Trash2 size={18} />
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="3" className="text-center py-10 text-gray-500">
                    No {activeRoleTab}s found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      )}
      {isModalOpen && (
        <UserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSubmit={handleSaveUser}
          user={editingUser}
        />
      )}
    </div>
  );
}
