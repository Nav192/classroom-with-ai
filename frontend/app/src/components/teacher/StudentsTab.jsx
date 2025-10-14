import React, { useState, useEffect, useCallback } from 'react';
import api, { getLeaveRequests, handleLeaveRequest } from '../../services/api';
import { Download } from 'lucide-react';

function LeaveRequests({ classId, requests, onAction }) {
  if (requests.length === 0) return null;

  return (
    <div className="mb-8 p-4 border border-yellow-300 bg-yellow-50 rounded-lg">
      <h3 className="text-lg font-semibold text-yellow-800 mb-3">Pending Leave Requests</h3>
      <div className="space-y-3">
        {requests.map(student => (
          <div key={student.id} className="flex justify-between items-center p-3 bg-white rounded-md shadow-sm border">
            <span className="font-medium text-gray-800">{student.username || student.email}</span>
            <div className="flex gap-2">
              <button 
                onClick={() => onAction(student.id, 'approve')} 
                className="px-3 py-1 text-sm font-semibold text-white bg-green-500 hover:bg-green-600 rounded-md transition-colors"
              >
                Approve
              </button>
              <button 
                onClick={() => onAction(student.id, 'deny')} 
                className="px-3 py-1 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-md transition-colors"
              >
                Deny
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function StudentsTab({ classId, className }) {
  const [studentData, setStudentData] = useState({ total_materials: 0, student_details: [] });
  const [leaveRequests, setLeaveRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedStudentId, setSelectedStudentId] = useState("all");

  const fetchData = useCallback(() => {
    setLoading(true);
    Promise.all([
      api.get(`/progress/class/${classId}/students`),
      getLeaveRequests(classId)
    ]).then(([studentsRes, requestsRes]) => {
      setStudentData(studentsRes.data);
      setLeaveRequests(requestsRes.data);
    }).catch(() => {
      setError("Failed to load class data.");
    }).finally(() => {
      setLoading(false);
    });
  }, [classId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const handleRequestAction = async (studentId, action) => {
    try {
      const response = await handleLeaveRequest(classId, studentId, action);
      alert(response.data.message);
      // Refresh all data from the server to ensure consistency
      fetchData(); 
    } catch (err) {
      console.error(`Failed to ${action} leave request`, err);
      alert(err.response?.data?.detail || `Failed to ${action} request.`);
    }
  };

  const handleDownloadReport = () => {
    let url = `${api.defaults.baseURL}/reports/${classId}/students.csv`;
    if (selectedStudentId !== "all") {
      url += `?student_id=${selectedStudentId}`;
    }

    const token = localStorage.getItem("access_token");
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then((response) => response.blob())
      .then((blob) => {
        const downloadUrl = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = downloadUrl;
        const studentName = selectedStudentId !== "all" 
          ? studentData.student_details.find(s => s.user_id === selectedStudentId)?.username || selectedStudentId
          : "all_students";
        a.download = `report_${className.replace(/\s+/g, "_")}_${studentName}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      })
      .catch(() => setError("Failed to download report."));
  };

  if (loading) return <p>Loading students...</p>;
  if (error) return <p className="text-red-500">{error}</p>;

  const { total_materials, student_details } = studentData;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
      <LeaveRequests classId={classId} requests={leaveRequests} onAction={handleRequestAction} />
      
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-semibold">Enrolled Students</h2>
        <div className="flex items-center gap-2">
          <select
            value={selectedStudentId}
            onChange={(e) => setSelectedStudentId(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
          >
            <option value="all">All Students</option>
            {student_details.map((student) => (
              <option key={student.user_id} value={student.user_id}>
                {student.username || student.email}
              </option>
            ))}
          </select>
          <button
            onClick={handleDownloadReport}
            className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 flex items-center gap-2 transition-colors text-sm"
          >
            <Download size={16} /> {selectedStudentId === "all" ? "Download All Reports" : "Download Report"}
          </button>
        </div>
      </div>
      {student_details.length > 0 ? (
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Student
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Materials Completed
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Quizzes Attempted
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {student_details.map((student) => (
                <tr key={student.user_id}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    {student.username || student.email}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{`${student.materials_completed} / ${total_materials}`}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    {student.quizzes_attempted}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-gray-500 text-center py-10">
          No students in this class yet.
        </p>
      )}
    </div>
  );
}

export default StudentsTab;
