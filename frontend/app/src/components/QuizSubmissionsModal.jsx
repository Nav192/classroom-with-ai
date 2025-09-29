
import React, { useState, useEffect } from 'react';
import api from '../services/api';
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
    Modal
} from '@mui/material';
import { Link } from 'react-router-dom';

const QuizSubmissionsModal = ({ quizId, classId, quizTitle, open, onClose }) => {
    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        if (open) {
            const fetchSubmissionsAndStudents = async () => {
                if (!classId || !quizId) {
                    setError('Class ID or Quiz ID is missing.');
                    setLoading(false);
                    return;
                }
                try {
                    setLoading(true);
                    const [submissionsRes, studentsRes] = await Promise.all([
                        api.get(`/results/class/${classId}/quiz/${quizId}`),
                        api.get(`/progress/class/${classId}/students`)
                    ]);

                    const submissionsData = submissionsRes.data || [];
                    const studentsData = studentsRes.data?.student_details || [];

                    const submissionsByStudent = new Map();
                    submissionsData.forEach(sub => {
                        if (!submissionsByStudent.has(sub.user_id)) {
                            submissionsByStudent.set(sub.user_id, []);
                        }
                        submissionsByStudent.get(sub.user_id).push(sub);
                    });

                    const combinedData = studentsData.map(student => {
                        const studentSubmissions = submissionsByStudent.get(student.user_id) || [];
                        return {
                            ...student,
                            submissions: studentSubmissions
                        };
                    });

                    setSubmissions(combinedData);
                    setError('');
                } catch (err) {
                    setError(err.response?.data?.detail || 'Failed to load quiz submissions.');
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            };

            fetchSubmissionsAndStudents();
        }
    }, [classId, quizId, open]);

    return (
        <Modal open={open} onClose={onClose}>
            <Box sx={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '80%',
                bgcolor: 'background.paper',
                boxShadow: 24,
                p: 4,
                overflowY: 'auto',
                maxHeight: '90vh'
            }}>
                <Typography variant="h4" gutterBottom>Submissions for: {quizTitle}</Typography>
                {loading ? (
                    <Box display="flex" justifyContent="center" sx={{ p: 4 }}><CircularProgress /></Box>
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
                                                        <TableCell align="center">Completed</TableCell>
                                                        <TableCell align="right">{submission.attempt_number}</TableCell>
                                                        <TableCell align="center">{new Date(submission.created_at).toLocaleString()}</TableCell>
                                                        <TableCell align="center">
                                                            <Button
                                                                variant="outlined"
                                                                size="small"
                                                                component={Link}
                                                                to={`/results/${submission.id}`}
                                                            >
                                                                View Details
                                                            </Button>
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
                                        <TableCell colSpan={5} align="center">No students in this class yet.</TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </TableContainer>
                )}
            </Box>
        </Modal>
    );
};

export default QuizSubmissionsModal;
