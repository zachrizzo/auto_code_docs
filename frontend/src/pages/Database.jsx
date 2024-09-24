import React, { useState, useEffect, useCallback } from 'react';
import {
    TextField, Button, Container, Typography, Box, Card, CardContent, CardActions,
    Checkbox, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle,
    Accordion, AccordionSummary, AccordionDetails, Chip, Divider, Tooltip, Paper,
    Grid, IconButton, LinearProgress, Snackbar, Alert, Stepper, Step, StepLabel, StepContent
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon, CloudUpload as CloudUploadIcon,
    Compare as CompareIcon, Delete as DeleteIcon, Edit as EditIcon,
    Add as AddIcon, Info as InfoIcon
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Assuming FirebaseConfigModal is imported correctly
import FirebaseConfigModal from '../components/database/FirebaseConfigModal.jsx';

const VisuallyHiddenInput = styled('input')({
    clip: 'rect(0 0 0 0)',
    clipPath: 'inset(50%)',
    height: 1,
    overflow: 'hidden',
    position: 'absolute',
    bottom: 0,
    left: 0,
    whiteSpace: 'nowrap',
    width: 1,
});

const CustomCard = ({ data, onSelect, selected, onEdit }) => (
    <Card elevation={3} sx={{ minWidth: 300, m: 1 }}>
        <CardContent>
            <Box display="flex" justifyContent="space-between" alignItems="center">
                <Typography variant="h6" noWrap>
                    {data.projectId}
                </Typography>
                <Checkbox
                    checked={selected}
                    onChange={(e) => onSelect(data, e.target.checked)}
                />
            </Box>
            <Typography color="text.secondary" noWrap>
                API Key: {data.apiKey}
            </Typography>
            <Typography color="text.secondary" noWrap>
                Auth Domain: {data.authDomain}
            </Typography>
        </CardContent>
        <CardActions>
            <Button
                startIcon={<EditIcon />}
                size="small"
                color="primary"
                onClick={() => onEdit(data)}
            >
                Edit
            </Button>
        </CardActions>
    </Card>
);

export default function DatabaseManagementPage() {
    const [firebaseConfigs, setFirebaseConfigs] = useState([]);
    const [selectedConfigs, setSelectedConfigs] = useState([]);
    const [selectedConfig, setSelectedConfig] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [collectionName, setCollectionName] = useState('');
    const [discrepancies, setDiscrepancies] = useState([]);
    const [serviceAccount, setServiceAccount] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [dbSchema, setDbSchema] = useState([]);
    const [assumeSchema, setAssumeSchema] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info',
    });
    const [activeStep, setActiveStep] = useState(0);

    useEffect(() => {
        const loadConfigs = async () => {
            const savedConfigs = await window.electronAPI.getConfigs();
            setFirebaseConfigs(Array.isArray(savedConfigs) ? savedConfigs : []);
        };

        loadConfigs();

        const handleConfigsChanged = (configs) => {
            setFirebaseConfigs(Array.isArray(configs) ? configs : []);
        };

        window.electronAPI.onConfigsChanged(handleConfigsChanged);

        return () => {
            window.electronAPI.removeConfigsChangedListener(handleConfigsChanged);
        };
    }, []);

    const handleOpenModal = (config) => {
        setSelectedConfig(config);
        setOpenModal(true);
    };

    const handleCloseModal = () => {
        setOpenModal(false);
        setSelectedConfig(null);
    };

    const compareFirestoreData = async () => {
        setIsLoading(true);
        if (!serviceAccount) {
            setSnackbar({
                open: true,
                message: 'Please upload a Firebase service account JSON file.',
                severity: 'error',
            });
            setIsLoading(false);
            return;
        }

        if (!collectionName) {
            setSnackbar({
                open: true,
                message: 'Please enter a collection name.',
                severity: 'error',
            });
            setIsLoading(false);
            return;
        }

        try {
            const response = await fetch('http://127.0.0.1:8000/compare-documents', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    collection_name: collectionName,
                    service_account: serviceAccount,
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch discrepancies');
            }

            const data = await response.json();

            if (data && data.discrepancies) {
                setDiscrepancies(data.discrepancies);
                if (assumeSchema) {
                    const assumedSchema = getAssumedSchema(data.discrepancies);
                    setDbSchema(assumedSchema);
                }
                setSnackbar({
                    open: true,
                    message: 'Discrepancies fetched successfully',
                    severity: 'success',
                });
                setActiveStep(3);
            } else if (data && data.error) {
                console.error('Error from API:', data.error);
                setSnackbar({
                    open: true,
                    message: `Error from server: ${data.error}`,
                    severity: 'error',
                });
            } else {
                console.error('Unexpected response format:', data);
                setSnackbar({
                    open: true,
                    message: 'Unexpected response format received from the server.',
                    severity: 'error',
                });
            }
        } catch (error) {
            console.error('Error comparing Firestore data:', error);
            setSnackbar({
                open: true,
                message: `Error comparing Firestore data: ${error.message}`,
                severity: 'error',
            });
        } finally {
            setIsLoading(false);
        }
    };

    const handleServiceAccountUpload = (event) => {
        setIsLoading(true);
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);
                setServiceAccount(jsonContent);
                setSnackbar({
                    open: true,
                    message: 'Service account JSON loaded successfully',
                    severity: 'success',
                });
            } catch (error) {
                console.error('Error parsing JSON file:', error);
                setSnackbar({
                    open: true,
                    message: 'Invalid JSON file. Please upload a valid Firebase service account JSON file.',
                    severity: 'error',
                });
            } finally {
                setIsLoading(false);
            }
        };
        if (file) {
            reader.readAsText(file);
        } else {
            setIsLoading(false);
        }
    };

    const handleSave = useCallback(async () => {
        if (selectedConfig) {
            let updatedConfigs;
            const existingConfigIndex = firebaseConfigs.findIndex(
                (config) => config.projectId === selectedConfig.projectId
            );

            if (existingConfigIndex !== -1) {
                updatedConfigs = firebaseConfigs.map((config, index) =>
                    index === existingConfigIndex ? selectedConfig : config
                );
            } else {
                const newConfig = {
                    ...selectedConfig,
                    projectId: selectedConfig.projectId || `project-${Date.now()}`,
                };
                updatedConfigs = [...firebaseConfigs, newConfig];
            }

            setFirebaseConfigs(updatedConfigs);
            await window.electronAPI.saveConfigs(updatedConfigs);

            handleCloseModal();
            setSnackbar({
                open: true,
                message: `Firebase configuration ${existingConfigIndex !== -1 ? 'updated' : 'added'} successfully!`,
                severity: 'success',
            });
        } else {
            setSnackbar({
                open: true,
                message: 'No configuration selected to save.',
                severity: 'error',
            });
        }
    }, [firebaseConfigs, selectedConfig]);

    const handleDelete = () => setOpenDeleteConfirm(true);

    const confirmDelete = useCallback(async () => {
        if (selectedConfig) {
            await window.electronAPI.deleteConfig(selectedConfig.projectId);

            handleCloseModal();
            setSnackbar({
                open: true,
                message: 'Firebase configuration deleted successfully!',
                severity: 'success',
            });
        } else {
            setSnackbar({
                open: true,
                message: 'No configuration selected to delete.',
                severity: 'error',
            });
        }
        setOpenDeleteConfirm(false);
    }, [selectedConfig]);

    const handleCancelDelete = () => setOpenDeleteConfirm(false);

    const handleSelectConfig = (config, isSelected) => {
        if (isSelected) {
            setSelectedConfigs((prev) => [...prev, config]);
            setSelectedConfig(config);
        } else {
            setSelectedConfigs((prev) =>
                prev.filter((c) => c.projectId !== config.projectId)
            );
            setSelectedConfig(null);
        }
    };

    const truncate = (str, n) => {
        return str.length > n ? str.slice(0, n - 1) + '...' : str;
    };

    const getMissingFields = (structure) => {
        return dbSchema.filter((field) => !structure.includes(field));
    };

    const getExtraFields = (structure) => {
        return structure.filter((field) => !dbSchema.includes(field));
    };

    const getAssumedSchema = (discrepancies) => {
        if (!discrepancies.length) return [];

        let maxFieldsDoc = discrepancies[0];

        discrepancies.forEach((discrepancy) => {
            if (discrepancy.structure.length > maxFieldsDoc.structure.length) {
                maxFieldsDoc = discrepancy;
            }
        });

        return maxFieldsDoc.structure;
    };

    const handleSchemaUpload = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const schemaContent = JSON.parse(e.target.result);
                setDbSchema(schemaContent.fields || []);
                setSnackbar({
                    open: true,
                    message: 'Schema file loaded successfully',
                    severity: 'success',
                });
                setActiveStep((prev) => prev + 1);
            } catch (error) {
                console.error('Error parsing schema file:', error);
                setSnackbar({
                    open: true,
                    message: 'Invalid schema file. Please upload a valid JSON file.',
                    severity: 'error',
                });
            }
        };
        if (file) {
            reader.readAsText(file);
        }
    };

    const handleNext = () => {
        setActiveStep((prevActiveStep) => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep((prevActiveStep) => prevActiveStep - 1);
    };

    const steps = [
        {
            label: 'Upload Service Account',
            content: (
                <Box>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CloudUploadIcon />}
                        component="label"
                    >
                        Upload Service Account
                        <VisuallyHiddenInput
                            type="file"
                            onChange={handleServiceAccountUpload}
                            accept=".json"
                        />
                    </Button>
                    {serviceAccount && (
                        <Typography variant="body2" color="text.secondary" mt={1}>
                            Service account JSON loaded.
                        </Typography>
                    )}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleNext}
                            disabled={!serviceAccount}
                        >
                            Next
                        </Button>
                    </Box>
                </Box>
            ),
        },
        {
            label: 'Enter Collection Name',
            content: (
                <Box>
                    <TextField
                        label="Collection Name"
                        variant="outlined"
                        value={collectionName}
                        onChange={(e) => setCollectionName(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                            variant="outlined"
                            onClick={handleBack}
                        >
                            Back
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleNext}
                            disabled={!collectionName.trim()}
                        >
                            Next
                        </Button>
                    </Box>
                </Box>
            ),
        },
        {
            label: 'Configure Schema',
            content: (
                <Box>
                    <Button
                        variant="contained"
                        color="primary"
                        startIcon={<CloudUploadIcon />}
                        component="label"
                    >
                        Upload Schema
                        <VisuallyHiddenInput
                            type="file"
                            onChange={handleSchemaUpload}
                            accept=".json"
                        />
                    </Button>
                    <Box mt={2} display="flex" alignItems="center">
                        <Checkbox
                            checked={assumeSchema}
                            onChange={(e) => setAssumeSchema(e.target.checked)}
                            color="primary"
                        />
                        <Typography variant="body2" color="text.secondary">
                            Assume schema from largest document
                        </Typography>
                    </Box>
                    {dbSchema.length > 0 && (
                        <Typography variant="body2" color="text.secondary" mt={1}>
                            Database schema loaded ({dbSchema.length} fields).
                        </Typography>
                    )}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                            variant="outlined"
                            onClick={handleBack}
                        >
                            Back
                        </Button>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleNext}
                            disabled={!dbSchema.length && !assumeSchema}
                        >
                            Next
                        </Button>
                    </Box>
                </Box>
            ),
        },
        {
            label: 'Compare Documents',
            content: (
                <Box>
                    <Button
                        variant="contained"
                        color="secondary"
                        startIcon={<CompareIcon />}
                        onClick={compareFirestoreData}
                        disabled={!serviceAccount || !collectionName || isLoading}
                    >
                        Compare Documents
                    </Button>
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'space-between' }}>
                        <Button
                            variant="outlined"
                            onClick={handleBack}
                        >
                            Back
                        </Button>
                        {/* Optionally, you can add a "Finish" button or keep it as is */}
                    </Box>
                </Box>
            ),
        },
    ];

    return (
        <Container maxWidth="xl">
            <Box mt={4}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Database Management
                </Typography>

                <Grid container spacing={3}>
                    <Grid item xs={12} md={6}>
                        <Card elevation={3}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Document Comparison
                                </Typography>
                                <Stepper activeStep={activeStep} orientation="vertical">
                                    {steps.map((step, index) => (
                                        <Step key={step.label}>
                                            <StepLabel>{step.label}</StepLabel>
                                            <StepContent>
                                                {step.content}
                                            </StepContent>
                                        </Step>
                                    ))}
                                </Stepper>
                            </CardContent>
                        </Card>
                    </Grid>

                    <Grid item xs={12} md={6}>
                        <Card elevation={3}>
                            <CardContent>
                                <Typography variant="h6" gutterBottom>
                                    Firebase Configurations
                                </Typography>
                                <Box
                                    display="flex"
                                    flexWrap="wrap"
                                    gap={2}
                                    sx={{
                                        maxHeight: '400px',
                                        overflowY: 'auto',
                                        '&::-webkit-scrollbar':
                                        {
                                            width: '0.4em'
                                        },
                                        '&::-webkit-scrollbar-track': {
                                            boxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)',
                                            webkitBoxShadow: 'inset 0 0 6px rgba(0,0,0,0.00)'
                                        },
                                        '&::-webkit-scrollbar-thumb': {
                                            backgroundColor: 'rgba(0,0,0,.1)',
                                            outline: '1px solid slategrey'
                                        }
                                    }}
                                >
                                    {firebaseConfigs.map((config) => (
                                        <CustomCard
                                            key={config.projectId}
                                            data={config}
                                            selected={selectedConfigs.some(
                                                (c) => c.projectId === config.projectId
                                            )}
                                            onSelect={handleSelectConfig}
                                            onEdit={handleOpenModal}
                                        />
                                    ))}
                                </Box>
                                <Box mt={2}>
                                    <Button
                                        variant="outlined"
                                        startIcon={<AddIcon />}
                                        onClick={() => handleOpenModal(null)}
                                    >
                                        Add New Configuration
                                    </Button>
                                </Box>
                            </CardContent>
                        </Card>
                    </Grid>
                </Grid>

                {isLoading && <LinearProgress sx={{ my: 2 }} />}

                {discrepancies && discrepancies.length > 0 ? (
                    <Box mt={4}>
                        <Card elevation={3}>
                            <CardContent>
                                <Typography variant="h5" gutterBottom>
                                    Document Type Discrepancies
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                {discrepancies.map((discrepancy, index) => (
                                    <Accordion key={index}>
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls={`panel${index}a-content`}
                                            id={`panel${index}a-header`}
                                        >
                                            <Tooltip title={discrepancy.type || 'Unknown'}>
                                                <Typography variant="subtitle1">
                                                    Type: {truncate(discrepancy.type || 'Unknown', 50)}
                                                </Typography>
                                            </Tooltip>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            <Box mb={2}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Structure:
                                                </Typography>
                                                <Box display="flex" flexWrap="wrap" gap={1}>
                                                    {Array.isArray(discrepancy.structure)
                                                        ? discrepancy.structure.map((item, i) => (
                                                            <Chip
                                                                key={i}
                                                                label={item}
                                                                size="small"
                                                                color={
                                                                    dbSchema.includes(item)
                                                                        ? 'default'
                                                                        : 'warning'
                                                                }
                                                                variant={
                                                                    dbSchema.includes(item)
                                                                        ? 'default'
                                                                        : 'outlined'
                                                                }
                                                            />
                                                        ))
                                                        : 'N/A'}
                                                    {dbSchema.length > 0 &&
                                                        getMissingFields(discrepancy.structure).map(
                                                            (item, i) => (
                                                                <Chip
                                                                    key={`missing-${i}`}
                                                                    label={item}
                                                                    size="small"
                                                                    color="error"
                                                                    variant="outlined"
                                                                />
                                                            )
                                                        )}
                                                </Box>
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Documents: {discrepancy.documents.length}
                                                </Typography>
                                                <Paper
                                                    sx={{
                                                        maxHeight: 200,
                                                        overflow: 'auto',
                                                        bgcolor: 'background.default',
                                                        p: 1,
                                                    }}
                                                >
                                                    {Array.isArray(discrepancy.documents)
                                                        ? discrepancy.documents.map((doc, i) => (
                                                            <Chip
                                                                key={i}
                                                                label={doc}
                                                                variant="outlined"
                                                                sx={{ m: 0.5 }}
                                                            />
                                                        ))
                                                        : 'N/A'}
                                                </Paper>
                                            </Box>
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                            </CardContent>
                        </Card>
                    </Box>
                ) : (
                    <Card elevation={3} sx={{ mt: 2 }}>
                        <CardContent>
                            <Typography variant="body1">
                                No discrepancies found.
                            </Typography>
                        </CardContent>
                    </Card>
                )}
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
                        Are you sure you want to delete this Firebase configuration? This
                        action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleCancelDelete} color="primary">
                        Cancel
                    </Button>
                    <Button
                        onClick={confirmDelete}
                        color="error"
                        startIcon={<DeleteIcon />}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            <Snackbar
                open={snackbar.open}
                autoHideDuration={6000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
            >
                <Alert
                    onClose={() => setSnackbar({ ...snackbar, open: false })}
                    severity={snackbar.severity}
                    sx={{ width: '100%' }}
                >
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Container>
    );
}
