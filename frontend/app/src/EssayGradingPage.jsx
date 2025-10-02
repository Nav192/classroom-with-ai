import React, { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from './services/api';

const EssayGradingPage = () => {
    const { quizId } = useParams();
    const [quizDetails, setQuizDetails] = useState(null);
    const [pendingAttempts, setPendingAttempts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [grades, setGrades] = useState({}); // {answerId: {score: int, feedback: string}}

    useEffect(() => {
        const fetchPendingEssays = async () => {
            setLoading(true);
            try {
                // Fetch quiz details to get all questions
                const quizResponse = await api.get(`/quizzes/${quizId}/details`);
                setQuizDetails(quizResponse.data);

                // Fetch all quiz attempts for this quiz that are pending review
                // This endpoint needs to be created in the backend
                // For now, let's assume a new endpoint: /quizzes/{quizId}/pending-essay-reviews
                const attemptsResponse = await api.get(`/quizzes/${quizId}/pending-essay-reviews`);
                setPendingAttempts(attemptsResponse.data);

                // Initialize grades state
                const initialGrades = {};
                attemptsResponse.data.forEach(attempt => {
                    attempt.essay_answers.forEach(answer => {
                        initialGrades[answer.id] = {
                            score: answer.teacher_score || '',
                            feedback: answer.teacher_feedback || '',
                        };
                    });
                });
                setGrades(initialGrades);

            } catch (err) {
                setError(err.response?.data?.detail || 'Failed to fetch pending essay reviews.');
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchPendingEssays();
    }, [quizId]);

    const handleGradeChange = (answerId, field, value) => {
        setGrades(prev => ({
            ...prev,
            [answerId]: {
                ...prev[answerId],
                [field]: value,
            },
        }));
    };

    const handleSubmitGrade = async (answerId) => {
        setLoading(true);
        try {
            const gradeData = grades[answerId];
            await api.post(`/quizzes/${quizId}/answers/${answerId}/grade`, {
                teacher_score: parseInt(gradeData.score),
                teacher_feedback: gradeData.feedback,
            });
            alert('Grade submitted successfully!');
            // Re-fetch pending essays to update the list
            // Or update state directly if response includes updated answer
            const updatedAttempts = pendingAttempts.map(attempt => ({
                ...attempt,
                essay_answers: attempt.essay_answers.map(ans =>
                    ans.id === answerId ? { ...ans, ...gradeData, is_manually_graded: true } : ans
                ),
            }));
            setPendingAttempts(updatedAttempts);

            // Check if all essays for this attempt are graded, then update attempt status
            const updatedAttempt = updatedAttempts.find(attempt =>
                attempt.essay_answers.some(ans => ans.id === answerId)
            );
            if (updatedAttempt) {
                const allEssaysGradedInAttempt = updatedAttempt.essay_answers.every(ans => ans.is_manually_graded);
                if (allEssaysGradedInAttempt) {
                    // Optionally, re-fetch quiz details or update status locally
                    // For now, just alert and let the user refresh or navigate
                    alert(`All essays for student ${updatedAttempt.student_name} have been graded!`);
                }
            }

        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to submit grade.');
            console.error(err);
            alert('Error submitting grade: ' + (err.response?.data?.detail || err.message));
        } finally {
            setLoading(false);
        }
    };

    if (loading) return <div className="text-center p-4">Loading essay reviews...</div>;
    if (error) return <div className="text-center p-4 text-red-500">Error: {error}</div>;
    if (!quizDetails) return <div className="text-center p-4">Quiz not found.</div>;

    const essayQuestions = quizDetails.questions.filter(q => q.type === 'essay');

    return (
        <div className="container mx-auto p-4">
            <h1 className="text-3xl font-bold mb-6">Grade Essays for: {quizDetails.topic}</h1>

            {pendingAttempts.length === 0 ? (
                <div className="bg-green-100 border-l-4 border-green-500 text-green-700 p-4" role="alert">
                    <p className="font-bold">No Pending Essay Reviews</p>
                    <p>All essay questions for this quiz have been graded.</p>
                </div>
            ) : (
                <div className="space-y-8">
                    {pendingAttempts.map(attempt => (
                        <div key={attempt.result_id} className="bg-white shadow-md rounded-lg p-6">
                            <h2 className="text-2xl font-semibold mb-4">Student: {attempt.student_name} (Attempt {attempt.attempt_number})</h2>
                            <div className="space-y-6">
                                {attempt.essay_answers.map(answer => (
                                    <div key={answer.id} className="border p-4 rounded-md bg-gray-50">
                                        <h3 className="text-xl font-medium mb-2">Question: {answer.question_text}</h3>
                                        <p className="mb-4"><strong>Student's Answer:</strong> {answer.answer}</p>

                                        {!answer.is_manually_graded ? (
                                            <div className="space-y-3">
                                                <div>
                                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={`score-${answer.id}`}>
                                                        Score (0-100)
                                                    </label>
                                                    <input
                                                        type="number"
                                                        id={`score-${answer.id}`}
                                                        min="0"
                                                        max="100"
                                                        value={grades[answer.id]?.score || ''}
                                                        onChange={(e) => handleGradeChange(answer.id, 'score', e.target.value)}
                                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                        required
                                                    />
                                                </div>
                                                <div>
                                                    <label className="block text-gray-700 text-sm font-bold mb-2" htmlFor={`feedback-${answer.id}`}>
                                                        Feedback
                                                    </label>
                                                    <textarea
                                                        id={`feedback-${answer.id}`}
                                                        rows="4"
                                                        value={grades[answer.id]?.feedback || ''}
                                                        onChange={(e) => handleGradeChange(answer.id, 'feedback', e.target.value)}
                                                        className="shadow appearance-none border rounded w-full py-2 px-3 text-gray-700 leading-tight focus:outline-none focus:shadow-outline"
                                                    ></textarea>
                                                </div>
                                                <button
                                                    onClick={() => handleSubmitGrade(answer.id)}
                                                    className="bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded"
                                                    disabled={loading}
                                                >
                                                    Submit Grade
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="bg-green-50 p-3 rounded-md">
                                                <p className="font-medium">Graded:</p>
                                                <p>Score: {answer.teacher_score}/100</p>
                                                <p>Feedback: {answer.teacher_feedback || 'No feedback provided.'}</p>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default EssayGradingPage;