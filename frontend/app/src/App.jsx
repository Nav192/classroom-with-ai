import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useNavigate,
} from "react-router-dom";
import { useEffect, useState, useCallback } from "react";
import Signup from "./pages/Signup.jsx";
import Login from "./pages/Login.jsx";
import StudentDashboard from "./pages/StudentDashboard.jsx";
import TeacherDashboard from "./pages/TeacherDashboard.jsx";
import AdminDashboard from "./pages/AdminDashboard.jsx";
import ProtectedRoute from "./ProtectedRoute.jsx";
import ResultsPage from "./pages/ResultsPage.jsx";
import QuizBuilder from "./pages/QuizBuilder.jsx";
import QuizTaker from "./pages/QuizTaker.jsx";
import DefaultLayout from "./layouts/DefaultLayout.jsx";
import Home from "./pages/Home.jsx";
import Materials from "./pages/Materials.jsx";
import Quizzes from "./pages/Quizzes.jsx";
import Progress from "./pages/Progress.jsx";
import Chat from "./pages/Chat.jsx";
import StudentProgress from "./pages/StudentProgress.jsx";
import ClassAverageScores from "./pages/ClassAverageScores.jsx";
import QuizResultDetails from "./pages/QuizResultDetails.jsx";
import ResetPassword from "./pages/ResetPassword.jsx";
import ForgotPassword from "./pages/ForgotPassword.jsx";
import AdminLogin from "./pages/AdminLogin.jsx";
import EssayGradingPage from "./pages/EssayGradingPage.jsx";
import QuizSubmissionsPage from "./pages/QuizSubmissionsPage.jsx"; // Import new component
import DefinitionManager from "./pages/DefinitionManager.jsx";

const INACTIVITY_TIMEOUT = 15 * 60 * 1000; // 15 minutes in milliseconds

function AppContent() {
  const navigate = useNavigate();
  const [lastActivity, setLastActivity] = useState(Date.now());

  const logout = useCallback(() => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    localStorage.removeItem("role");
    navigate("/login", { replace: true });
    alert("You have been logged out due to inactivity.");
  }, [navigate]);

  const resetActivityTimer = useCallback(() => {
    setLastActivity(Date.now());
  }, []);

  useEffect(() => {
    const events = [
      "load",
      "mousemove",
      "mousedown",
      "click",
      "scroll",
      "keypress",
    ];
    events.forEach((event) =>
      window.addEventListener(event, resetActivityTimer)
    );

    return () => {
      events.forEach((event) =>
        window.removeEventListener(event, resetActivityTimer)
      );
    };
  }, [resetActivityTimer]);

  useEffect(() => {
    const interval = setInterval(() => {
      const isAuthenticated = localStorage.getItem("access_token");
      if (isAuthenticated && Date.now() - lastActivity > INACTIVITY_TIMEOUT) {
        logout();
      }
    }, 1000); // Check every second

    return () => clearInterval(interval);
  }, [lastActivity, logout]);

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/admin-login" element={<AdminLogin />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route element={<DefaultLayout />}>
        <Route
          path="/admin/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["admin"]}
              Component={AdminDashboard}
            />
          }
        />
        <Route path="/" element={<Navigate to="/login" replace />} />

        <Route
          path="/student/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["student"]}
              Component={StudentDashboard}
            />
          }
        />
        <Route
          path="/student/quiz/:quizId"
          element={
            <ProtectedRoute allowedRoles={["student"]} Component={QuizTaker} />
          }
        />
        <Route
          path="/student/results/:resultId"
          element={
            <ProtectedRoute
              allowedRoles={["student"]}
              Component={QuizResultDetails}
            />
          }
        />

        <Route
          path="/teacher/dashboard"
          element={
            <ProtectedRoute
              allowedRoles={["teacher"]}
              Component={TeacherDashboard}
            />
          }
        />
        <Route
          path="/teacher/quiz/new"
          element={
            <ProtectedRoute
              allowedRoles={["teacher"]}
              Component={QuizBuilder}
            />
          }
        />
        <Route
          path="/teacher/quiz/edit/:quizId"
          element={
            <ProtectedRoute
              allowedRoles={["teacher"]}
              Component={QuizBuilder}
            />
          }
        />
        <Route
          path="/teacher/class/:classId/overall-averages"
          element={
            <ProtectedRoute
              allowedRoles={["teacher"]}
              Component={ClassAverageScores}
            />
          }
        />
        {/* New route for Quiz Submissions Page */}
        <Route
          path="/teacher/class/:classId/quiz/:quizId/submissions"
          element={
            <ProtectedRoute
              allowedRoles={["teacher"]}
              Component={QuizSubmissionsPage}
            />
          }
        />
        <Route
          path="/teacher/grade-essay/:resultId"
          element={
            <ProtectedRoute
              allowedRoles={["teacher"]}
              Component={EssayGradingPage}
            />
          }
        />
        <Route
          path="/teacher/student-progress"
          element={
            <ProtectedRoute
              allowedRoles={["teacher"]}
              Component={StudentProgress}
            />
          }
        />
        <Route
          path="/teacher/definitions"
          element={
            <ProtectedRoute
              allowedRoles={["teacher"]}
              Component={DefinitionManager}
            />
          }
        />

        {/* Other routes that might need protection or role-based access */}
        <Route
          path="/materials"
          element={
            <ProtectedRoute
              allowedRoles={["teacher", "admin"]}
              Component={Materials}
            />
          }
        />
        <Route
          path="/quizzes"
          element={
            <ProtectedRoute
              allowedRoles={["teacher", "admin"]}
              Component={Quizzes}
            />
          }
        />
        <Route
          path="/results"
          element={
            <ProtectedRoute
              allowedRoles={["teacher", "admin"]}
              Component={ResultsPage}
            />
          }
        />
        <Route
          path="/results/:resultId"
          element={
            <ProtectedRoute
              allowedRoles={["teacher", "admin"]}
              Component={QuizResultDetails}
            />
          }
        />
        <Route
          path="/progress"
          element={
            <ProtectedRoute
              allowedRoles={["teacher", "admin"]}
              Component={Progress}
            />
          }
        />

        <Route
          path="/chat"
          element={
            <ProtectedRoute
              allowedRoles={["student", "teacher", "admin"]}
              Component={Chat}
            />
          }
        />
      </Route>

      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <AppContent />
    </BrowserRouter>
  );
}
