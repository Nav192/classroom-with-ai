import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Plus, Edit, Trash2, RefreshCw, Users, BookCopy } from "lucide-react";
import api from "../services/api";
import UserModal from "../components/UserModal";

export default function AdminDashboard() {
  const navigate = useNavigate();
  // User state
  const [users, setUsers] = useState([]);
  const [loadingUsers, setLoadingUsers] = useState(true);
  const [userError, setUserError] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [username, setUsername] = useState("");

  // Class state
  const [classes, setClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classError, setClassError] = useState(null);
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [newClassName, setNewClassName] = useState("");
  const [newClassGrade, setNewClassGrade] = useState("10"); // Default to 10
  const [creatingClass, setCreatingClass] = useState(false);
  const [createClassError, setCreateClassError] = useState(null);
  const [createClassMessage, setCreateClassMessage] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoadingUsers(true);
      const response = await api.get("/admin/users");
      setUsers(response.data);
    } catch (err) {
      setUserError("Failed to fetch users.");
    } finally {
      setLoadingUsers(false);
    }
  };

  const fetchClasses = async () => {
    try {
      setLoadingClasses(true);
      const response = await api.get("/admin/classes");
      setClasses(response.data);
    } catch (err) {
      setClassError("Failed to fetch classes.");
    } finally {
      setLoadingClasses(false);
    }
  };

  useEffect(() => {
    const storedUserRole = localStorage.getItem("user_role");
    const storedUserId = localStorage.getItem("user_id");
    if (storedUserRole !== "admin") {
      navigate("/login");
      return;
    }
    fetchUsers();
    fetchClasses();
    api.get(`/users/${storedUserId}`).then(res => {
      setUsername(res.data.username);
    });
  }, [navigate]);

  const handleOpenModal = (user = null) => {
    setEditingUser(user);
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setEditingUser(null);
    setIsModalOpen(false);
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

  const handleUserFormSubmit = async (formData) => {
    try {
      if (editingUser) {
        await api.put(`/admin/users/${editingUser.id}`, formData);
      } else {
        await api.post("/admin/users", formData);
      }
      fetchUsers();
      handleCloseModal();
    } catch (err) {
      alert(`Failed to ${editingUser ? 'update' : 'create'} user.`);
    }
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    setCreatingClass(true);
    setCreateClassError(null);
    setCreateClassMessage(null);
    try {
      const response = await api.post("/classes", { class_name: newClassName, grade: newClassGrade });
      setCreateClassMessage(`Class '${response.data.class_name}' (Grade ${response.data.grade}) created with code: ${response.data.class_code}`);
      setNewClassName("");
      setNewClassGrade("10");
      fetchClasses(); // Refresh class list
    } catch (err) {
      setCreateClassError(err.response?.data?.detail || "Failed to create class.");
    } finally {
      setCreatingClass(false);
    }
  };

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
    if (window.confirm("DELETE this class? This is permanent and will remove all associated materials, quizzes, and results.")) {
      try {
        await api.delete(`/admin/classes/${classId}`);
        fetchClasses();
      } catch (err) {
        alert("Failed to delete class.");
      }
    }
  };

  return (
    <>
      <UserModal isOpen={isModalOpen} onClose={handleCloseModal} onSubmit={handleUserFormSubmit} user={editingUser} />
      <div className="space-y-8">
        <header><h1 className="text-3xl font-bold">Admin Dashboard</h1><p className="text-muted-foreground">Welcome, {username}</p></header>

        {/* User Management Card */}
        <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-3"><Users size={24}/> User Management</h2>
            <button onClick={() => handleOpenModal()} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2 transition-colors"><Plus size={18} /> Add User</button>
          </div>
          {loadingUsers && <p className="p-6">Loading users...</p>}
          {userError && <p className="p-6 text-destructive">{userError}</p>}
          {!loadingUsers && !userError && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Username</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Email</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {users.map((user) => (
                    <tr key={user.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{user.username}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{user.email}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">
                        <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                          user.role === 'admin' ? 'bg-red-100 text-red-800' :
                          user.role === 'teacher' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {user.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleOpenModal(user)} className="text-primary hover:text-primary/80 mr-4">
                          <Edit size={18} />
                        </button>
                        <button onClick={() => handleDeleteUser(user.id)} className="text-destructive hover:text-destructive/80">
                          <Trash2 size={18} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Class Management Card */}
        <div className="bg-card text-card-foreground rounded-lg shadow-md border border-border">
          <div className="p-6 flex justify-between items-center">
            <h2 className="text-xl font-semibold flex items-center gap-3"><BookCopy size={24}/> Class Management</h2>
            <button onClick={() => setIsCreateClassModalOpen(true)} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 flex items-center gap-2 transition-colors"><Plus size={18} /> Create Class</button>
          </div>
          {/* Create Class Modal */}
          <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${isCreateClassModalOpen ? '' : 'hidden'}`}>
            <div className="bg-card p-6 rounded-lg shadow-lg w-96">
              <h2 className="text-xl font-semibold mb-4">Create New Class</h2>
              <form onSubmit={handleCreateClass} className="space-y-4">
                <div className="space-y-2">
                  <label htmlFor="newClassName" className="text-sm font-medium">Class Name</label>
                  <input type="text" id="newClassName" value={newClassName} onChange={(e) => setNewClassName(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required />
                </div>
                <div className="space-y-2">
                  <label htmlFor="newClassGrade" className="text-sm font-medium">Grade</label>
                  <select id="newClassGrade" value={newClassGrade} onChange={(e) => setNewClassGrade(e.target.value)} className="w-full px-3 py-2 bg-input border border-border rounded-md focus:outline-none focus:ring-2 focus:ring-primary" required>
                    <option value="10">10</option>
                    <option value="11">11</option>
                    <option value="12">12</option>
                  </select>
                </div>
                {createClassError && <p className="text-sm text-destructive">{createClassError}</p>}
                {createClassMessage && <p className="text-sm text-green-600">{createClassMessage}</p>}
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={() => setIsCreateClassModalOpen(false)} className="bg-muted text-muted-foreground px-4 py-2 rounded-md hover:bg-muted/80">Cancel</button>
                  <button type="submit" disabled={creatingClass} className="bg-primary text-primary-foreground px-4 py-2 rounded-md hover:bg-primary/90 disabled:opacity-50">
                    {creatingClass ? 'Creating...' : 'Create'}
                  </button>
                </div>
              </form>
            </div>
          </div>
          {loadingClasses && <p className="p-6">Loading classes...</p>}
          {classError && <p className="p-6 text-destructive">{classError}</p>}
          {!loadingClasses && !classError && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-border">
                <thead className="bg-muted/50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Class Name</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Grade</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">Class Code</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-card divide-y divide-border">
                  {classes.map((c) => (
                    <tr key={c.id}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-foreground">{c.class_name}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground">{c.grade}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-muted-foreground font-mono">{c.class_code}</td>
                      <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                        <button onClick={() => handleResetCode(c.id)} className="text-primary hover:text-primary/80 mr-4" title="Reset Code"><RefreshCw size={18} /></button>
                        <button onClick={() => handleDeleteClass(c.id)} className="text-destructive hover:text-destructive/80" title="Delete Class"><Trash2 size={18} /></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </>
  );
}