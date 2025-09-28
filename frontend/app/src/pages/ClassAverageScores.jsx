import React, { useEffect, useState } from 'react';
import api, { getOverallStudentAverages } from '../services/api';

export default function ClassAverageScores({ classId }) {
  const [classData, setClassData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    console.log("ClassAverageScores: Received classId:", classId);
    const fetchAverages = async () => {
      setLoading(true);
      try {
        const response = await getOverallStudentAverages(classId);
        setClassData(response.data);
      } catch (err) {
        setError('Failed to load overall student averages.');
        console.error('Error fetching overall student averages:', err);
      } finally {
        setLoading(false);
      }
    };

    if (classId) {
      fetchAverages();
    }
  }, [classId]);

  if (loading) return <p>Loading overall student averages...</p>;
  if (error) return <p className="text-red-500">{error}</p>;
  if (!classData) return <p>No data available.</p>;

  return (
    <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200 space-y-6">
      <h2 className="text-2xl font-bold text-gray-800">Overall Student Averages for {classData.class_name}</h2>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-700">Quizzes in this Class</h3>
        {classData.quizzes.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quiz Topic</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Weight</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classData.quizzes.map((quiz) => (
                  <tr key={quiz.id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{quiz.topic}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">{quiz.weight}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No quizzes found in this class.</p>
        )}
      </div>

      <div className="space-y-4">
        <h3 className="text-xl font-semibold text-gray-700">Student Overall Weighted Averages</h3>
        {classData.students.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student Name</th>
                  <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Overall Weighted Average Score</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {classData.students.map((student) => (
                  <tr key={student.student_id}>
                    <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">{student.username}</td>
                    <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-500">
                      {student.overall_weighted_average_score !== null ? `${student.overall_weighted_average_score}%` : 'N/A'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500">No students found in this class or no quiz results available.</p>
        )}
      </div>
    </div>
  );
}