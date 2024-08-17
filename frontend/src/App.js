import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Button, Container, TextField, Select, MenuItem, Typography, Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { GlobalStyles } from '@mui/system';
import Analyzer from './pages/Analyzer';
import { initializeParser } from './detector';
import Header from './components/layout/Header'; // Importing the new Header component


const lightThemeColors = {
    background: '#ffffff',
    primaryStart: '#8C67FE',
    primaryEnd: '#5E5CEB',
    secondaryMain: '#03dac6',
    textMain: '#000000',
    buttonText: '#ffffff',
};

const darkThemeColors = {
    background: '#0C1826',
    primaryStart: '#7C64F9',
    primaryEnd: '#5E5CEB',
    secondaryMain: '#03dac6',
    textMain: '#ffffff',
    inputBackground: '#1B2A3B',
    borderColor: '#253245',
    lightShadow: '#464971',
    menuBackground: '#1B2A3B',
    menuHighlightStart: '#7C64F9',
    menuHighlightEnd: '#03dac6',
};

const lightTheme = createTheme({
    components: {
        MuiButton: {
            styleOverrides: {
                root: { borderRadius: '50px' },
                containedPrimary: {
                    background: `linear-gradient(45deg, ${lightThemeColors.primaryStart} 30%, ${lightThemeColors.primaryEnd} 90%)`,
                    color: lightThemeColors.buttonText,
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    borderRadius: '20px',
                    '& .MuiOutlinedInput-root': { borderRadius: '20px' },
                },
            },
        },
        MuiSelect: {
            styleOverrides: {
                root: {
                    borderRadius: '20px',
                    '& .MuiOutlinedInput-root': { borderRadius: '20px' },
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: { borderRadius: '20px' },
                input: { borderRadius: '20px' },
                notchedOutline: { borderRadius: '20px' },
            },
        },
        MuiMenu: {
            styleOverrides: { paper: { borderRadius: '20px' } },
        },
    },
    palette: {
        mode: 'light',
        background: { default: lightThemeColors.background },
        primary: { main: lightThemeColors.primaryStart },
        secondary: { main: lightThemeColors.secondaryMain },
        text: { primary: lightThemeColors.textMain },
    },
});

const darkTheme = createTheme({
    components: {
        MuiButton: {
            styleOverrides: {
                root: {
                    borderRadius: '50px',
                    boxShadow: `0px 4px 10px ${darkThemeColors.lightShadow}`,
                },
                containedPrimary: {
                    background: `linear-gradient(45deg, ${darkThemeColors.primaryStart} 30%, ${darkThemeColors.primaryEnd} 90%)`,
                    color: darkThemeColors.textMain,
                    boxShadow: `0px 4px 10px ${darkThemeColors.lightShadow}`,
                },
            },
        },
        MuiTextField: {
            styleOverrides: {
                root: {
                    borderRadius: '20px',
                    boxShadow: `0px 4px 10px ${darkThemeColors.lightShadow}`,
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '20px',
                        boxShadow: `0px 4px 10px ${darkThemeColors.lightShadow}`,
                    },
                },
            },
        },
        MuiSelect: {
            styleOverrides: {
                root: {
                    borderRadius: '20px',
                    boxShadow: `0px 4px 10px ${darkThemeColors.lightShadow}`,
                    '& .MuiOutlinedInput-root': {
                        borderRadius: '20px',
                        boxShadow: `0px 4px 10px ${darkThemeColors.lightShadow}`,
                    },
                },
            },
        },
        MuiOutlinedInput: {
            styleOverrides: {
                root: {
                    borderRadius: '10px',
                    backgroundColor: darkThemeColors.inputBackground,
                    boxShadow: `0px 4px 10px ${darkThemeColors.lightShadow}`,
                    '&:hover .MuiOutlinedInput-notchedOutline': { borderColor: 'none' },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': { borderColor: 'none' },
                },
                input: {
                    borderRadius: '10px',
                    color: darkThemeColors.textMain,
                    paddingLeft: '10px'
                },
                notchedOutline: { border: 'none' },
            },
        },
        MuiMenu: {
            styleOverrides: {
                paper: {
                    borderRadius: '10px',
                    boxShadow: darkThemeColors.lightShadow,
                    backgroundColor: darkThemeColors.menuBackground,
                    color: darkThemeColors.textMain,
                },
                list: { gap: '20px' },
            },
        },
        MuiMenuItem: {
            styleOverrides: {
                root: {
                    margin: '12px',
                    borderRadius: '10px',
                    '&.Mui-selected': {
                        background: `linear-gradient(45deg, ${darkThemeColors.menuHighlightStart} 30%, ${darkThemeColors.menuHighlightEnd} 90%)`,
                        color: darkThemeColors.textMain,
                    },
                    '&.Mui-selected:hover': {
                        background: `linear-gradient(45deg, ${darkThemeColors.menuHighlightStart} 30%, ${darkThemeColors.menuHighlightEnd} 90%)`,
                        color: darkThemeColors.textMain,
                    },
                },
            },
        },
    },
    palette: {
        mode: 'dark',
        background: { default: darkThemeColors.background },
        primary: { main: darkThemeColors.primaryStart },
        secondary: { main: darkThemeColors.secondaryMain },
        text: { primary: darkThemeColors.textMain },
    },
});

function Home() {
    const navigate = useNavigate();

    const routeToAnalyzer = () => {
        navigate('/analyze');
    };

    return (
        <Container>
            <Typography variant="h2">Home</Typography>
            <Button variant="contained" color="primary" onClick={routeToAnalyzer}>
                Analyzer
            </Button>
        </Container>
    );
}



function App() {
    const [darkMode, setDarkMode] = useState(true);

    useEffect(() => {
        initializeParser();
    }, []);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    return (
        <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
            <CssBaseline />
            <GlobalStyles styles={{ body: { backgroundColor: darkMode ? darkThemeColors.background : lightThemeColors.background } }} />
            <Router>
                <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />
                <Container>
                    <Routes>
                        <Route path="/" element={<Home />} />
                        <Route path="/analyze" element={<Analyzer />} />
                    </Routes>
                </Container>
            </Router>
        </ThemeProvider>
    );
}

export default App;
