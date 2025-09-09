import { useState, useEffect } from 'react';

export default function UserModal({ isOpen, onClose, onSubmit, user }) {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    role: 'student',
  });

  const isEditMode = !!user;

  useEffect(() => {
    if (isEditMode && user) {
      setFormData({
        email: user.email || '',
        password: '',
        role: user.role || 'student',
      });
    } else {
      setFormData({
        email: '',
        password: '',
        role: 'student',
      });
    }
  }, [isOpen, user, isEditMode]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // For edit mode, don't submit empty password
    const dataToSubmit = { ...formData };
    if (isEditMode && !dataToSubmit.password) {
      delete dataToSubmit.password;
    }
    onSubmit(dataToSubmit);
  };

  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50">
      <div className="bg-white p-6 rounded-lg shadow-xl w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">{isEditMode ? 'Edit Pengguna' : 'Tambah Pengguna Baru'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                name="email"
                id="email"
                value={formData.email}
                onChange={handleChange}
                required
                className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
            {!isEditMode && (
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700">Password</label>
                <input
                  type="password"
                  name="password"
                  id="password"
                  value={formData.password}
                  onChange={handleChange}
                  required
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            )}
            <div>
              <label htmlFor="role" className="block text-sm font-medium text-gray-700">Peran</label>
              <select
                name="role"
                id="role"
                value={formData.role}
                onChange={handleChange}
                className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="mt-6 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300"
            >
              Batal
            </button>
            <button
              type="submit"
              className="bg-indigo-600 text-white px-4 py-2 rounded-md hover:bg-indigo-700"
            >
              {isEditMode ? 'Simpan Perubahan' : 'Buat Pengguna'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
