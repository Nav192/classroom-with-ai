
import React, { useState, useEffect } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
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

const QuizSubmissions = () => {
    const { classId, quizId } = useParams();
    const location = useLocation();
    const quizTitle = location.state?.quizTitle || 'Submissions';

    const [submissions, setSubmissions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchSubmissions = async () => {
            if (!classId || !quizId) {
                setError('Class ID or Quiz ID is missing.');
                setLoading(false);
                return;
            }
            try {
                setLoading(true);
                const response = await api.get(`/results/class/${classId}/quiz/${quizId}`);
                setSubmissions(response.data || []);
                setError('');
            } catch (err) {
                setError(err.response?.data?.detail || 'Failed to load quiz submissions.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchSubmissions();
    }, [classId, quizId]);

    if (loading) {
        return <Box display="flex" justifyContent="center" sx={{ p: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Submissions for: {quizTitle}</Typography>
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
