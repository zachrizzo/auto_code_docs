import React, { useState } from 'react';
import {
    TextField,
    Button,
    Container,
    Typography,
    Box,
    Alert,
    CircularProgress,
    Grid,
    Paper,
    InputAdornment,
    IconButton,
    Snackbar,
    Link,
} from '@mui/material';
import {
    LockOutlined as LockOutlinedIcon,
    Visibility,
    VisibilityOff,
} from '@mui/icons-material';
import { signInWithEmailAndPassword, setPersistence, browserLocalPersistence } from 'firebase/auth'; // Import setPersistence
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import { auth } from '../firebase/firebase'; // Import auth from your firebase config

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [showPassword, setShowPassword] = useState(false);
    const [snackbarOpen, setSnackbarOpen] = useState(false);
    const [snackbarMessage, setSnackbarMessage] = useState('');
    const [snackbarSeverity, setSnackbarSeverity] = useState('success');

    const navigate = useNavigate();

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        setIsLoading(true);

        try {
            // Set persistence mode (you can change it to session or none as per your needs)
            await setPersistence(auth, browserLocalPersistence); // Ensures the auth state persists locally

            // Sign in user using Firebase Authentication
            await signInWithEmailAndPassword(auth, email, password);

            setSnackbarMessage('Login successful!');
            setSnackbarSeverity('success');
            setSnackbarOpen(true);

            // Redirect after a short delay to allow the snackbar to display
            setTimeout(() => {
                navigate('/'); // Redirect to home after successful login
            }, 1500);
        } catch (error) {
            console.error('Error signing in:', error);
            switch (error.code) {
                case 'auth/user-not-found':
                case 'auth/wrong-password':
                    setError('Invalid email or password.');
                    break;
                case 'auth/too-many-requests':
                    setError('Too many failed login attempts. Please try again later.');
                    break;
                case 'auth/network-request-failed':
                    setError('Network error. Please check your internet connection.');
                    break;
                default:
                    setError('An unexpected error occurred. Please try again.');
            }
            setSnackbarMessage('Login failed. Please check your credentials.');
            setSnackbarSeverity('error');
            setSnackbarOpen(true);
        } finally {
            setIsLoading(false);
        }
    };

    const handleClickShowPassword = () => {
        setShowPassword((prev) => !prev);
    };

    const handleCloseSnackbar = (event, reason) => {
        if (reason === 'clickaway') return;
        setSnackbarOpen(false);
    };

    return (
        <Box
            sx={{
                position: 'relative',
                minHeight: '100vh',
                overflow: 'hidden',
            }}
        >
            {/* Login Form */}
            <Container
                component="main"
                maxWidth="xs"
                sx={{
                    position: 'relative',
                    zIndex: 2,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    height: '100vh',
                    px: 2,
                }}
            >
                <Paper
                    elevation={6}
                    sx={{
                        padding: 4,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        borderRadius: 2,
                        backgroundColor: 'rgba(255, 255, 255, 0.15)',
                        backdropFilter: 'blur(10px)',
                        boxShadow: '0 8px 32px 0 rgba(31, 38, 135, 0.37)',
                        border: '1px solid rgba(255, 255, 255, 0.18)',
                    }}
                >
                    {/* Optional Logo */}
                    <Box sx={{ mb: 2 }}>
                        <LockOutlinedIcon color="primary" sx={{ fontSize: 50 }} />
                    </Box>

                    <Typography component="h1" variant="h5" gutterBottom sx={{ color: '#ffffff' }}>
                        Log In
                    </Typography>

                    {/* Error Alert */}
                    {error && (
                        <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                            {error}
                        </Alert>
                    )}

                    {/* Snackbar for Feedback */}
                    <Snackbar
                        open={snackbarOpen}
                        autoHideDuration={3000}
                        onClose={handleCloseSnackbar}
                        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
                    >
                        <Alert
                            onClose={handleCloseSnackbar}
                            severity={snackbarSeverity}
                            sx={{ width: '100%' }}
                        >
                            {snackbarMessage}
                        </Alert>
                    </Snackbar>

                    <Box component="form" onSubmit={handleLogin} noValidate sx={{ mt: 1 }}>
                        <Grid container spacing={2}>
                            {/* Email Address */}
                            <Grid item xs={12}>
                                <TextField
                                    required
                                    fullWidth
                                    id="email"
                                    label="Email Address"
                                    name="email"
                                    autoComplete="email"
                                    autoFocus
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    error={!!error}
                                    helperText={
                                        error && (error.toLowerCase().includes('email') ? error : '')
                                    }
                                    InputLabelProps={{
                                        style: { color: '#ffffff' },
                                    }}
                                    InputProps={{
                                        style: { color: '#ffffff' },
                                    }}
                                />
                            </Grid>

                            {/* Password */}
                            <Grid item xs={12}>
                                <TextField
                                    required
                                    fullWidth
                                    name="password"
                                    label="Password"
                                    type={showPassword ? 'text' : 'password'}
                                    id="password"
                                    autoComplete="current-password"
                                    value={password}
                                    onChange={(e) => setPassword(e.target.value)}
                                    error={!!error}
                                    helperText={
                                        error && (error.toLowerCase().includes('password') ? error : '')
                                    }
                                    InputLabelProps={{
                                        style: { color: '#ffffff' },
                                    }}
                                    InputProps={{
                                        style: { color: '#ffffff' },
                                        endAdornment: (
                                            <InputAdornment position="end">
                                                <IconButton
                                                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                    onClick={handleClickShowPassword}
                                                    edge="end"
                                                    sx={{ color: '#ffffff' }}
                                                >
                                                    {showPassword ? <VisibilityOff /> : <Visibility />}
                                                </IconButton>
                                            </InputAdornment>
                                        ),
                                    }}
                                />
                            </Grid>
                        </Grid>

                        {/* Log In Button */}
                        <Button
                            type="submit"
                            fullWidth
                            variant="contained"
                            color="primary"
                            sx={{
                                mt: 3,
                                mb: 2,
                                height: 45,
                                backgroundColor: 'rgba(255, 255, 255, 0.25)',
                                color: '#ffffff',
                                '&:hover': {
                                    backgroundColor: 'rgba(255, 255, 255, 0.35)',
                                },
                            }}
                            disabled={isLoading}
                            startIcon={isLoading ? <CircularProgress size={20} sx={{ color: '#ffffff' }} /> : null}
                        >
                            {isLoading ? 'Logging In...' : 'Log In'}
                        </Button>

                        {/* Sign Up Link */}
                        <Grid container justifyContent="flex-end">
                            <Grid item>
                                <Link
                                    component={RouterLink}
                                    to="/signup"
                                    variant="body2"
                                    underline="hover"
                                    sx={{ color: '#ffffff' }}
                                >
                                    Don't have an account? Sign Up
                                </Link>
                            </Grid>
                        </Grid>
                    </Box>
                </Paper>
            </Container>
        </Box>
    );
};

export default Login;
