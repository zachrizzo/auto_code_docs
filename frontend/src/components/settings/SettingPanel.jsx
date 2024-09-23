// src/components/settings/SettingsPanel.jsx

import React, { useState } from 'react';
import {
    Popover,
    Typography,
    FormControlLabel,
    Switch,
    Select,
    MenuItem,
    Box,
    Button,
    Divider,
    Stack,
    Tooltip,
    IconButton,
    Snackbar,
    Alert,
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    TextField,
    RadioGroup,
    FormControl,
    FormLabel,
    Radio,
} from '@mui/material';

import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc, serverTimestamp } from 'firebase/firestore';
import SettingsIcon from '@mui/icons-material/Settings';
import LogoutIcon from '@mui/icons-material/Logout';
import FeedbackIcon from '@mui/icons-material/Feedback';
import CloseIcon from '@mui/icons-material/Close';
import { useNavigate } from 'react-router-dom';

const SettingsPanel = ({
    anchorEl,
    onClose,
    open,
    settings,
    handleToggle,
    handleChange,
}) => {
    const auth = getAuth();
    const db = getFirestore();

    // State for Snackbar notifications
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    // State for Feedback Modal
    const [feedbackOpen, setFeedbackOpen] = useState(false);
    const [feedbackType, setFeedbackType] = useState('bug');
    const [feedbackDescription, setFeedbackDescription] = useState('');
    const [feedbackSubmitting, setFeedbackSubmitting] = useState(false);
    const navigate = useNavigate();

    const handleLogout = async () => {
        try {
            await signOut(auth);
            // Show success notification
            setSnackbarMessage('Logged out successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            onClose(); // Close the settings panel after logout
            navigate('/login'); // Redirect to the login page
        } catch (error) {
            console.error('Error signing out:', error);
            // Show error notification
            setSnackbarMessage('Failed to logout. Please try again.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        }
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    const handleOpenFeedback = () => {
        setFeedbackOpen(true);
    };

    const handleCloseFeedback = () => {
        setFeedbackOpen(false);
        // Reset form fields
        setFeedbackType('bug');
        setFeedbackDescription('');
    };

    const handleSubmitFeedback = async () => {
        if (!feedbackDescription.trim()) {
            setSnackbarMessage('Please provide a description.');
            setSnackbarSeverity('warning');
            setSnackbarOpen(true);
            return;
        }

        setFeedbackSubmitting(true);

        try {
            await addDoc(collection(db, 'feedback'), {
                type: feedbackType,
                description: feedbackDescription,
                email: auth.currentUser.email,
                uid: auth.currentUser.uid,
                timestamp: serverTimestamp(), // Use serverTimestamp for accurate timing
            });
            setSnackbarMessage('Thank you for your feedback!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            handleCloseFeedback();
        } catch (error) {
            console.error('Error submitting feedback:', error);
            setSnackbarMessage('Failed to submit feedback. Please try again.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setFeedbackSubmitting(false);
        }
    };

    return (
        <>
            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={onClose}
                anchorOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                transformOrigin={{
                    vertical: 'top',
                    horizontal: 'right',
                }}
                PaperProps={{
                    sx: (theme) => ({
                        padding: theme.spacing(3),
                        maxWidth: 400,
                        margin: 'auto',
                        marginTop: theme.spacing(4),
                        boxShadow: theme.shadows[3],
                    }),
                }}
            >

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                    <Typography variant="h5" component="h2">
                        Settings
                    </Typography>
                    <Tooltip title="Settings">
                        <IconButton>
                            <SettingsIcon />
                        </IconButton>
                    </Tooltip>
                </Box>

                <FormControlLabel
                    control={
                        <Switch
                            checked={settings.autoGetDocs}
                            onChange={(e) => handleToggle('autoGetDocs', e.target.checked)}
                            color="primary"
                        />
                    }
                    label="Auto Get Docs"
                />

                <Box mt={2} mb={2}>
                    <Typography variant="subtitle1" gutterBottom>
                        Length of Docs
                    </Typography>
                    <Select
                        value={settings.docLength}
                        onChange={(e) => handleChange('docLength', e.target.value)}
                        fullWidth
                    >
                        {[...Array(10)].map((_, i) => {
                            const value = i + 1;
                            return (
                                <MenuItem key={value} value={value}>
                                    {value} Sentence{value !== 1 ? 's' : ''}
                                </MenuItem>
                            );
                        })}
                    </Select>
                </Box>

                <FormControlLabel
                    control={
                        <Switch
                            checked={settings.runLocally}
                            onChange={(e) => handleToggle('runLocally', e.target.checked)}
                            color="primary"
                        />
                    }
                    label="Run Locally"
                />

                <Divider sx={{ my: 2 }} />

                <Button
                    variant="outlined"
                    startIcon={<FeedbackIcon />}
                    onClick={handleOpenFeedback}
                    fullWidth
                    sx={{ mb: 2 }}
                >
                    Send Feedback
                </Button>

                <Button
                    variant="contained"
                    color="error"
                    startIcon={<LogoutIcon />}
                    onClick={handleLogout}
                    fullWidth
                >
                    Logout
                </Button>
            </Popover>

            {/* Feedback Modal */}
            <Dialog open={feedbackOpen} onClose={handleCloseFeedback} fullWidth maxWidth="sm">
                <DialogTitle>
                    Send Feedback
                    <IconButton
                        aria-label="close"
                        onClick={handleCloseFeedback}
                        sx={{
                            position: 'absolute',
                            right: 8,
                            top: 8,
                        }}
                    >
                        <CloseIcon />
                    </IconButton>
                </DialogTitle>
                <DialogContent>
                    <Stack spacing={2} mt={1}>
                        <FormControl component="fieldset">
                            <FormLabel component="legend">Feedback Type</FormLabel>
                            <RadioGroup
                                row
                                value={feedbackType}
                                onChange={(e) => setFeedbackType(e.target.value)}
                            >
                                <FormControlLabel value="bug" control={<Radio />} label="Bug" />
                                <FormControlLabel value="suggestion" control={<Radio />} label="Suggestion" />
                                <FormControlLabel value="other" control={<Radio />} label="Other" />
                            </RadioGroup>
                        </FormControl>
                        <TextField
                            label="Description"
                            multiline
                            rows={4}
                            variant="outlined"
                            value={feedbackDescription}
                            onChange={(e) => setFeedbackDescription(e.target.value)}
                            required
                            placeholder="Please describe your feedback in detail."
                        />

                    </Stack>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCloseFeedback} disabled={feedbackSubmitting}>
                        Cancel
                    </Button>
                    <Button
                        variant="contained"
                        onClick={handleSubmitFeedback}
                        disabled={feedbackSubmitting}
                        color="primary"
                    >
                        {feedbackSubmitting ? 'Submitting...' : 'Submit'}
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for Notifications */}
            <Snackbar
                open={snackbarOpen}
                autoHideDuration={3000}
                onClose={handleCloseSnackbar}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={handleCloseSnackbar}
                    severity={snackbarSeverity}
                    sx={{ width: '100%' }}
                    variant="filled"
                >
                    {snackbarMessage}
                </Alert>
            </Snackbar>
        </>
    )

}

export default SettingsPanel;
