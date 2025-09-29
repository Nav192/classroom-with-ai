import { Navigate, Outlet, useLocation } from "react-router-dom";

export default function ProtectedRoute({ allowedRoles, Component }) {
  const isAuthenticated = localStorage.getItem("access_token");
  const userRole = localStorage.getItem("role");
  const location = useLocation();

  let rolesToCheck = allowedRoles || [];

  if (rolesToCheck.length === 0) {
    if (location.pathname === "/admin/dashboard") {
      rolesToCheck = ["admin"];
    } else if (location.pathname.startsWith("/student")) {
      rolesToCheck = ["student"];
    } else if (location.pathname.startsWith("/teacher")) {
      rolesToCheck = ["teacher"];
    } else if (location.pathname === "/materials" || location.pathname === "/quizzes" || location.pathname.startsWith("/results") || location.pathname === "/progress") {
      rolesToCheck = ["teacher", "admin"];
    } else if (location.pathname === "/chat") {
      rolesToCheck = ["student", "teacher", "admin"];
    } else {
      // Default for other protected routes if any
      rolesToCheck = ["student", "teacher", "admin"];
    }
  }

  console.log("--- ProtectedRoute Debug ---");
  console.log("Pathname:", location.pathname);
  console.log("isAuthenticated:", isAuthenticated);
  console.log("userRole (from localStorage):", userRole);
  console.log("determined allowedRoles for this path:", rolesToCheck);
  console.log("Is userRole included in allowedRoles?", rolesToCheck.includes(userRole));

  if (!isAuthenticated) {
    console.log("Redirect reason: Not authenticated. Navigating to /login");
    return <Navigate to="/login" replace />;
  }

  if (rolesToCheck.length > 0 && !rolesToCheck.includes(userRole)) {
    console.log("Redirect reason: Role not allowed for this path. Navigating to /");
    return <Navigate to="/" replace />;
  }

  console.log("Access granted. Rendering Component.");
  return Component ? <Component /> : <Outlet />;
}
