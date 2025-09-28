import React, { useState, useEffect } from 'react';
import { useLocation, Link } from 'react-router-dom';
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
    Collapse, 
    IconButton, 
    Button 
} from '@mui/material';
import { KeyboardArrowDown, KeyboardArrowUp } from '@mui/icons-material';

const StudentRow = ({ student, classId }) => {
    const [open, setOpen] = useState(false);
    const [results, setResults] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const fetchStudentResults = async () => {
        if (results.length > 0) return; // Don't refetch
        try {
            setLoading(true);
            const res = await api.get(`/api/results/class/${classId}/student/${student.user_id}`);
            setResults(res.data || []);
            setError('');
        } catch (err) {
            setError(err.response?.data?.detail || 'Failed to load quiz results.');
        } finally {
            setLoading(false);
        }
    };

    const handleToggle = () => {
        setOpen(!open);
        if (!open) {
            fetchStudentResults();
        }
    };

    return (
        <React.Fragment>
            <TableRow sx={{ '& > *': { borderBottom: 'unset' } }}>
                <TableCell>
                    <IconButton aria-label="expand row" size="small" onClick={handleToggle}>
                        {open ? <KeyboardArrowUp /> : <KeyboardArrowDown />}
                    </IconButton>
                </TableCell>
                <TableCell component="th" scope="row">{student.username}</TableCell>
                <TableCell>{student.email}</TableCell>
                <TableCell align="right">{student.materials_completed}</TableCell>
                <TableCell align="right">{student.quizzes_attempted}</TableCell>
                <TableCell align="right">{student.average_score?.toFixed(2) ?? 'N/A'}%</TableCell>
            </TableRow>
            <TableRow>
                <TableCell style={{ paddingBottom: 0, paddingTop: 0 }} colSpan={6}>
                    <Collapse in={open} timeout="auto" unmountOnExit>
                        <Box sx={{ margin: 1 }}>
                            <Typography variant="h6" gutterBottom component="div">
                                Quiz History
                            </Typography>
                            {loading && <CircularProgress size={24} />}
                            {error && <Alert severity="error" sx={{ mt: 1 }}>{error}</Alert>}
                            {!loading && !error && (
                                <Table size="small" aria-label="quiz results">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Quiz Title</TableCell>
                                            <TableCell>Score</TableCell>
                                            <TableCell>Submitted At</TableCell>
                                            <TableCell>Action</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {results.length > 0 ? results.map((result) => (
                                            <TableRow key={result.id}>
                                                <TableCell>{result.quiz_title || result.quiz_id}</TableCell>
                                                <TableCell>{result.score} / {result.total}</TableCell>
                                                <TableCell>{new Date(result.created_at).toLocaleString()}</TableCell>
                                                <TableCell>
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
                                        )) : (
                                            <TableRow>
                                                <TableCell colSpan={4}>No quiz results found for this student.</TableCell>
                                            </TableRow>
                                        )}
                                    </TableBody>
                                </Table>
                            )}
                        </Box>
                    </Collapse>
                </TableCell>
            </TableRow>
        </React.Fragment>
    );
};

export default function StudentProgress() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const location = useLocation();
    const searchParams = new URLSearchParams(location.search);
    const classId = searchParams.get('classId');
    const className = searchParams.get('className');

    useEffect(() => {
        if (!classId) {
            setError('No class ID provided in URL.');
            setLoading(false);
            return;
        }

        const fetchStudentProgress = async () => {
            try {
                setLoading(true);
                const studentsRes = await api.get(`/api/progress/class/${classId}/students`);
                setStudents(studentsRes.data || []);
                setError('');
            } catch (err) {
                setError(err.response?.data?.detail || 'Failed to load student progress.');
            } finally {
                setLoading(false);
            }
        };

        fetchStudentProgress();
    }, [classId]);

    if (loading) {
        return <Box display="flex" justifyContent="center" sx={{ p: 4 }}><CircularProgress /></Box>;
    }

    if (error) {
        return <Alert severity="error">{error}</Alert>;
    }

    return (
        <Box sx={{ p: 3 }}>
            <Typography variant="h4" gutterBottom>
                Student Progress: {className || 'Class'}
            </Typography>
            <TableContainer component={Paper}>
                <Table aria-label="collapsible table">
                    <TableHead>
                        <TableRow>
                            <TableCell />
                            <TableCell>Student Name</TableCell>
                            <TableCell>Email</TableCell>
                            <TableCell align="right">Materials Completed</TableCell>
                            <TableCell align="right">Quizzes Attempted</TableCell>
                            <TableCell align="right">Average Score</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {students.length > 0 ? (
                            students.map((student) => (
                                <StudentRow key={student.user_id} student={student} classId={classId} />
                            ))
                        ) : (
                            <TableRow>
                                <TableCell colSpan={6} align="center">No students in this class yet.</TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
}
