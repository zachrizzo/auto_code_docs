// src/components/settings/SettingsPanel.jsx

import React from 'react';
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
import SettingsSuggestIcon from '@mui/icons-material/SettingsSuggest';
import LogoutIcon from '@mui/icons-material/Logout';
import FeedbackIcon from '@mui/icons-material/Feedback';
import { getAuth, signOut } from 'firebase/auth';
import { getFirestore, collection, addDoc } from 'firebase/firestore';
import PropTypes from 'prop-types';

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
    const [snackbarOpen, setSnackbarOpen] = React.useState(false);
    const [snackbarMessage, setSnackbarMessage] = React.useState('');
    const [snackbarSeverity, setSnackbarSeverity] = React.useState('success');

    // State for Feedback Modal
    const [feedbackOpen, setFeedbackOpen] = React.useState(false);
    const [feedbackType, setFeedbackType] = React.useState('bug');
    const [feedbackDescription, setFeedbackDescription] = React.useState('');
    const [feedbackEmail, setFeedbackEmail] = React.useState('');
    const [feedbackSubmitting, setFeedbackSubmitting] = React.useState(false);

    const handleLogout = async () => {
        try {
            await signOut(auth);
            // Show success notification
            setSnackbarMessage('Logged out successfully!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);
            onClose(); // Close the settings panel after logout
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
        setFeedbackEmail('');
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
                email: feedbackEmail || null,
                timestamp: new Date(),
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
                    sx: {
                        p: 3,
                        width: { xs: 280, sm: 320 },
                        borderRadius: 2,
                        boxShadow: 24,
                    },
                }}
            >
                <Stack spacing={3}>
                    {/* Header */}
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <Typography variant="h6" component="div">
                            Settings
                        </Typography>
                        <Tooltip title="Close Settings">
                            <IconButton onClick={onClose} size="small">
                                <SettingsSuggestIcon />
                            </IconButton>
                        </Tooltip>
                    </Box>

                    {/* Auto Get Docs Switch */}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.autoGetDocs}
                                onChange={() => handleToggle('autoGetDocs')}
                                color="primary"
                                inputProps={{ 'aria-label': 'Auto Get Docs' }}
                            />
                        }
                        label="Auto Get Docs"
                    />

                    {/* Length of Docs Selector */}
                    <Box>
                        <Typography variant="subtitle1" gutterBottom>
                            Length of Docs
                        </Typography>
                        <Select
                            value={settings.docLength}
                            onChange={(e) => handleChange('docLength', e.target.value)}
                            fullWidth
                            variant="outlined"
                            displayEmpty
                            inputProps={{ 'aria-label': 'Length of Docs' }}
                        >
                            {[...Array(10).keys()].map((num) => (
                                <MenuItem key={num + 1} value={num + 1}>
                                    {num + 1} Sentence{num + 1 > 1 ? 's' : ''}
                                </MenuItem>
                            ))}
                        </Select>
                    </Box>

                    {/* Run Locally Switch */}
                    <FormControlLabel
                        control={
                            <Switch
                                checked={settings.runLocally}
                                onChange={() => handleToggle('runLocally')}
                                color="primary"
                                inputProps={{ 'aria-label': 'Run Locally' }}
                            />
                        }
                        label="Run Locally"
                    />

                    {/* Feedback Button */}
                    <Button
                        variant="outlined"
                        startIcon={<FeedbackIcon />}
                        onClick={handleOpenFeedback}
                        sx={{
                            textTransform: 'none',
                            color: 'text.primary',
                            borderColor: 'text.primary',
                            '&:hover': {
                                backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                borderColor: 'text.primary',
                            },
                        }}
                    >
                        Send Feedback
                    </Button>

                    {/* Divider */}
                    <Divider />

                    {/* Action Buttons */}
                    <Stack direction="row" spacing={2} justifyContent="flex-end">
                        <Button
                            variant="outlined"
                            onClick={onClose}
                            startIcon={<SettingsSuggestIcon />}
                            sx={{
                                textTransform: 'none',
                                color: 'text.primary',
                                borderColor: 'text.primary',
                                '&:hover': {
                                    backgroundColor: 'rgba(0, 0, 0, 0.04)',
                                    borderColor: 'text.primary',
                                },
                            }}
                        >
                            Close
                        </Button>
                        <Button
                            variant="contained"
                            color="error"
                            onClick={handleLogout}
                            startIcon={<LogoutIcon />}
                            sx={{
                                textTransform: 'none',
                                '&:hover': {
                                    backgroundColor: '#d32f2f',
                                },
                            }}
                        >
                            Logout
                        </Button>
                    </Stack>
                </Stack>
            </Popover>

            {/* Feedback Modal */}
            <Dialog open={feedbackOpen} onClose={handleCloseFeedback} fullWidth maxWidth="sm">
                <DialogTitle>Send Feedback</DialogTitle>
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
                        />
                        <TextField
                            label="Your Email (Optional)"
                            type="email"
                            variant="outlined"
                            value={feedbackEmail}
                            onChange={(e) => setFeedbackEmail(e.target.value)}
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
    );

}

export default SettingsPanel;
