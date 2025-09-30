import { useEffect, useState, useCallback } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { Users } from "lucide-react";
import api from "../services/api";
import CreateClassModal from "../components/CreateClassModal";
import TeacherClassGridDisplay from "../components/teacher/TeacherClassGridDisplay";
import DashboardHeader from "../components/teacher/DashboardHeader";
import ClassTabs from "../components/teacher/ClassTabs";
import TeacherClassManagementTab from "../components/teacher/TeacherClassManagementTab"; // Import the component

// Main Dashboard Component
export default function TeacherDashboard() {
  const initialUser = () => {
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("role");
    if (storedUserId && storedUserRole === "teacher") {
      return { id: storedUserId, role: storedUserRole };
    }
    return null;
  };
  const [user, setUser] = useState(initialUser);
  const navigate = useNavigate();
  const location = useLocation(); // Use useLocation hook
  const [username, setUsername] = useState("");
  const [myClasses, setMyClasses] = useState([]);
  const [loadingClasses, setLoadingClasses] = useState(true);
  const [classError, setClassError] = useState("");
  const [selectedClassDetails, setSelectedClassDetails] = useState(null);
  const [isCreateClassModalOpen, setIsCreateClassModalOpen] = useState(false);
  const [activeMainTab, setActiveMainTab] = useState("active"); // State for the main tabs
  const [initialClassTab, setInitialClassTab] = useState(null); // New state for initial active tab in ClassTabs

  useEffect(() => {
    if (!user) {
      navigate("/login");
    } else {
      fetchMyClasses();
      api
        .get(`/users/${user.id}`)
        .then((res) => setUsername(res.data.username));
    }
  }, [user, navigate]);

  // Effect to handle navigation state for class selection and tab activation
  useEffect(() => {
    if (location.state && location.state.classId) {
      const { classId, activeTab } = location.state;
      let foundClass = null;

      // Try to find the class in already fetched myClasses
      if (myClasses.length > 0) {
        foundClass = myClasses.find(c => c.id === classId);
      }

      if (foundClass) {
        setSelectedClassDetails(foundClass);
        if (activeTab) {
          setInitialClassTab(activeTab);
        }
        // Clear state to prevent re-triggering on subsequent renders
        navigate(location.pathname, { replace: true, state: {} });
      } else if (!loadingClasses) {
        // If not found in myClasses and myClasses are loaded, fetch it
        api.get(`/classes/${classId}`)
          .then(res => {
            setSelectedClassDetails(res.data);
            if (activeTab) {
              setInitialClassTab(activeTab);
            }
            // Clear state to prevent re-triggering on subsequent renders
            navigate(location.pathname, { replace: true, state: {} });
          })
          .catch(err => console.error("Failed to fetch class details from state", err));
      }
    }
  }, [location.state, myClasses, loadingClasses, navigate]);

  const fetchMyClasses = async () => {
    setLoadingClasses(true);
    try {
      const [memberOfResponse, createdByResponse] = await Promise.all([
        api.get(`/classes/me?show_archived=true&_=${new Date().getTime()}`),
        api.get(
          `/classes/created-by-me?show_archived=true&_=${new Date().getTime()}`
        ),
      ]);

      console.log("API Response - classes/me:", memberOfResponse.data);
      console.log(
        "API Response - classes/created-by-me:",
        createdByResponse.data
      );

      const combinedClassesMap = new Map();
      memberOfResponse.data.forEach((c) => combinedClassesMap.set(c.id, c));
      createdByResponse.data.forEach((c) => combinedClassesMap.set(c.id, c));

      const classes = Array.from(combinedClassesMap.values());
      console.log("Combined and unique classes:", classes);
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
      <DashboardHeader
        username={username}
        onClassJoined={fetchMyClasses}
        onCreateClassClick={() => setIsCreateClassModalOpen(true)}
      />

      {classError && (
        <p className="text-sm text-red-500 text-center py-2">{classError}</p>
      )}

      <>
        {loadingClasses ? (
          <p className="text-center py-20">Loading your classes...</p>
        ) : selectedClassDetails ? (
          <ClassTabs
            selectedClass={selectedClassDetails}
            onBackToClassSelection={() => setSelectedClassDetails(null)}
            username={username}
            initialActiveTab={initialClassTab} // Pass initialActiveTab to ClassTabs
          />
        ) : (
          <div className="bg-white p-6 rounded-lg shadow-md border border-gray-200">
            <div className="border-b border-gray-200 mb-6">
              <nav
                className="-mb-px flex space-x-6"
                aria-label="Class Grid Tabs"
              >
                <button
                  onClick={() => setActiveMainTab("active")}
                  className={`${
                    activeMainTab === "active"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                >
                  Active Classes
                </button>
                <button
                  onClick={() => setActiveMainTab("archived")}
                  className={`${
                    activeMainTab === "archived"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                >
                  Archived Classes
                </button>
                <button
                  onClick={() => setActiveMainTab("class_management")}
                  className={`${
                    activeMainTab === "class_management"
                      ? "border-blue-500 text-blue-600"
                      : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
                  } whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm`}
                >
                  Class Management
                </button>
              </nav>
            </div>
            {activeMainTab === "active" && (
              <TeacherClassGridDisplay
                myClasses={activeClasses}
                onSelectClass={setSelectedClassDetails}
              />
            )}
            {activeMainTab === "archived" && (
              <TeacherClassGridDisplay
                myClasses={archivedClasses}
                onSelectClass={setSelectedClassDetails}
              />
            )}
            {activeMainTab === "class_management" && (
              <TeacherClassManagementTab teacherName={username} />
            )}
          </div>
        )}
      </>

      {isCreateClassModalOpen && (
        <CreateClassModal
          setIsModalOpen={setIsCreateClassModalOpen}
          onClassCreated={() => {
            fetchMyClasses();
            setIsCreateClassModalOpen(false);
          }}
        />
      )}
    </div>
  );
}
