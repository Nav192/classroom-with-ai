import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import api from "../services/api";
import DashboardHeader from "../components/admin/DashboardHeader";
import AdminTabs from "../components/admin/AdminTabs";

// Main Dashboard Component
export default function AdminDashboard() {
  console.log("AdminDashboard: Component Rendered");
  const navigate = useNavigate();
  const location = useLocation();
  const queryParams = new URLSearchParams(location.search);
  const initialTab = queryParams.get("tab") || "users"; // Default to 'users' tab
  console.log("AdminDashboard: initialTab from query params:", initialTab);

  const [user, setUser] = useState(null);
  const [username, setUsername] = useState("");
  const [stats, setStats] = useState({ users: 0, classes: 0, materials: 0 });

  useEffect(() => {
    console.log("AdminDashboard: useEffect triggered.");
    const storedUserId = localStorage.getItem("user_id");
    const storedUserRole = localStorage.getItem("role");

    console.log("AdminDashboard: storedUserId", storedUserId);
    console.log("AdminDashboard: storedUserRole", storedUserRole);

    if (storedUserId && storedUserRole === "admin") {
      console.log("AdminDashboard: User is admin, setting user state.");
      setUser({ id: storedUserId, role: storedUserRole });
      api
        .get(`/users/${storedUserId}`)
        .then((res) => {
          console.log(
            "AdminDashboard: Fetched username successfully.",
            res.data.username
          );
          setUsername(res.data.username);
        })
        .catch((err) => {
          console.error("AdminDashboard: Failed to fetch username:", err);
          // Optionally navigate to login if user data fetch fails
          // navigate("/login");
        });

      const fetchMaterialStats = async () => {
        try {
          const response = await api.get("/admin/materials/count");
          console.log("AdminDashboard: Fetched material stats.", response.data);
          setStats((prev) => ({ ...prev, materials: response.data }));
        } catch (err) {
          console.error("AdminDashboard: Failed to fetch material stats:", err);
        }
      };

      const fetchUserStats = async () => {
        try {
          const response = await api.get("/admin/users/count");
          console.log("AdminDashboard: Fetched user stats.", response.data);
          setStats((prev) => ({ ...prev, users: response.data }));
        } catch (err) {
          console.error("AdminDashboard: Failed to fetch user stats:", err);
        }
      };

      const fetchClassStats = async () => {
        try {
          const response = await api.get("/admin/classes/count");
          console.log("AdminDashboard: Fetched class stats.", response.data);
          setStats((prev) => ({ ...prev, classes: response.data }));
        } catch (err) {
          console.error("AdminDashboard: Failed to fetch class stats:", err);
        }
      };

      fetchMaterialStats();
      fetchUserStats();
      fetchClassStats();
    } else {
      console.log(
        "AdminDashboard: Not an admin or missing user ID. This should be handled by ProtectedRoute."
      );
      // This case should ideally be handled by ProtectedRoute
      // but as a fallback, if for some reason user is not admin, navigate to login
      // navigate("/login"); // Removed this redirect
    }
  }, [navigate]);

  console.log("AdminDashboard: Current user state:", user);
  if (!user)
    return <div className="p-6 text-center">Loading user profile...</div>;

  return (
    <div className="bg-gray-100 p-6">
      <DashboardHeader username={username} stats={stats} />
      <div className="mt-6">
        <AdminTabs setStats={setStats} defaultTab={initialTab} />
      </div>
    </div>
  );
}
