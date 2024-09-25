// src/App.jsx
import React, { useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation } from 'react-router-dom';
import {
    Button,
    Stack,
    Container,
    TextField,
    Select,
    MenuItem,
    Typography,
    Box,
    ThemeProvider,
    createTheme,
    CssBaseline
} from '@mui/material';
import { GlobalStyles } from '@mui/system';
import Analyzer from './pages/Analyzer.jsx';
import Header from './components/layout/header/Header.jsx';
// import DatabaseManagementPage from './pages/Database.jsx';
import SignUp from './pages/SignUp.jsx';
import { onAuthStateChanged } from 'firebase/auth'; // Import Firebase auth methods
import Login from './pages/LoginPage.jsx';
import { auth } from './firebase/firebase.js';
import Home from './pages/Home.jsx';
import DatabaseManagementPage from './pages/Database.jsx';


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
        background: {
            main: darkThemeColors.background,
            light: darkThemeColors.accentColor,
        },
        accentColor: { main: darkThemeColors.accentColor },
        primary: { main: darkThemeColors.primaryStart },
        secondary: { main: darkThemeColors.secondaryMain },
        text: { primary: darkThemeColors.textMain },
    },
});

function App() {
    const [darkMode, setDarkMode] = useState(true);
    const [user, setUser] = useState(null); // State to track the authenticated user

    useEffect(() => {
        const initParser = async () => {
            try {
                const result = await window.electronAPI.initializeParser();
                if (result.success) {
                    console.log('Parser initialized successfully');
                } else {
                    console.error('Failed to initialize parser:', result.error);
                }
            } catch (error) {
                console.error('Error calling initializeParser:', error);
            }
        };

        // Set up Firebase auth state listener
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser);
        });

        initParser();

        return () => {
            unsubscribe();
        };
    }, []);

    console.log(auth.currentUser);

    const toggleDarkMode = () => {
        setDarkMode(!darkMode);
    };

    return (
        <ThemeProvider theme={darkMode ? darkTheme : lightTheme}>
            <CssBaseline />
            <GlobalStyles
                styles={{
                    body: {
                        backgroundColor: darkMode ? darkThemeColors.background : lightThemeColors.background,
                    },
                }}
            />
            <HashRouter>
                {/* Optional: Show Header if user is logged in */}
                {user && <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />}
                <Routes>
                    {/* If user is logged in, show Home; otherwise, show Login */}
                    <Route path="/" element={auth?.currentUser ? <Home /> : <Login />} />
                    {/* Analyzer Route with Full-Screen Layout */}
                    <Route
                        path="analyze"
                        element={
                            <Box sx={{ width: '100vw', height: '93vh', p: 0 }}>
                                <Analyzer />
                            </Box>
                        }
                    />
                    {/* Additional routes for other components */}
                    <Route path="login" element={<Login />} />
                    <Route path="database" element={<DatabaseManagementPage />} />
                    <Route path="signup" element={<SignUp />} />
                </Routes>
            </HashRouter>
        </ThemeProvider>
    );
}

export default App;
