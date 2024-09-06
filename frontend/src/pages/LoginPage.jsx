import React, { useState } from 'react';
import { TextField, Button, Container, Typography, Box } from '@mui/material';
import { auth, db } from '../firebase/firebase.js';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { useNavigate } from 'react-router-dom';  // Assuming you're using react-router for navigation
import { addDoc, collection } from 'firebase/firestore';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate(); // To navigate to the signup page

    const handleLogin = async () => {
        try {
            await signInWithEmailAndPassword(auth, email, password);
            console.log('Login successful');
        } catch (error) {
            console.error('Error logging in:', error);
            if (error.code === 'auth/network-request-failed') {
                alert('Network error. Please check your internet connection.');
            } else {
                alert('Login failed. Please check your credentials and try again.');
            }
        }
    };

    const handleSignUpRedirect = () => {
        navigate('/signUp')
    }

    return (
        <Container maxWidth="xs">
            <Box sx={{ mt: 8, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <Typography component="h1" variant="h5">
                    Log In
                </Typography>
                <Box sx={{ mt: 1 }}>
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        id="email"
                        label="Email Address"
                        name="email"
                        autoComplete="email"
                        autoFocus
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                    />
                    <TextField
                        margin="normal"
                        required
                        fullWidth
                        name="password"
                        label="Password"
                        type="password"
                        id="password"
                        autoComplete="current-password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                    />
                    <Button
                        type="button"
                        fullWidth
                        variant="contained"
                        sx={{ mt: 3, mb: 2 }}
                        onClick={handleLogin}
                    >
                        Log In
                    </Button>
                    <Button
                        type="button"
                        fullWidth
                        variant="outlined"
                        sx={{ mt: 1 }}
                        onClick={handleSignUpRedirect}
                    >
                        Sign Up
                    </Button>
                </Box>
            </Box>
        </Container>
    );
};

export default Login;
