import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import api from '../services/api';
import {
    Box,
    Typography,
    CircularProgress,
    Alert,
    Button,
    TextField,
    Paper,
    Divider
} from '@mui/material';

export default function EssayGradingPage() {
    const { resultId } = useParams();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [quizResult, setQuizResult] = useState(null);
    const [essaySubmissions, setEssaySubmissions] = useState([]);
    const [grades, setGrades] = useState({}); // {essay_submission_id: {teacher_score, teacher_feedback}}
    const [isSaving, setIsSaving] = useState(false);
    const [isNotLatestAttempt, setIsNotLatestAttempt] = useState(false);

    const fetchEssayData = async () => {
        try {
            setLoading(true);
            setIsNotLatestAttempt(false); // Reset on new fetch

            // Fetch quiz result details
            const resultRes = await api.get(`/results/${resultId}/details`);
            setQuizResult(resultRes.data);

            // Fetch essay submissions for this result
            const essaySubmissionsRes = await api.get(`/results/${resultId}/essay-submissions-with-questions`);
            setEssaySubmissions(essaySubmissionsRes.data);

            // Initialize grades state
            const initialGrades = {};
            essaySubmissionsRes.data.forEach(sub => {
                initialGrades[sub.id] = {
                    teacher_score: sub.teacher_score || '',
                    teacher_feedback: sub.teacher_feedback || ''
                };
            });
            setGrades(initialGrades);

        } catch (err) {
            if (err.response?.status === 400 && err.response?.data?.detail === "Only the latest quiz attempt can be graded for essay questions.") {
                setIsNotLatestAttempt(true);
                setError("This is not the latest attempt. Only the latest attempt can be graded.");
            } else {
                setError(err.response?.data?.detail || 'Failed to load essay submissions.');
            }
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchEssayData();
    }, [resultId]);

    const handleGradeChange = (submissionId, field, value) => {
        setGrades(prev => ({
            ...prev,
            [submissionId]: {
                ...prev[submissionId],
                [field]: value
            }
        }));
    };

    const saveGrade = async (submissionId) => {
        setIsSaving(true);
        try {
            const submission = essaySubmissions.find(sub => sub.id === submissionId);
            const maxScore = submission.max_score;
            const score = parseInt(grades[submissionId].teacher_score, 10);

            if (isNaN(score) || score < 0 || score > maxScore) {
                setError(`Score for essay ${submissionId} must be between 0 and ${maxScore}.`);
                setIsSaving(false);
                return;
            }

            await api.put(`/results/essay-submissions/${submissionId}/grade`, {
                teacher_score: score,
                teacher_feedback: grades[submissionId].teacher_feedback
            });
            setError(null);
            // Re-fetch data to update status and scores
            await fetchEssayData();
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to save grade.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    const finalizeGrading = async () => {
        setIsSaving(true);
        try {
            await api.post(`/results/${resultId}/finalize-grading`);
            setError(null);
            // Re-fetch data to update status and scores
            await fetchEssayData();
            navigate(-1); // Go back to previous page (QuizSubmissionsModal)
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to finalize grading.');
            console.error(err);
        } finally {
            setIsSaving(false);
        }
    };

    if (loading) {
        return <Box display="flex" justifyContent="center" sx={{ p: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    if (!quizResult) {
        return <Alert severity="info">No quiz result found for this ID.</Alert>;
    }

    const allEssaysGraded = essaySubmissions.every(sub => sub.teacher_score !== null);

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>Grade Essay Submissions</Typography>
            <Typography variant="h6" gutterBottom>Quiz: {quizResult.quiz_title}</Typography>
            <Typography variant="subtitle1" gutterBottom>Student: {quizResult.user_id}</Typography>
            <Typography variant="subtitle1" gutterBottom>Current Status: {quizResult.status}</Typography>
            {quizResult.status === 'graded' && (
                <Typography variant="h6" color="primary">Final Score: {quizResult.score} / {quizResult.total}</Typography>
            )}

            <Divider sx={{ my: 3 }} />

            {essaySubmissions.length === 0 ? (
                <Alert severity="info">No essay questions found for this quiz result.</Alert>
            ) : (
                essaySubmissions.map(submission => (
                    <Paper key={submission.id} sx={{ p: 3, mb: 3, border: '1px solid #e0e0e0' }}>
                        <Typography variant="h6">Question: {submission.question_text}</Typography>
                        <Typography variant="body1" sx={{ mt: 1 }}><strong>Student Answer:</strong></Typography>
                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap' }}>{submission.student_answer}</Typography>
                        <Typography variant="body2" sx={{ mt: 2 }}>Max Score: {submission.max_score}</Typography>

                        <Box sx={{ mt: 2, display: 'flex', gap: 2, alignItems: 'center' }}>
                            <TextField
                                label="Score"
                                type="number"
                                value={grades[submission.id]?.teacher_score || ''}
                                onChange={(e) => handleGradeChange(submission.id, 'teacher_score', e.target.value)}
                                inputProps={{ min: 0, max: submission.max_score }}
                                sx={{ width: 100 }}
                            />
                            <TextField
                                label="Feedback"
                                multiline
                                rows={2}
                                value={grades[submission.id]?.teacher_feedback || ''}
                                onChange={(e) => handleGradeChange(submission.id, 'teacher_feedback', e.target.value)}
                                sx={{ flexGrow: 1 }}
                            />
                            <Button
                                variant="contained"
                                onClick={() => saveGrade(submission.id)}
                                disabled={isSaving || quizResult.status === 'graded' || isNotLatestAttempt}
                            >
                                {isSaving ? 'Saving...' : 'Save Grade'}
                            </Button>
                        </Box>
                        {submission.teacher_score !== null && (
                            <Typography variant="body2" color="textSecondary" sx={{ mt: 1 }}>
                                Graded: {submission.teacher_score} / {submission.max_score} (Last updated: {new Date(submission.updated_at).toLocaleString()})
                            </Typography>
                        )}
                    </Paper>
                ))
            )}

            <Box sx={{ mt: 4, display: 'flex', justifyContent: 'space-between' }}>
                <Button
                    variant="outlined"
                    onClick={() => navigate(-1)}
                    disabled={isNotLatestAttempt}
                >Back to Submissions</Button>
                <Button
                    variant="contained"
                    color="success"
                    onClick={finalizeGrading}
                    disabled={isSaving || !allEssaysGraded || quizResult.status === 'graded' || isNotLatestAttempt}
                >
                    {isSaving ? 'Finalizing...' : 'Finalize Quiz Grading'}
                </Button>
            </Box>
        </Box>
    );
}
