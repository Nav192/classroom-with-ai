
import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { Card, CardContent, Typography, CircularProgress, Alert, Box, Chip, Button } from '@mui/material';
import { ChevronLeft } from 'lucide-react';

const QuizResultDetails = () => {
    const { resultId } = useParams();
    const navigate = useNavigate();
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

    const { quiz_title, score, total_questions, submitted_at, details, max_attempts, attempts_taken, available_until, class_id, quiz_id } = resultDetails;

    const userRole = localStorage.getItem("role");
    const isTeacherOrAdmin = userRole === 'teacher' || userRole === 'admin';
    const isStudent = userRole === 'student';

    const canViewDetails = isTeacherOrAdmin || (available_until && new Date() > new Date(available_until));
    const attemptsRemaining = max_attempts - attempts_taken;

    return (
        <Box sx={{ p: 3 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h4" gutterBottom component="div">
                    {quiz_title} - Result Details
                </Typography>
                {isTeacherOrAdmin && (
                    <Button
                        variant="outlined"
                        startIcon={<ChevronLeft />}
                        component={Link}
                        to={`/teacher/class/${class_id}/quiz/${quiz_id}/submissions`}
                    >
                        Back to Submissions
                    </Button>
                )}
                {isStudent && (
                    <Button
                        variant="outlined"
                        startIcon={<ChevronLeft />}
                        onClick={() => navigate('/student/dashboard', { state: { classId: class_id, activeTab: 'results' } })}
                    >
                        Back to Results
                    </Button>
                )}
            </Box>
            <Box sx={{ mb: 3, display: 'flex', gap: 2, alignItems: 'center' }}>
                <Chip label={`Score: ${total_questions > 0 ? Math.round((score / total_questions) * 100) : 0} / 100`} color="primary" />
                <Chip label={`Submitted: ${new Date(submitted_at).toLocaleString()}`} variant="outlined" />
                {max_attempts !== null && (
                    <Chip label={`Attempts: ${attempts_taken} / ${max_attempts}`} color="info" />
                )}
            </Box>

            {!canViewDetails && (
                <Alert severity="info" sx={{ mb: 3 }}>
                    Detailed answers will be shown after the quiz schedule ends.
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

                            {item.question.question_type === 'essay' ? (
                                item.teacher_feedback && ( // Only show if feedback exists
                                    <Box 
                                        sx={{ 
                                            p: 2, 
                                            borderRadius: 1,
                                            backgroundColor: 'info.light' // Use a different color for feedback
                                        }}
                                    >
                                        <Typography variant="body1">
                                            <strong>Teacher Feedback:</strong> {item.teacher_feedback}
                                        </Typography>
                                    </Box>
                                )
                            ) : (
                                !item.is_correct && ( // Original logic for non-essay questions
                                    <Box 
                                        sx={{ 
                                            p: 2, 
                                            borderRadius: 1,
                                            backgroundColor: 'success.light'
                                        }}
                                    >
                                        <Typography variant="body1">
                                            <strong>Correct Answer:</strong> {item.correct_answer}
                                        </Typography>
                                    </Box>
                                )
                            )}
                        </CardContent>
                    </Card>
                ))
            ) : (
                <Alert severity="warning">The quiz schedule has not ended yet.</Alert>
            )}
        </Box>
    );
};

export default QuizResultDetails;
