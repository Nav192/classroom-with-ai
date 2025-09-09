import { Navigate, Outlet } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles }) {
  const isAuthenticated = localStorage.getItem("access_token");
  const userRole = localStorage.getItem("user_role");

  if (!isAuthenticated) {
    // If not authenticated, redirect to login page
    return <Navigate to="/login" replace />;
  }

  if (allowedRoles && !allowedRoles.includes(userRole)) {
    // If authenticated but role not allowed, redirect to a general dashboard or unauthorized page
    // For now, redirect to home, but a more specific unauthorized page could be better
    return <Navigate to="/" replace />;
  }

  return <Outlet />;
}
