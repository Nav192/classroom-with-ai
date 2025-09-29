import React, { useState, useEffect } from 'react';
import api from '../../services/api';
import { RefreshCw, Archive, ArchiveRestore } from 'lucide-react';

function TeacherClassManagementTab() {
  const [allClasses, setAllClasses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeSubTab, setActiveSubTab] = useState("active"); // 'active' or 'archived'

  const fetchClasses = async () => {
    setLoading(true);
    try {
      // Fetch all classes including archived ones
      const response = await api.get(
        `/classes/created-by-me?show_archived=true`
      );
      setAllClasses(response.data || []);
    } catch (err) {
      setError("Failed to fetch classes.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClasses();
  }, []);

  const handleResetCode = async (classId) => {
    if (window.confirm("Are you sure you want to reset the class code?")) {
      try {
        await api.patch(`/classes/${classId}/reset-code`);
        fetchClasses();
      } catch (err) {
        alert("Failed to reset class code.");
      }
    }
  };

  const handleArchiveAction = async (classId, isArchiving) => {
    const action = isArchiving ? "archive" : "unarchive";
    const confirmationText = `Are you sure you want to ${action} this class?`;
    if (window.confirm(confirmationText)) {
      try {
        await api.patch(`/classes/${classId}/${action}`);
        fetchClasses(); // Refresh the list after action
      } catch (err) {
        alert(`Failed to ${action} class.`);
      }
    }
  };

  const activeClasses = allClasses.filter((c) => !c.is_archived);
  const archivedClasses = allClasses.filter((c) => c.is_archived);
  const classesToDisplay =
    activeSubTab === "active" ? activeClasses : archivedClasses;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <div className="border-b border-gray-200 mb-4">
        <nav className="-mb-px flex space-x-6" aria-label="Sub-tabs">
          <button
            onClick={() => setActiveSubTab("active")}
            className={`${
              activeSubTab === "active"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
          >
            Active Classes
          </button>
          <button
            onClick={() => setActiveSubTab("archived")}
            className={`${
              activeSubTab === "archived"
                ? "border-blue-500 text-blue-600"
                : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
            } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
          >
            Archived Classes
          </button>
        </nav>
      </div>

      {loading && <p>Loading classes...</p>}
      {error && <p className="text-red-500">{error}</p>}
      {!loading && !error && (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Grade
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Class Code
                </th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {classesToDisplay.map((c) => (
                <tr key={c.id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {c.class_name}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {c.grade}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 font-mono">
                    {c.class_code}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    {c.is_archived ? (
                      <button
                        onClick={() => handleArchiveAction(c.id, false)}
                        className="p-2 text-gray-500 hover:text-green-600"
                        title="Unarchive Class"
                      >
                        <ArchiveRestore size={18} />
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => handleResetCode(c.id)}
                          className="p-2 text-gray-500 hover:text-blue-600"
                          title="Reset Code"
                        >
                          <RefreshCw size={18} />
                        </button>
                        <button
                          onClick={() => handleArchiveAction(c.id, true)}
                          className="p-2 text-gray-500 hover:text-yellow-600"
                          title="Archive Class"
                        >
                          <Archive size={18} />
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default TeacherClassManagementTab;
