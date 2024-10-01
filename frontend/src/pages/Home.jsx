// src/pages/Home.js

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Grid, Card, CardContent, Typography, Box, Snackbar, Alert } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import { styled } from '@mui/system';
import InstallModal from '../components/layout/modals/updates/InstallModal.jsx';
import ConfirmationModal from '../components/layout/modals/updates/ConfirmationModal.jsx';
import { downLoadMissingAiModels, checkMissingAiModels } from '../api/CodeDocumentation.js';

const IconWrapper = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
}));

function Home() {
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [confirmationOpen, setConfirmationOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isCompleted, setIsCompleted] = useState(false);
    const [warningOpen, setWarningOpen] = useState(false);
    const [requiredModels] = useState(['llama3:8b']); // Define required models

    const routeToAnalyzer = () => {
        navigate('/analyze');
    };

    const routeToDatabaseManagement = () => {
        navigate('/database');
    };

    const handleInstallProgress = (message) => {
        setMessages((prevMessages) => [...prevMessages, message]);
        if (message.includes('Installation process completed.')) {
            setIsCompleted(true);
        }
    };

    const initiateModelInstallation = async (missingModels) => {
        setModalOpen(true);
        setMessages([]);
        setIsCompleted(false);

        try {
            await downLoadMissingAiModels(missingModels, handleInstallProgress);
        } catch (error) {
            setMessages((prev) => [...prev, `Error: ${error.message}`]);
            setIsCompleted(true);
        }
    };

    const checkAndInstallModels = async () => {
        try {
            const response = await checkMissingAiModels(requiredModels);
            const { missing_models } = response;
            if (missing_models.length > 0) {
                setConfirmationOpen(true);
            }
        } catch (error) {
            console.error("Error checking missing AI models:", error);
        }
    };

    const handleConfirmation = () => {
        setConfirmationOpen(false);
        initiateModelInstallation(requiredModels);
    };

    const handleCancelInstallation = () => {
        setConfirmationOpen(false);
        setWarningOpen(true);
    };

    useEffect(() => {
        // First, check for missing AI models
        checkAndInstallModels();
    }, []);

    return (
        <>
            <InstallModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                messages={messages}
                isCompleted={isCompleted}
            />
            <ConfirmationModal
                open={confirmationOpen}
                onConfirm={handleConfirmation}
                onCancel={handleCancelInstallation}
            />
            <Snackbar
                open={warningOpen}
                autoHideDuration={6000}
                onClose={() => setWarningOpen(false)}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert onClose={() => setWarningOpen(false)} severity="warning">
                    Some features may not work properly without the required AI models.
                </Alert>
            </Snackbar>
            <Box sx={{ py: 8 }}>
                <Typography variant="h3" align="center" gutterBottom>
                    Welcome to Fractal X (Beta)
                </Typography>
                <Typography variant="h6" align="center" color="textSecondary" paragraph>
                    Analyze your codebase, ensure code quality, and manage your databases efficiently.
                </Typography>
                <Grid container spacing={4} justifyContent="center" sx={{ mt: 4 }}>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.3s',
                                '&:hover': {
                                    transform: 'translateY(-10px)',
                                },
                            }}
                            elevation={3}
                        >
                            <CardContent sx={{ flexGrow: 1 }}>
                                <IconWrapper>
                                    <CodeIcon color="primary" sx={{ fontSize: 60 }} />
                                </IconWrapper>
                                <Typography variant="h5" component="div" gutterBottom align="center">
                                    Code Analyzer
                                </Typography>
                                <Typography variant="body2" color="textSecondary" align="center">
                                    Graph your codebase and analyze code quality to maintain high standards and
                                    optimize performance.
                                </Typography>
                            </CardContent>
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={routeToAnalyzer}
                                    sx={{ borderRadius: '20px', px: 4 }}
                                >
                                    Get Started
                                </Button>
                            </Box>
                        </Card>
                    </Grid>
                    <Grid item xs={12} sm={6} md={4}>
                        <Card
                            sx={{
                                height: '100%',
                                display: 'flex',
                                flexDirection: 'column',
                                transition: 'transform 0.3s',
                                '&:hover': {
                                    transform: 'translateY(-10px)',
                                },
                            }}
                            elevation={3}
                        >
                            <CardContent sx={{ flexGrow: 1 }}>
                                <IconWrapper>
                                    <StorageIcon color="primary" sx={{ fontSize: 60 }} />
                                </IconWrapper>
                                <Typography variant="h5" component="div" gutterBottom align="center">
                                    Database Management
                                </Typography>
                                <Typography variant="body2" color="textSecondary" align="center">
                                    Efficiently manage your databases with intuitive tools and comprehensive analysis
                                    features.
                                </Typography>
                            </CardContent>
                            <Box sx={{ p: 2, textAlign: 'center' }}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    onClick={routeToDatabaseManagement}
                                    sx={{ borderRadius: '20px', px: 4 }}
                                >
                                    Get Started
                                </Button>
                            </Box>
                        </Card>
                    </Grid>
                </Grid>
            </Box>
        </>
    );
}

export default Home;
