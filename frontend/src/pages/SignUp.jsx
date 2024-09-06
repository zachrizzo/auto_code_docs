import React, { useState } from 'react';
import { TextField, Button, Container, Typography, Box } from '@mui/material';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { collection, addDoc, doc, setDoc } from 'firebase/firestore';
import { db, auth, functions } from '../firebase/firebase.js';
import { useNavigate } from 'react-router-dom';
import { httpsCallable } from "firebase/functions";


const SignUp = () => {
    const [firstName, setFirstName] = useState('');
    const [lastName, setLastName] = useState('');
    const [companyName, setCompanyName] = useState('');
    const [email, setEmail] = useState('');
    const [confirmEmail, setConfirmEmail] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [errors, setErrors] = useState({});
    const navigate = useNavigate();

    const validateInputs = () => {
        let tempErrors = {};
        const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

        if (!firstName) tempErrors.firstName = "First name is required.";
        if (!lastName) tempErrors.lastName = "Last name is required.";
        if (!companyName) tempErrors.companyName = "Company name is required.";
        if (!email) tempErrors.email = "Email is required.";
        if (email !== confirmEmail) tempErrors.confirmEmail = "Emails do not match.";
        if (!password) {
            tempErrors.password = "Password is required.";
        } else if (password.length < 8) {
            tempErrors.password = "Password must be at least 8 characters.";
        } else if (!passwordRegex.test(password)) {
            tempErrors.password = "Password must contain at least one uppercase letter, one lowercase letter, one number, and one special character.";
        }
        if (password !== confirmPassword) tempErrors.confirmPassword = "Passwords do not match.";

        setErrors(tempErrors);
        return Object.keys(tempErrors).length === 0;
    };

    const handleSignUp = async () => {
        if (validateInputs()) {
            try {
                const createUser = httpsCallable(functions, 'auth-createUser');

                const result = await createUser({
                    email,
                    password,
                    firstName,
                    lastName,
                    companyName,
                });



                console.log('User created with UID:', result.data.uid);
                navigate('/'); // Redirect to the home page
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
        setFirstName('zach');
        setLastName('rizzo');
        setCompanyName('ascd');
        setEmail('Zachcilwa@gmail.com');
        setConfirmEmail('Zachcilwa@gmail.com');
        setPassword('Zach123456!');
        setConfirmPassword('Zach123456!');
    };

    return (
        <Container maxWidth="xs">
            <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">
                    Sign Up
                </Typography>
                <Box sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="firstName"
                        label="First Name"
                        name="firstName"
                        autoComplete="given-name"
                        autoFocus
                        value={firstName}
                        onChange={(e) => setFirstName(e.target.value)}
                        error={!!errors.firstName}
                        helperText={errors.firstName}
                    />
                    <TextField
                        margin="normal"
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
                    <TextField
                        margin="normal"
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
                    <TextField
                        margin="normal"
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
                    <TextField
                        margin="normal"
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
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="new-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        error={!!errors.password}
                        helperText={errors.password}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="confirmPassword"
                        label="Confirm Password"
                        type="password"
                        id="confirmPassword"
                        value={confirmPassword}
                        onChange={(e) => setConfirmPassword(e.target.value)}
                        error={!!errors.confirmPassword}
                        helperText={errors.confirmPassword}
                    />
                    {errors.general && (
                        <Typography color="error" variant="body2" sx={{ mt: 1 }}>
                            {errors.general}
                        </Typography>
                    )}
                    <Button
                        type="button"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        onClick={handleSignUp}
                    >
                        Sign Up
                    </Button>
                    <Button
                        type="button"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 1, mb: 2 }}
                        onClick={handleRouteLogin}
                    >
                        Login
                    </Button>
                    {/* Temporary button to auto-fill the form with test data */}
                    <Button
                        type="button"
                        fullWidth
                        variant="contained"
                        color="secondary"
                        sx={{ mt: 1, mb: 2 }}
                        onClick={fillTestData}
                    >
                        Fill Test Data
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default SignUp;
