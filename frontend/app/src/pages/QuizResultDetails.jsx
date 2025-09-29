
import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, Typography, CircularProgress, Alert, Box, Chip } from '@mui/material';

const QuizResultDetails = () => {
    const { resultId } = useParams();
    const [resultDetails, setResultDetails] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchResultDetails = async () => {
            try {
                setLoading(true);
                const response = await api.get(`/results/${resultId}/details`);
                setResultDetails(response.data);
                setError('');
            } catch (err) {
                setError(err.response?.data?.detail || 'Failed to load quiz result details.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };

        fetchResultDetails();
    }, [resultId]);

    if (loading) {
        return <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh"><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    if (!resultDetails) {
        return <Alert severity="info">No quiz result details found.</Alert>;
    }

    const { quiz_title, score, total_questions, submitted_at, details, max_attempts, attempts_taken } = resultDetails;

    const userRole = localStorage.getItem("user_role");
    const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin';

    const canViewDetails = isTeacherOrAdmin || (attempts_taken >= max_attempts);
    const attemptsRemaining = max_attempts - attempts_taken;

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom component="div">
                {quiz_title} - Result Details
            </Typography>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Chip label={`Score: ${score} / ${total_questions}`} color="primary" />
                <Chip label={`Submitted: ${new Date(submitted_at).toLocaleString()}`} variant="outlined" />
                {max_attempts !== null && (
                    <Chip label={`Attempts: ${attempts_taken} / ${max_attempts}`} color="info" />
                )}
            </Box>

            {!canViewDetails && max_attempts !== null && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    You have {attemptsRemaining} attempt(s) remaining. Detailed answers will be shown after all attempts are used.
                </Alert>
            )}

            {canViewDetails ? (
                details.map((item, index) => (
                    <Card key={item.question.id} sx={{ mb: 2 }}>
                        <CardContent>
                            <Typography variant="h6" component="div" sx={{ mb: 2 }}>
                                Question {index + 1}: {item.question.question_text}
                                {isTeacherOrAdmin && item.difficulty_level && (
                                    <Chip 
                                        label={`Difficulty: ${item.difficulty_level}`}
                                        size="small"
                                        color={item.difficulty_level === 'Hard' ? 'error' : item.difficulty_level === 'Medium' ? 'warning' : 'success'}
                                        sx={{ ml: 2 }}
                                    />
                                )}
                            </Typography>
                            
                            <Box 
                                sx={{ 
                                    p: 2, 
                                    borderRadius: 1,
                                    mb: 1,
                                    backgroundColor: item.is_correct ? 'success.light' : 'error.light'
                                }}
                            >
                                <Typography variant="body1">
                                    <strong>Your Answer:</strong> {item.submitted_answer || 'Not answered'}
                                </Typography>
                            </Box>

                            {!item.is_correct && (
                                                            <Box 
                                                                sx={{ 
                                                                    p: 2, 
                                                                    borderRadius: 1,
                                                                    backgroundColor: 'success.light'
                                                                }}
                                                            >                                    <Typography variant="body1">
                                        <strong>Correct Answer:</strong> {item.correct_answer}
                                    </Typography>
                                </Box>
                            )}
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Alert severity="warning">Complete all attempts to view detailed answers.</Alert>
            )}
        </Box>
    );
};

export default QuizResultDetails;
