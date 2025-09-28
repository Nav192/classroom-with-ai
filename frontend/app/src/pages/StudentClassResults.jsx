
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
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

const StudentClassResults = ({ classId }) => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchClassResults = async () => {
            if (!classId) return;

            try {
                setLoading(true);
                // Fetch all of the student's results
                const allResultsRes = await api.get('/results/history');
                const allResults = allResultsRes.data || [];

                // Fetch all quizzes for the current class to filter the results and get titles
                const classQuizzesRes = await api.get(`/quizzes/${classId}`);
                const classQuizzes = classQuizzesRes.data || [];
                const classQuizIds = new Set(classQuizzes.map(q => q.id));
                const quizTitleMap = new Map(classQuizzes.map(q => [q.id, q.topic]));

                // Filter the results to include only those from the current class and add quiz titles
                const filteredResults = allResults.filter(r => classQuizIds.has(r.quiz_id)).map(r => ({
                    ...r,
                    quiz_title: quizTitleMap.get(r.quiz_id) || `Unknown Quiz (${r.quiz_id})`
                }));

                setResults(filteredResults);
                setError('');
            } catch (err) {
                setError(err.response?.data?.detail || 'Failed to load quiz results for this class.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchClassResults();
    }, [classId]);

    if (loading) {
        return <Box display="flex" justifyContent="center" sx={{ p: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box sx={{ p: 1 }}>
            <Typography variant="h6" gutterBottom>Quiz Results for this Class</Typography>
            <TableContainer component={Paper}>
                <Table aria-label="quiz results table">
                    <TableHead>
                        <TableRow>
                            <TableCell>Quiz Title</TableCell>
                            <TableCell align="right">Score</TableCell>
                            <TableCell align="right">Attempt</TableCell>
                            <TableCell align="center">Submitted At</TableCell>
                            <TableCell align="center">Action</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {results.length > 0 ? (
                            results.map((result) => (
                                <TableRow key={result.id}>
                                    <TableCell component="th" scope="row">
                                        {result.quiz_title || `Quiz ID: ${result.quiz_id}`}
                                    </TableCell>
                                    <TableCell align="right">{result.score} / {result.total}</TableCell>
                                    <TableCell align="right">{result.attempt_number}</TableCell>
                                    <TableCell align="center">{new Date(result.created_at).toLocaleString()}</TableCell>
                                    <TableCell align="center">
                                        <Button
                                            variant="outlined"
                                            size="small"
                                            component={Link}
                                            to={`/student/results/${result.id}`}
                                        >
                                            View Details
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={5} align="center">You have not completed any quizzes in this class yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default StudentClassResults;
