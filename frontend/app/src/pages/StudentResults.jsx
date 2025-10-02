
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

const StudentResults = () => {
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchResults = async () => {
            try {
                setLoading(true);
                const response = await api.get('/api/results/history');
                // Assuming the API returns quiz title along with the result
                // If not, an additional fetch or a join in the backend would be needed.
                // For now, we assume the necessary data is present.
                setResults(response.data || []);
                setError('');
            } catch (err) {
                setError(err.response?.data?.detail || 'Failed to load quiz results.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchResults();
    }, []);

    if (loading) {
        return <Box display="flex" justifyContent="center" sx={{ p: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h5" gutterBottom>My Quiz Results</Typography>
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
                                    <TableCell align="right">
                                        {result.status === 'pending_review' ? (
                                            <span className="text-yellow-600">Pending Review</span>
                                        ) : (
                                            `${result.score} / ${result.total}`
                                        )}
                                    </TableCell>
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
                                <TableCell colSpan={5} align="center">You have not completed any quizzes yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};

export default StudentResults;
