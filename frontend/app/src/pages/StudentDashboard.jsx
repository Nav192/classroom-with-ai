import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Users } from "lucide-react";
import api from "../services/api";
import DashboardHeader from "../components/student/DashboardHeader";
import ClassTabs from "../components/student/ClassTabs";
import ClassGridDisplay from "../components/student/ClassGridDisplay";

export default function StudentDashboard() {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [myClasses, setMyClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classError, setClassError] = useState("");
  const [selectedClassDetails, setSelectedClassDetails] = useState(null);
  const [activeGridTab, setActiveGridTab] = useState("active"); // State for the grid tabs

  useEffect(() => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("role");
    if (!storedUserId || storedUserRole !== "student") {
      navigate("/login");
    } else {
      setUser({ id: storedUserId, role: storedUserRole });
      api
        .get(`/users/${storedUserId}`)
        .then((res) => setUsername(res.data.username));
    }
  }, [navigate]);

  useEffect(() => {
    if (user) {
      fetchMyClasses();
    }
  }, [user]); // Fetch classes once when user is loaded

  const fetchMyClasses = async () => {
    setLoadingClasses(true);
    try {
      const response = await api.get(`/classes/me?show_archived=true`);
      const classes = response.data || [];
      setMyClasses(classes);
    } catch (err) {
      setClassError("Failed to load your classes.");
    } finally {
      setLoadingClasses(false);
    }
  };

  const activeClasses = myClasses.filter((c) => !c.is_archived);
  const archivedClasses = myClasses.filter((c) => c.is_archived);

  if (!user)
    return <div className="p-6 text-center">Loading user profile...</div>;

  return (
    <div className="space-y-6">
      <DashboardHeader username={username} onClassJoined={fetchMyClasses} />

      {classError && (
        <p className="text-sm text-destructive text-center py-2">
          {classError}
        </p>
      )}

      {loadingClasses ? (
        <p className="text-center py-20">Loading your classes...</p>
      ) : selectedClassDetails ? (
        <ClassTabs
          selectedClass={selectedClassDetails}
          onBackToClassSelection={() => setSelectedClassDetails(null)}
        />
      ) : myClasses.length === 0 ? (
        <div className="text-center py-20 bg-white rounded-lg shadow-md border border-gray-200">
          <Users size={48} className="mx-auto text-gray-400 mb-4" />
          <h2 className="text-xl font-semibold text-gray-700">
            Welcome, {username}!
          </h2>
          <p className="text-gray-500 mt-2">
            You are not enrolled in any classes yet.
          </p>
          <p className="text-gray-500 mt-1">Join a class to get started.</p>
        </div>
      ) : (
        <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
          <div className="border-b border-gray-200 mb-6">
            <nav className="-mb-px flex space-x-6" aria-label="Class Grid Tabs">
              <button
                onClick={() => setActiveGridTab("active")}
                className={`${
                  activeGridTab === "active"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
              >
                Active Classes
              </button>
              <button
                onClick={() => setActiveGridTab("archived")}
                className={`${
                  activeGridTab === "archived"
                    ? "border-blue-500 text-blue-600"
                    : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
              >
                Archived Classes
              </button>
            </nav>
          </div>
          {activeGridTab === "active" ? (
            <ClassGridDisplay
              myClasses={activeClasses}
              onSelectClass={setSelectedClassDetails}
            />
          ) : (
            <ClassGridDisplay
              myClasses={archivedClasses}
              onSelectClass={setSelectedClassDetails}
            />
          )}
        </div>
      )}
    </div>
  );
}
