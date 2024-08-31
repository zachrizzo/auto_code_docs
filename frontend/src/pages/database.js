import React, { useState, useEffect, useCallback } from 'react';
import {
    TextField,
    Button,
    Container,
    Typography,
    Box,
    Modal,
    Card,
    CardContent,
    CardActions,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
} from '@mui/material';
import Store from 'electron-store';
import { useTheme } from '@mui/material/styles';
import FirebaseConfigModal from '../components/database/FirebaseConfigModal';

// Initialize the store with a project name and defaults
const store = new Store({
    name: 'FirebaseConfigManager',  // Replace 'YourProjectName' with your actual project name
    defaults: {
        firebaseConfigs: [],
    },
});



const DatabaseManagementPage = () => {
    const [firebaseConfigs, setFirebaseConfigs] = useState([]);
    const [selectedConfig, setSelectedConfig] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const theme = useTheme();

    useEffect(() => {
        const loadConfigs = () => {
            const savedConfigs = store.get('firebaseConfigs');
            console.log('Loaded configs from store:', savedConfigs);
            console.log('Store path:', store.path);
            setFirebaseConfigs(Array.isArray(savedConfigs) ? savedConfigs : []);
        };

        loadConfigs();

        // Listen for changes in the store
        const unsubscribe = store.onDidChange('firebaseConfigs', loadConfigs);

        return () => {
            unsubscribe();
        };
    }, []);



    const handleOpenModal = (config) => {
        console.log('Opening modal with config:', config);
        setSelectedConfig(config);
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setSelectedConfig(null);
    };

    const handleSave = useCallback(() => {
        console.log('Saving config:', selectedConfig);

        if (selectedConfig) {
            let updatedConfigs;
            const existingConfigIndex = firebaseConfigs.findIndex(config => config.projectId === selectedConfig.projectId);

            if (existingConfigIndex !== -1) {
                // Existing config
                updatedConfigs = firebaseConfigs.map((config, index) =>
                    index === existingConfigIndex ? selectedConfig : config
                );
                console.log('Updating existing config');
            } else {
                // New config
                const newConfig = { ...selectedConfig, projectId: selectedConfig.projectId || `project-${Date.now()}` };
                updatedConfigs = [...firebaseConfigs, newConfig];
                console.log('Adding new config');
            }

            console.log('Before update - firebaseConfigs:', firebaseConfigs);
            console.log('Updated configs to be saved:', updatedConfigs);

            setFirebaseConfigs(updatedConfigs);
            store.set('firebaseConfigs', updatedConfigs);

            console.log('After update - Store contents:', store.get('firebaseConfigs'));

            handleCloseModal();
            alert(`Firebase configuration ${existingConfigIndex !== -1 ? 'updated' : 'added'} successfully!`);
        } else {
            alert('No configuration selected to save.');
        }
    }, [firebaseConfigs, selectedConfig]);

    const handleDelete = () => setOpenDeleteConfirm(true);

    const confirmDelete = useCallback(() => {
        console.log('Deleting config:', selectedConfig); // Debugging

        if (selectedConfig) {
            const updatedConfigs = firebaseConfigs.filter((config) => config.projectId !== selectedConfig.projectId);
            setFirebaseConfigs(updatedConfigs);
            store.set('firebaseConfigs', updatedConfigs);  // Persist the updated configurations to the store

            console.log('Configs after deletion:', updatedConfigs); // Debugging

            setOpenDeleteConfirm(false);
            handleCloseModal();
            alert('Firebase configuration deleted successfully!');
        } else {
            alert('No configuration selected to delete.');
        }
    }, [firebaseConfigs, selectedConfig]);

    const handleCancelDelete = () => setOpenDeleteConfirm(false);

    return (
        <Container maxWidth="full">
            <Box mt={4}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Database Management
                </Typography>
                <Button variant="contained" color="primary" onClick={() => handleOpenModal({})}>
                    Add New Configuration
                </Button>
                <Box
                    mt={4}
                    width={'100%'}
                    display="flex"
                    overflow={'auto'}
                    flexDirection={'row'}
                    backgroundColor={theme.palette.accentColor.main}
                    padding={3}
                    borderRadius={3}
                    gap={2}
                    sx={{
                        scrollbarWidth: 'none', // For Firefox
                        '&::-webkit-scrollbar': {
                            display: 'none', // For Chrome, Safari, and Opera
                        },
                        msOverflowStyle: 'none',  // IE and Edge
                    }}
                >
                    {firebaseConfigs.map((config) => (
                        <Card key={config.projectId} style={{ minWidth: '300px' }}>
                            <CardContent>
                                <Typography variant="h6">Project ID: {config.projectId}</Typography>
                                <Typography color="textSecondary">API Key: {config.apiKey}</Typography>
                                <Typography color="textSecondary">Auth Domain: {config.authDomain}</Typography>
                            </CardContent>
                            <CardActions>
                                <Button size="small" color="primary" onClick={() => handleOpenModal(config)}>
                                    Edit
                                </Button>
                            </CardActions>
                        </Card>
                    ))}
                </Box>
                <FirebaseConfigModal
                    open={openModal}
                    handleClose={handleCloseModal}
                    firebaseConfig={selectedConfig}
                    setFirebaseConfig={setSelectedConfig}
                    handleSave={handleSave}
                    handleDelete={handleDelete}
                />
                <Dialog
                    open={openDeleteConfirm}
                    onClose={handleCancelDelete}
                    aria-labelledby="confirm-delete-dialog"
                >
                    <DialogTitle id="confirm-delete-dialog">Confirm Deletion</DialogTitle>
                    <DialogContent>
                        <DialogContentText>
                            Are you sure you want to delete this Firebase configuration? This action cannot be undone.
                        </DialogContentText>
                    </DialogContent>
                    <DialogActions>
                        <Button onClick={handleCancelDelete} color="primary">
                            Cancel
                        </Button>
                        <Button onClick={confirmDelete} color="secondary">
                            Confirm
                        </Button>
                    </DialogActions>
                </Dialog>
            </Box>
        </Container>
    );
};

export default DatabaseManagementPage;
