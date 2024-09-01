import React, { useState, useEffect, useCallback } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Button, Stack, Container, TextField, Select, MenuItem, Typography, Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { GlobalStyles } from '@mui/system';
import Analyzer from './pages/Analyzer';
import { initializeParser } from './utils/detector/detector';
import Header from './components/layout/Header'; // Importing the new Header component
import DatabaseManagementPage from './pages/database';


const lightThemeColors = {
    background: '#ffffff',
    accentColor: '#ECECEC',
    primaryStart: '#8C67FE',
    primaryEnd: '#5E5CEB',
    secondaryMain: '#03dac6',
    textMain: '#000000',
    buttonText: '#ffffff',
};

const darkThemeColors = {
    background: '#0C1826',
    accentColor: '#1B2A3B',
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
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: '20px',
                    boxShadow: '0px 4px 10px rgba(0, 0, 0, 0.1)',
                },
            },
        },
        MuiCardContent: {
            styleOverrides: {
                root: {
                    padding: '16px',
                },
            },
        },
        MuiCardActions: {
            styleOverrides: {
                root: {
                    padding: '8px 16px 16px',
                },
            },
        },
        MuiModal: {
            styleOverrides: {
                root: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(3px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.1)',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {

                    backgroundColor: lightThemeColors.background,
                },
            },
        },


    },
    palette: {
        mode: 'light',
        background: { default: lightThemeColors.background },
        accentColor: { main: lightThemeColors.accentColor },
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
        MuiCard: {
            styleOverrides: {
                root: {
                    borderRadius: '20px',
                    boxShadow: `0px 4px 10px ${darkThemeColors.lightShadow}`,
                    backgroundColor: darkThemeColors.inputBackground,
                },
            },
        },
        MuiCardContent: {
            styleOverrides: {
                root: {
                    padding: '16px',
                },
            },
        },
        MuiCardActions: {
            styleOverrides: {
                root: {
                    padding: '8px 16px 16px',
                },
            },
        },

        MuiModal: {
            styleOverrides: {
                root: {
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backdropFilter: 'blur(3px)',
                    backgroundColor: 'rgba(0, 0, 0, 0.5)',
                },
            },
        },
        MuiPaper: {
            styleOverrides: {
                root: {
                    backgroundColor: darkThemeColors.inputBackground,
                },
            },
        },
    },

    palette: {
        mode: 'dark',
        background: { main: darkThemeColors.background, },
        accentColor: { main: darkThemeColors.accentColor },
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
    const routeToDatabaseManagement = () => {
        navigate('/database')
    }

    return (
        <Container>
            <Typography variant="h2">Home</Typography>
            <Stack gap={2} >
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
                        <Route path="/database" element={<DatabaseManagementPage />} />
                    </Routes>
                </Container>
            </Router>
        </ThemeProvider>
    );
}

export default App;
