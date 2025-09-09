import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2 } from "lucide-react";
import api from "../services/api";
import UserModal from "../components/UserModal";

export default function AdminDashboard() {
  const navigate = useNavigate();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    const storedUserRole = localStorage.getItem("user_role");
    if (storedUserRole !== "admin") {
      setLoading(false);
      setError("You do not have permission to view this page.");
      return;
    }

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const response = await api.get("/admin/users");
      setUsers(response.data);
      setError(null);
    } catch (err) {
      setError("Failed to fetch users. Please try again later.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("user_role");
    navigate("/login");
  };

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setIsModalOpen(false);
  };

  const handleDeleteUser = async (userId) => {
    if (window.confirm("Are you sure you want to delete this user permanently?")) {
      try {
        await api.delete(`/admin/users/${userId}`);
        fetchUsers(); // Refresh list after delete
      } catch (err) {
        alert("Failed to delete user.");
        console.error(err);
      }
    }
  };

  const handleFormSubmit = async (formData) => {
    try {
      if (editingUser) {
        // Update user
        await api.put(`/admin/users/${editingUser.id}`, formData);
      } else {
        // Create user
        await api.post("/admin/users", formData);
      }
      fetchUsers(); // Refresh list
      handleCloseModal();
    } catch (err) {
      alert(`Failed to ${editingUser ? 'update' : 'create'} user.`);
      console.error(err);
    }
  };

  return (
    <>
      <UserModal 
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        onSubmit={handleFormSubmit}
        user={editingUser}
      />
      <div className="p-6 bg-gray-50 min-h-screen">
        <header className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-bold text-gray-800">Admin Dashboard</h1>
          <button
            onClick={handleLogout}
            className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
          >
            Logout
          </button>
        </header>

        <main className="bg-white p-6 rounded-lg shadow-md">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-semibold text-gray-700">User Management</h2>
            <button
              onClick={() => handleOpenModal()}
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700 flex items-center gap-2 transition"
            >
              <Plus size={18} />
              Add User
            </button>
          </div>
          
          {loading && <p>Loading users...</p>}
          {error && <p className="text-red-500">{error}</p>}
          
          {!loading && !error && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'teacher' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleOpenModal(user)} className="text-indigo-600 hover:text-indigo-900 mr-4">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} className="text-red-600 hover:text-red-900">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </main>
      </div>
    </>
  );
}