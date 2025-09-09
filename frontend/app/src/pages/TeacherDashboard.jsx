import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { UploadCloud, BookOpen, Plus, Eye, Download } from "lucide-react"; // Added Download icon
import api from "../services/api";
import StudentProgressModal from "../components/StudentProgressModal";

export default function TeacherDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  
  // For material list
  const [materials, setMaterials] = useState([]);
  const [loadingMaterials, setLoadingMaterials] = useState(true);

  // For upload form
  const [classId, setClassId] = useState("");
  const [topic, setTopic] = useState("");
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  // For student list and progress modal
  const [students, setStudents] = useState([]);
  const [loadingStudents, setLoadingStudents] = useState(true);
  const [isProgressModalOpen, setIsProgressModalOpen] = useState(false);
  const [selectedStudentProgress, setSelectedStudentProgress] = useState(null);
  const [progressError, setProgressError] = useState(null);


  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("user_role");

    if (!storedUserId || storedUserRole !== "teacher") {
      navigate("/login");
    } else {
      setUser({ id: storedUserId, role: storedUserRole });
      fetchMaterials();
      fetchStudents(); // Fetch students when component mounts
    }
  }, [navigate]);

  const fetchMaterials = async () => {
    try {
      setLoadingMaterials(true);
      const response = await api.get("/materials");
      setMaterials(response.data);
    } catch (err) {
      setError("Gagal memuat materi.");
      console.error(err);
    } finally {
      setLoadingMaterials(false);
    }
  };

  const fetchStudents = async () => {
    const storedUserRole = localStorage.getItem("user_role");
    if (storedUserRole !== "admin") { // Only allow admin to fetch from /admin/users
      setLoadingStudents(false);
      setProgressError("You do not have permission to view the full user list.");
      setStudents([]); // Clear any previous student data
      return;
    }
    try {
      setLoadingStudents(true);
      const response = await api.get("/admin/users"); 
      setStudents(response.data.filter(u => u.role === 'student')); // Filter for students
    } catch (err) {
      setProgressError(err.response?.data?.detail || "Gagal memuat daftar siswa.");
      console.error(err);
    } finally {
      setLoadingStudents(false);
    }
  };

  const handleFileChange = (e) => {
    setFile(e.target.files[0]);
  };

  const handleUpload = async (e) => {
    e.preventDefault();
    if (!file || !classId || !topic) {
      setError("Mohon isi semua field dan pilih file.");
      return;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("class_id", classId);
    formData.append("topic", topic);

    setUploading(true);
    setError("");
    setMessage("");

    try {
      const response = await api.post("/materials", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      setMessage(response.data.message);
      fetchMaterials();
      setClassId("");
      setTopic("");
      setFile(null);
      e.target.reset();
    } catch (err) {
      setError(err.response?.data?.detail || "Terjadi kesalahan saat mengunggah.");
      console.error(err);
    } finally {
      setUploading(false);
    }
  };

  const handleViewProgress = async (studentId) => {
    try {
      setProgressError(null);
      const response = await api.get(`/progress/${studentId}`);
      setSelectedStudentProgress(response.data);
      setIsProgressModalOpen(true);
    } catch (err) {
      setProgressError(err.response?.data?.detail || "Gagal memuat progres siswa.");
      console.error(err);
    } finally {
      // No need to set loading to false here, as the quiz is ended
    }
  };

  const handleCloseProgressModal = () => {
    setIsProgressModalOpen(false);
    setSelectedStudentProgress(null);
  };

  const handleDownloadReport = () => {
    // The API service already adds the Authorization header
    window.open(`${api.defaults.baseURL}/reports/students.csv`, '_blank');
  };

  const handleLogout = () => {
    localStorage.clear();
    navigate("/login");
  };

  if (!user) return <div className="p-6">Memuat...</div>;

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <StudentProgressModal 
        isOpen={isProgressModalOpen}
        onClose={handleCloseProgressModal}
        progress={selectedStudentProgress}
      />

      <header className="flex justify-between items-center mb-8">
        <h1 className="text-3xl font-bold text-gray-800">Dasbor Guru</h1>
        <button
          onClick={handleLogout}
          className="bg-red-600 text-white px-4 py-2 rounded-md hover:bg-red-700 transition"
        >
          Logout
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
        {/* Upload Section */}
        <div className="md:col-span-1">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <h2 className="text-xl font-semibold text-gray-700 mb-4">Unggah Materi Baru</h2>
            <form onSubmit={handleUpload} className="space-y-4">
              <div>
                <label htmlFor="classId" className="block text-sm font-medium text-gray-700">ID Kelas</label>
                <input
                  type="text"
                  id="classId"
                  value={classId}
                  onChange={(e) => setClassId(e.target.value)}
                  placeholder="Contoh: 10-A"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="topic" className="block text-sm font-medium text-gray-700">Topik</label>
                <input
                  type="text"
                  id="topic"
                  value={topic}
                  onChange={(e) => setTopic(e.target.value)}
                  placeholder="Contoh: Dasar Aljabar"
                  className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm"
                  required
                />
              </div>
              <div>
                <label htmlFor="file" className="block text-sm font-medium text-gray-700">File</label>
                <input
                  type="file"
                  id="file"
                  onChange={(e) => setFile(e.target.files[0])}
                  className="mt-1 block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-indigo-50 file:text-indigo-700 hover:file:bg-indigo-100"
                  required
                />
              </div>
              <button
                type="submit"
                disabled={uploading}
                className="w-full bg-indigo-600 text-white py-2 px-4 rounded-md hover:bg-indigo-700 disabled:bg-indigo-300 flex items-center justify-center gap-2"
              >
                {uploading ? "Mengunggah..." : <><UploadCloud size={18} /> Unggah</>}
              </button>
              {message && <p className="text-green-600 text-sm mt-2">{message}</p>}
              {error && <p className="text-red-600 text-sm mt-2">{error}</p>}
            </form>
          </div>
        </div>

        {/* Materials List Section */}
        <div className="md:col-span-2">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">Materi yang Telah Diunggah</h2>
              <Link
                to="/teacher/quiz/new"
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 flex items-center gap-2 transition"
              >
                <Plus size={18} />
                Buat Kuis
              </Link>
            </div>
            {loadingMaterials ? <p>Memuat materi...</p> : (
              <ul className="space-y-3 max-h-96 overflow-y-auto">
                {materials.length > 0 ? materials.map((material) => (
                  <li key={material.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-md hover:bg-gray-100">
                    <div className="flex items-center gap-3">
                      <BookOpen className="text-indigo-500" size={20} />
                      <div>
                        <p className="font-semibold text-gray-800">{material.filename}</p>
                        <p className="text-sm text-gray-500">Kelas: {material.class_id} | Topik: {material.topic}</p>
                      </div>
                    </div>
                  </li>
                )) : <p className="text-gray-500">Belum ada materi yang diunggah.</p>}
              </ul>
            )}
          </div>
        </div>

        {/* Student Progress Monitoring Section */}
        <div className="md:col-span-3">
          <div className="bg-white p-6 rounded-lg shadow-md">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-semibold text-gray-700">Pemantauan Progres Siswa</h2>
              <button
                onClick={handleDownloadReport}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 flex items-center gap-2 transition"
              >
                <Download size={18} /> Unduh Laporan CSV
              </button>
            </div>
            {loadingStudents ? <p>Memuat daftar siswa...</p> : (
              <> 
                {progressError && <p className="text-red-600 text-sm mb-4">{progressError}</p>}
                {students.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email Siswa</th>
                          <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Aksi</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {students.map((student) => (
                          <tr key={student.id}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-800">{student.email}</td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                              <button
                                onClick={() => handleViewProgress(student.id)}
                                className="text-blue-600 hover:text-blue-900 flex items-center justify-end gap-1"
                              >
                                <Eye size={18} /> Lihat Progres
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <p className="text-gray-500">Belum ada siswa terdaftar.</p>
                )}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}