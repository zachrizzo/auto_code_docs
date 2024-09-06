import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, useNavigate } from 'react-router-dom';
import { Button, Stack, Container, TextField, Select, MenuItem, Typography, Box, ThemeProvider, createTheme, CssBaseline } from '@mui/material';
import { GlobalStyles } from '@mui/system';
// import Analyzer from './pages/Analyzer';
// import { initializeParser } from '../utils/detector/detector';
// import Header from './components/layout/Header';
// import DatabaseManagementPage from './pages/database';
// import SignUp from '../../pages/signUp';
import { onAuthStateChanged } from 'firebase/auth'; // Import Firebase auth methods
import Login from './pages/LoginPage';
import { auth } from './firebase/firebase'


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
    // const webviewRef = useRef(null); // Ref to handle the webview

    useEffect(() => {
        initializeParser(); // Initialize parser or any other setups

        // Set up Firebase auth state listener
        const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
            setUser(currentUser); // Update user state based on auth state
        });

        // // Setup webview event listeners
        // if (webviewRef.current) {
        //     const webview = webviewRef.current;

        //     webview.addEventListener('dom-ready', () => {
        //         console.log('Webview is ready');
        //         webview.executeJavaScript(`console.log('Hello from webview!')`);
        //     });

        //     webview.addEventListener('ipc-message', (event) => {
        //         console.log('Received IPC message from webview:', event.channel);
        //     });
        // }

        // Cleanup subscription on unmount
        return () => {
            unsubscribe();
            if (webviewRef.current) {
                webviewRef.current.removeEventListener('ipc-message', () => { });
            }
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
            <Router>
                {/* Optional: Show Header if user is logged in */}
                {/* {user && <Header darkMode={darkMode} toggleDarkMode={toggleDarkMode} />} */}
                <Container>
                    <Routes>
                        {/* If user is logged in, show Home; otherwise, show Login */}
                        <Route path="/" element={<Home />} />
                        {/* Additional routes for other components */}
                        {/* <Route path="/analyze" element={<Analyzer />} />
                        <Route path="/database" element={<DatabaseManagementPage />} />
                        <Route path="/login" element={<Login />} />
                        <Route path="/signup" element={<SignUp />} /> */}
                    </Routes>

                    {/* Webview Element */}
                    {/* <webview
                        ref={webviewRef}
                        src="https://example.com" // URL to load in the webview
                        style={{ width: '100%', height: '600px', marginTop: '20px' }}
                        nodeintegration="false"
                        preload="./webview-preload.js" // Ensure this is correctly set up
                    /> */}
                </Container>
            </Router>
        </ThemeProvider>
    );
}

export default App;


// import React from 'react'

// function App() {

//     return (
//         <div>hi</div>
//     );
// }

// export default App

