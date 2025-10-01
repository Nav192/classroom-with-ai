
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
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
    Button 
} from '@mui/material';
import { ChevronLeft } from 'lucide-react';

const QuizSubmissions = () => {
    const { classId, quizId } = useParams();
    const navigate = useNavigate();
    const [submissions, setSubmissions] = useState([]);
    const [quiz, setQuiz] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchData = async () => {
            if (!classId || !quizId) {
                setError('Class ID or Quiz ID is missing.');
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const [submissionsResponse, quizResponse] = await Promise.all([
                    api.get(`/results/class/${classId}/quiz/${quizId}`),
                    api.get(`/quizzes/${quizId}/details`)
                ]);
                setSubmissions(submissionsResponse.data || []);
                setQuiz(quizResponse.data || null);
                setError('');
            } catch (err) {
                setError(err.response?.data?.detail || 'Failed to load data.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, [classId, quizId]);

    if (loading) {
        return <Box display="flex" justifyContent="center" sx={{ p: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" gutterBottom>Submissions for: {quiz ? quiz.topic : 'Quiz'}</Typography>
                <Button
                    variant="outlined"
                    startIcon={<ChevronLeft />}
                    onClick={() => navigate('/teacher/dashboard', { state: { classId: classId, activeTab: 'quizzes' } })}
                >
                    Back to Quizzes
                </Button>
            </Box>
            <TableContainer component={Paper}>
                <Table aria-label="quiz submissions table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Student Name</TableCell>
                            <TableCell align="right">Score</TableCell>
                            <TableCell align="right">Attempt</TableCell>
                            <TableCell align="center">Submitted At</TableCell>
                            <TableCell align="center">Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {submissions.length > 0 ? (
                            submissions.map((result) => (
                                <TableRow key={result.id}>
                                    <TableCell component="th" scope="row">
                                        {result.username || 'N/A'}
                                    </TableCell>
                                    <TableCell align="right">{result.score} / {result.total}</TableCell>
                                    <TableCell align="right">{result.attempt_number}</TableCell>
                                    <TableCell align="center">{new Date(result.created_at).toLocaleString()}</TableCell>
                                    <TableCell align="center">
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            component={Link}
                                            to={`/results/${result.id}`}
                                        >
                                            View Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">No submissions for this quiz yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default QuizSubmissions;
