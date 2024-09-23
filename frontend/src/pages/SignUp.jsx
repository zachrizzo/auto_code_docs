import React, { useState } from 'react';
import {
    TextField,
    Button,
    Container,
    Typography,
    Box,
    Grid,
    Paper,
    Alert,
    InputAdornment,
    IconButton,
} from '@mui/material';
import {
    Visibility,
    VisibilityOff,
    LockOutlined as LockOutlinedIcon,
    Login as LoginIcon,
    PersonAdd as PersonAddIcon,
} from '@mui/icons-material';
import { createUserWithEmailAndPassword } from 'firebase/auth'; // Import from Firebase Auth
import { db, auth } from '../firebase/firebase.js'; // Use your Firebase initialization file
import { useNavigate } from 'react-router-dom';
import { doc, setDoc } from 'firebase/firestore';

const SignUp = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({});
    const [showPassword, setShowPassword] = useState(false);
    const [showConfirmPassword, setShowConfirmPassword] = useState(false);
    const navigate = useNavigate();

    const validateInputs = () => {
        let tempErrors = {};
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        const passwordRegex =
            /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!firstName.trim()) tempErrors.firstName = 'First name is required.';
        if (!lastName.trim()) tempErrors.lastName = 'Last name is required.';
        if (!companyName.trim()) tempErrors.companyName = 'Company name is required.';
        if (!email) {
            tempErrors.email = 'Email is required.';
        } else if (!emailRegex.test(email)) {
            tempErrors.email = 'Enter a valid email address.';
        }
        if (!confirmEmail) {
            tempErrors.confirmEmail = 'Please confirm your email.';
        } else if (email !== confirmEmail) {
            tempErrors.confirmEmail = 'Emails do not match.';
        }
        if (!password) {
            tempErrors.password = 'Password is required.';
        } else if (password.length < 8) {
            tempErrors.password = 'Password must be at least 8 characters.';
        } else if (!passwordRegex.test(password)) {
            tempErrors.password =
                'Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.';
        }
        if (!confirmPassword) {
            tempErrors.confirmPassword = 'Please confirm your password.';
        } else if (password !== confirmPassword) {
            tempErrors.confirmPassword = 'Passwords do not match.';
        }

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSignUp = async () => {
        if (validateInputs()) {
            try {
                // Sign up user using Firebase Authentication
                const userCredential = await createUserWithEmailAndPassword(auth, email, password);
                const user = userCredential.user;

                // Store additional user info in Firestore
                await setDoc(doc(db, 'users', user.uid), {
                    userId: user.uid,
                    firstName,
                    lastName,
                    companyName,
                    email,
                    createdAt: new Date(),
                });

                console.log('User created with UID:', user.uid);
                navigate('/'); // Redirect to the home page after successful sign-up
            } catch (error) {
                console.error('Error creating user:', error);
                setErrors((prevErrors) => ({
                    ...prevErrors,
                    general: error.message,
                }));
            }
        }
    };

    const handleRouteLogin = () => {
        navigate('/login');
    };

    const fillTestData = () => {
        setFirstName('Zach');
        setLastName('Rizzo');
        setCompanyName('ASCD');
        setEmail('Zachcilwa@gmail.com');
        setConfirmEmail('Zachcilwa@gmail.com');
        setPassword('Zach123456!');
        setConfirmPassword('Zach123456!');
    };

    const handleClickShowPassword = () => {
        setShowPassword((prev) => !prev);
    };

    const handleClickShowConfirmPassword = () => {
        setShowConfirmPassword((prev) => !prev);
    };

    return (
        <Container component="main" maxWidth="sm">
            <Paper
                elevation={6}
                sx={{
                    marginTop: 8,
                    padding: 4,
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    borderRadius: 2,
                }}
            >
                {/* Optional Logo */}
                <Box sx={{ mb: 2 }}>
                    <LockOutlinedIcon color="primary" sx={{ fontSize: 50 }} />
                </Box>

                <Typography component="h1" variant="h5" gutterBottom>
                    Create an Account
                </Typography>

                {errors.general && (
                    <Alert severity="error" sx={{ width: '100%', mb: 2 }}>
                        {errors.general}
                    </Alert>
                )}

                <Box component="form" noValidate sx={{ mt: 1 }}>
                    <Grid container spacing={2}>
                        {/* First Name */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                id="firstName"
                                label="First Name"
                                name="firstName"
                                autoComplete="given-name"
                                value={firstName}
                                onChange={(e) => setFirstName(e.target.value)}
                                error={!!errors.firstName}
                                helperText={errors.firstName}
                            />
                        </Grid>

                        {/* Last Name */}
                        <Grid item xs={12} sm={6}>
                            <TextField
                                required
                                fullWidth
                                id="lastName"
                                label="Last Name"
                                name="lastName"
                                autoComplete="family-name"
                                value={lastName}
                                onChange={(e) => setLastName(e.target.value)}
                                error={!!errors.lastName}
                                helperText={errors.lastName}
                            />
                        </Grid>

                        {/* Company Name */}
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                id="companyName"
                                label="Company Name"
                                name="companyName"
                                autoComplete="organization"
                                value={companyName}
                                onChange={(e) => setCompanyName(e.target.value)}
                                error={!!errors.companyName}
                                helperText={errors.companyName}
                            />
                        </Grid>

                        {/* Email Address */}
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                id="email"
                                label="Email Address"
                                name="email"
                                autoComplete="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                error={!!errors.email}
                                helperText={errors.email}
                            />
                        </Grid>

                        {/* Confirm Email */}
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                id="confirmEmail"
                                label="Confirm Email"
                                name="confirmEmail"
                                autoComplete="email"
                                value={confirmEmail}
                                onChange={(e) => setConfirmEmail(e.target.value)}
                                error={!!errors.confirmEmail}
                                helperText={errors.confirmEmail}
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
                                autoComplete="new-password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                error={!!errors.password}
                                helperText={errors.password}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label={showPassword ? 'Hide password' : 'Show password'}
                                                onClick={handleClickShowPassword}
                                                edge="end"
                                            >
                                                {showPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>

                        {/* Confirm Password */}
                        <Grid item xs={12}>
                            <TextField
                                required
                                fullWidth
                                name="confirmPassword"
                                label="Confirm Password"
                                type={showConfirmPassword ? 'text' : 'password'}
                                id="confirmPassword"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                error={!!errors.confirmPassword}
                                helperText={errors.confirmPassword}
                                InputProps={{
                                    endAdornment: (
                                        <InputAdornment position="end">
                                            <IconButton
                                                aria-label={
                                                    showConfirmPassword ? 'Hide password' : 'Show password'
                                                }
                                                onClick={handleClickShowConfirmPassword}
                                                edge="end"
                                            >
                                                {showConfirmPassword ? <VisibilityOff /> : <Visibility />}
                                            </IconButton>
                                        </InputAdornment>
                                    ),
                                }}
                            />
                        </Grid>
                    </Grid>

                    {/* Action Buttons */}
                    <Button
                        type="button"
                        fullWidth
                        variant="contained"
                        startIcon={<PersonAddIcon />}
                        sx={{ mt: 3, mb: 2 }}
                        onClick={handleSignUp}
                    >
                        Sign Up
                    </Button>

                    <Button
                        type="button"
                        fullWidth
                        variant="outlined"
                        startIcon={<LoginIcon />}
                        sx={{ mb: 2 }}
                        onClick={handleRouteLogin}
                    >
                        Already have an account? Login
                    </Button>

                    {/* Temporary button to auto-fill the form with test data */}
                    <Button
                        type="button"
                        fullWidth
                        variant="text"
                        color="secondary"
                        sx={{ mb: 2 }}
                        onClick={fillTestData}
                    >
                        Fill Test Data
                    </Button>
                </Box>
            </Paper>
        </Container>
    );
};

export default SignUp;
