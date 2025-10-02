import React, { useState, useEffect } from "react";
import api from "../services/api";
import {
  Box,
  Typography,
  CircularProgress,
  Alert,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Button,
} from "@mui/material";
import { Link, useParams, useNavigate } from "react-router-dom";
import { ChevronLeft } from "lucide-react"; // Import ChevronLeft icon

export default function QuizSubmissionsPage() {
  console.log("--- QuizSubmissionsPage Rendered ---"); // Added console.log
  const { classId, quizId } = useParams();
  const navigate = useNavigate();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [quizTitle, setQuizTitle] = useState("Loading Quiz...");
  const [firstUngradedSubmissionId, setFirstUngradedSubmissionId] = useState(null);

  useEffect(() => {
    if (submissions.length > 0) {
        let found = false;
        for (const student of submissions) {
            for (const sub of student.submissions) {
                if (sub.status === "pending_review") {
                    setFirstUngradedSubmissionId(sub.id);
                    found = true;
                    break;
                }
            }
            if (found) break;
        }
        if (!found) {
            setFirstUngradedSubmissionId(null); // All graded
        }
    }
}, [submissions]);

  useEffect(() => {
    const fetchSubmissionsAndStudents = async () => {
      if (!classId || !quizId) {
        setError("Class ID or Quiz ID is missing.");
        setLoading(false);
        return;
      }
      try {
        setLoading(true);
        // Fetch quiz title
        const quizRes = await api.get(`/quizzes/${quizId}/details`);
        setQuizTitle(quizRes.data.topic);

        const [submissionsRes, studentsRes] = await Promise.all([
          api.get(`/results/class/${classId}/quiz/${quizId}`),
          api.get(`/progress/class/${classId}/students`),
        ]);

        const submissionsData = submissionsRes.data || [];
        const studentsData = studentsRes.data?.student_details || [];

        const submissionsByStudent = new Map();
        submissionsData.forEach((sub) => {
          if (!submissionsByStudent.has(sub.user_id)) {
            submissionsByStudent.set(sub.user_id, []);
          }
          submissionsByStudent.get(sub.user_id).push(sub);
        });

        const combinedData = studentsData.map((student) => {
          const studentSubmissions =
            submissionsByStudent.get(student.user_id) || [];

          // Sort submissions by created_at to find the latest
          studentSubmissions.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

          // Mark the latest attempt
          if (studentSubmissions.length > 0) {
            studentSubmissions[0].isLatestAttempt = true;
            // Mark others as not latest
            for (let i = 1; i < studentSubmissions.length; i++) {
              studentSubmissions[i].isLatestAttempt = false;
            }
          }

          return {
            ...student,
            submissions: studentSubmissions,
          };
        });

        setSubmissions(combinedData);
        setError("");
      } catch (err) {
        setError(
          err.response?.data?.detail || "Failed to load quiz submissions."
        );
        console.error(err);
      } finally {
        setLoading(false);
      }
    };

    fetchSubmissionsAndStudents();
  }, [classId, quizId]);

  return (
    <Box sx={{ p: 3 }}>
      <Box
        sx={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          mb: 2,
        }}
      >
        <Typography variant="h4" gutterBottom>
          Submissions for: {quizTitle}
        </Typography>
        <Button
          variant="outlined"
          onClick={() =>
            navigate(`/teacher/dashboard`, {
              state: { classId: classId, activeTab: "quizzes" },
            })
          }
          startIcon={<ChevronLeft size={20} />}
        >
          Back to Quizzes
        </Button>
      </Box>
      {loading ? (
        <Box display="flex" justifyContent="center" sx={{ p: 4 }}>
          <CircularProgress />
        </Box>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : (
        <TableContainer component={Paper}>
          <Table aria-label="quiz submissions table">
            <TableHead>
              <TableRow>
                <TableCell>Student Name</TableCell>
                <TableCell align="center">Status</TableCell>
                <TableCell align="right">Attempt</TableCell>
                <TableCell align="center">Submitted At</TableCell>
                <TableCell align="center">Action</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {submissions.length > 0 ? (
                submissions.map((student) => (
                  <React.Fragment key={student.user_id}>
                    {student.submissions.length > 0 ? (
                      student.submissions.map((submission, index) => (
                        <TableRow key={submission.id}>
                          <TableCell component="th" scope="row">
                            {index === 0 && student.username}
                          </TableCell>
                          <TableCell align="center">
                            {submission.status === "pending_review" ? (
                              <span className="text-yellow-600">
                                Pending Review
                              </span>
                            ) : (
                              <span>Completed</span>
                            )}
                          </TableCell>
                          <TableCell align="right">
                            {submission.attempt_number}
                          </TableCell>
                          <TableCell align="center">
                            {new Date(submission.created_at).toLocaleString()}
                          </TableCell>
                          <TableCell align="center">
                            {submission.status === "pending_review" ? (
                              <Button
                                variant="contained"
                                color="primary"
                                size="small"
                                component={Link}
                                to={`/teacher/grade-essay/${submission.id}`}
                                disabled={submission.status !== "pending_review" || submission.id !== firstUngradedSubmissionId || !submission.isLatestAttempt}
                              >
                                Grade Essays
                              </Button>
                            ) : (
                              <Button
                                variant="outlined"
                                size="small"
                                component={Link}
                                to={`/results/${submission.id}`}
                              >
                                View Details
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell component="th" scope="row">
                          {student.username}
                        </TableCell>
                        <TableCell align="center">Incomplete</TableCell>
                        <TableCell align="right">-</TableCell>
                        <TableCell align="center">-</TableCell>
                        <TableCell align="center">-</TableCell>
                      </TableRow>
                    )}
                  </React.Fragment>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} align="center">
                    No students in this class yet.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </Box>
  );
}
