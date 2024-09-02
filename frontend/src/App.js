import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Button, Stack, Container, TextField, Select, MenuItem, Typography, Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { GlobalStyles } from '@mui/system';
import Analyzer from './pages/Analyzer';
import { initializeParser } from './utils/detector/detector';
import Header from './components/layout/Header';
import DatabaseManagementPage from './pages/database';
import SignUp from './pages/signUp';
import { getAuth, onAuthStateChanged } from 'firebase/auth'; // Import Firebase auth methods
import Login from './pages/login';

// Define your theme objects here...

function Home() {
    const navigate = useNavigate();

    const routeToAnalyzer = () => {
        navigate('/analyze');
    };
    const routeToDatabaseManagement = () => {
        navigate('/database');
    };

    return (
        <Container>
            <Typography variant="h2">Home</Typography>
            <Stack gap={2}>
                <Button variant="contained" color="primary" onClick={routeToAnalyzer}>
                    Analyzer
                </Button>
                <Button variant="contained" color="primary" onClick={routeToDatabaseManagement}>
                    Database Management
                </Button>
            </Stack>
        </Container>
    );
}

function App() {
    const [darkMode, setDarkMode] = useState(true);
    const [user, setUser] = useState(null); // State to track the authenticated user

    useEffect(() => {
        initializeParser();

        // Initialize Firebase auth
        const auth = getAuth();

        // Set up Firebase auth state listener
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser); // Update user state based on auth state
        });

        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, []);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    return (
        <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
            <CssBaseline />
            <GlobalStyles styles={{ body: { backgroundColor: darkMode ? darkThemeColors.background : lightThemeColors.background } }} />
            <Router>
                {user && <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}
                <Container>
                    <Routes>
                        <Route path="/" element={user ? <Home /> : <Login />} />
                        <Route path="/analyze" element={<Analyzer />} />
                        <Route path="/database" element={<DatabaseManagementPage />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} />
                    </Routes>
                </Container>
            </Router>
        </ThemeProvider>
    );
}

export default App;
