// src/pages/Home.js
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button, Grid, Card, CardContent, Typography, Box } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import StorageIcon from '@mui/icons-material/Storage';
import { styled } from '@mui/system';
import InstallModal from '../components/layout/modals/updates/InstallModal.jsx';

const IconWrapper = styled(Box)(({ theme }) => ({
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: theme.spacing(2),
}));

function Home() {
    const navigate = useNavigate();
    const [modalOpen, setModalOpen] = useState(false);
    const [messages, setMessages] = useState([]);
    const [isCompleted, setIsCompleted] = useState(false);

    const routeToAnalyzer = () => {
        navigate('/analyze');
    };

    const routeToDatabaseManagement = () => {
        navigate('/database');
    };

    const downLoadMissingModels = async () => {
        setModalOpen(true);
        setMessages([]);
        setIsCompleted(false);

        try {
            const response = await fetch('/install-models', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ /* include any required fields here */ }),
            });

            if (!response.body) {
                throw new Error('ReadableStream not supported in this browser.');
            }

            const reader = response.body.getReader();
            const decoder = new TextDecoder('utf-8');
            let done = false;

            while (!done) {
                const { value, done: doneReading } = await reader.read();
                done = doneReading;
                const chunkValue = decoder.decode(value, { stream: true });
                const lines = chunkValue.split('\n\n').filter(line => line.startsWith('data: '));
                lines.forEach(line => {
                    const message = line.replace('data: ', '').trim();
                    setMessages(prev => [...prev, message]);
                    if (message.includes('completed')) {
                        setIsCompleted(true);
                    }
                });
            }
        } catch (error) {
            setMessages(prev => [...prev, `Error: ${error.message}`]);
            setIsCompleted(true);
        }
    };

    useEffect(() => {
        // Install missing AI models on component mount
        downLoadMissingModels();
    }, []);

    return (
        <>
            <InstallModal
                open={modalOpen}
                onClose={() => setModalOpen(false)}
                messages={messages}
                isCompleted={isCompleted}
            />
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
