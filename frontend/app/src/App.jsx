import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
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

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        <Route
          element={
            <ProtectedRoute allowedRoles={["student", "teacher", "admin"]} />
          }
        >
          <Route element={<DefaultLayout />}>
            <Route path="/" element={<Navigate to="/login" replace />} />

            {/* Protected Routes */}
            <Route element={<ProtectedRoute allowedRoles={["student"]} />}>
              <Route path="/student/dashboard" element={<StudentDashboard />} />
              <Route path="/student/quiz/:quizId" element={<QuizTaker />} />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={["teacher"]} />}>
              <Route path="/teacher/dashboard" element={<TeacherDashboard />} />
              <Route path="/teacher/quiz/new" element={<QuizBuilder />} />
              <Route
                path="/teacher/student-progress"
                element={<StudentProgress />}
              />
            </Route>
            <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
              <Route path="/admin/dashboard" element={<AdminDashboard />} />
            </Route>

            {/* Other routes that might need protection or role-based access */}
            <Route
              element={<ProtectedRoute allowedRoles={["teacher", "admin"]} />}
            >
              <Route path="/materials" element={<Materials />} />
              <Route path="/quizzes" element={<Quizzes />} />
              <Route path="/results" element={<ResultsPage />} />
              <Route path="/progress" element={<Progress />} />
            </Route>
            <Route
              element={
                <ProtectedRoute
                  allowedRoles={["student", "teacher", "admin"]}
                />
              }
            >
              <Route path="/chat" element={<Chat />} />
            </Route>
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
