import React, { useState, useEffect, useRef } from 'react';
import {
    TextField, Button, Container, Typography, Box, Card, CardContent,
    Accordion, AccordionSummary, AccordionDetails,
    Chip, Divider, LinearProgress, Snackbar, Alert, Stepper,
    Step, StepLabel, StepContent, Dialog, DialogTitle, DialogContent, DialogContentText,
    DialogActions, RadioGroup, FormControlLabel, Radio, Tooltip,
    Select, MenuItem,
} from '@mui/material';
import {
    ExpandMore as ExpandMoreIcon, CloudUpload as CloudUploadIcon,
    Compare as CompareIcon, Delete as DeleteIcon, Save as SaveIcon,
} from '@mui/icons-material';
import { styled } from '@mui/material/styles';

// Styled component for hidden file input
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

export default function DatabaseManagementPage() {
    const [collectionName, setCollectionName] = useState('');
    const [discrepancies, setDiscrepancies] = useState([]);
    const [serviceAccounts, setServiceAccounts] = useState([]);
    const [selectedServiceAccount, setSelectedServiceAccount] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [snackbar, setSnackbar] = useState({
        open: false,
        message: '',
        severity: 'info',
    });
    const [activeStep, setActiveStep] = useState(0);

    // Service Account related state
    const [serviceAccountOption, setServiceAccountOption] = useState('select'); // 'select', 'upload', 'type'
    const [typedServiceAccount, setTypedServiceAccount] = useState('');
    const serviceAccountFileInputRef = useRef(null);

    // Schema-related state
    const [schemaOption, setSchemaOption] = useState('assume'); // 'assume', 'upload', 'type'
    const [autoSchemaOption, setAutoSchemaOption] = useState('mostDocs'); // 'mostDocs', 'mostFields'
    const [schema, setSchema] = useState(null);
    const [typedSchema, setTypedSchema] = useState('');
    const schemaFileInputRef = useRef(null);

    // Delete confirmation dialog state
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);

    useEffect(() => {
        const loadServiceAccounts = async () => {
            try {
                const savedAccounts = await window.electronAPI.getServiceAccounts();
                setServiceAccounts(Array.isArray(savedAccounts) ? savedAccounts : []);
            } catch (error) {
                console.error('Error loading service accounts:', error);
                setSnackbar({
                    open: true,
                    message: 'Failed to load service accounts.',
                    severity: 'error',
                });
            }
        };

        loadServiceAccounts();

        const handleServiceAccountsChanged = (event, accounts) => {
            setServiceAccounts(Array.isArray(accounts) ? accounts : []);
            if (accounts?.length === 0) {
                setSelectedServiceAccount(null);
            }
        };

        window.electronAPI.onServiceAccountsChanged(handleServiceAccountsChanged);

        return () => {
            // Cleanup if necessary
        };
    }, []);

    const handleServiceAccountUpload = (event) => {
        setIsLoading(true);
        const file = event.target.files?.[0];
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);
                const accountName = jsonContent.project_id || 'Unnamed Account';
                const newAccount = { name: accountName, content: jsonContent };
                const updatedAccounts = [...serviceAccounts, newAccount];
                setServiceAccounts(updatedAccounts);
                await window.electronAPI.saveServiceAccounts(updatedAccounts);
                setSelectedServiceAccount(newAccount);
                setSnackbar({
                    open: true,
                    message: 'Service account JSON uploaded and saved successfully',
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
                if (event.target) event.target.value = '';
            }
        };
        if (file) {
            reader.readAsText(file);
        } else {
            setIsLoading(false);
        }
    };

    const handleServiceAccountType = async () => {
        try {
            const jsonContent = JSON.parse(typedServiceAccount);
            const accountName = jsonContent.project_id || 'Unnamed Account';
            const newAccount = { name: accountName, content: jsonContent };
            const updatedAccounts = [...serviceAccounts, newAccount];
            setServiceAccounts(updatedAccounts);
            await window.electronAPI.saveServiceAccounts(updatedAccounts);
            setSelectedServiceAccount(newAccount);
            setSnackbar({
                open: true,
                message: 'Service account JSON saved successfully',
                severity: 'success',
            });
            setTypedServiceAccount('');
            setServiceAccountOption('select');
        } catch (error) {
            console.error('Error parsing typed JSON:', error);
            setSnackbar({
                open: true,
                message: 'Invalid JSON. Please enter a valid Firebase service account JSON.',
                severity: 'error',
            });
        }
    };

    const handleSchemaFileUpload = (event) => {
        setIsLoading(true);
        const file = event.target.files?.[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const jsonContent = JSON.parse(e.target.result);
                setSchema(jsonContent);
                setSnackbar({
                    open: true,
                    message: 'Schema JSON loaded successfully',
                    severity: 'success',
                });
            } catch (error) {
                console.error('Error parsing JSON file:', error);
                setSnackbar({
                    open: true,
                    message: 'Invalid JSON file. Please upload a valid schema JSON file.',
                    severity: 'error',
                });
            } finally {
                setIsLoading(false);
                if (event.target) event.target.value = '';
            }
        };
        if (file) {
            reader.readAsText(file);
        } else {
            setIsLoading(false);
        }
    };

    const compareFirestoreData = async () => {
        setIsLoading(true);
        if (!selectedServiceAccount) {
            setSnackbar({
                open: true,
                message: 'Please select or provide a Firebase service account JSON.',
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
                    service_account: selectedServiceAccount.content,
                    schema: null, // We will handle schema in frontend
                }),
            });

            if (!response.ok) {
                throw new Error('Failed to fetch discrepancies');
            }

            const data = await response.json();

            if (data && data.discrepancies) {
                let schemaFields = [];

                if (schemaOption === 'assume') {
                    if (autoSchemaOption === 'mostDocs') {
                        // Find the discrepancy with the most documents
                        let maxDocs = 0;
                        data.discrepancies.forEach((discrepancy) => {
                            if (discrepancy.documents.length > maxDocs) {
                                maxDocs = discrepancy.documents.length;
                                schemaFields = discrepancy.structure;
                            }
                        });
                    } else if (autoSchemaOption === 'mostFields') {
                        // Find the discrepancy with the most fields
                        let maxFields = 0;
                        data.discrepancies.forEach((discrepancy) => {
                            if (discrepancy.structure.length > maxFields) {
                                maxFields = discrepancy.structure.length;
                                schemaFields = discrepancy.structure;
                            }
                        });
                    }
                } else if (schemaOption === 'upload' && schema) {
                    schemaFields = Object.keys(schema);
                } else if (schemaOption === 'type' && typedSchema) {
                    try {
                        const parsedSchema = JSON.parse(typedSchema);
                        schemaFields = Object.keys(parsedSchema);
                    } catch (error) {
                        setSnackbar({
                            open: true,
                            message: 'Invalid typed schema JSON.',
                            severity: 'error',
                        });
                        setIsLoading(false);
                        return;
                    }
                }

                if (schemaFields.length === 0) {
                    setSnackbar({
                        open: true,
                        message: 'No schema fields determined.',
                        severity: 'error',
                    });
                    setIsLoading(false);
                    return;
                }

                // Process each discrepancy
                const updatedDiscrepancies = data.discrepancies.map((discrepancy) => {
                    const documentFields = discrepancy.structure || [];

                    const missingFields = schemaFields.filter(field => !documentFields.includes(field));
                    const extraFields = documentFields.filter(field => !schemaFields.includes(field));
                    const matchingFields = documentFields.filter(field => schemaFields.includes(field));

                    return {
                        type: discrepancy.type || 'Unknown',
                        missingFields,
                        extraFields,
                        matchingFields,
                        documents: discrepancy.documents || [],
                        schemaFields,
                        documentFields,
                    };
                });

                setDiscrepancies(updatedDiscrepancies);
                setSnackbar({
                    open: true,
                    message: 'Discrepancies fetched successfully',
                    severity: 'success',
                });
                setActiveStep(4); // Assuming step 4 is 'Results'

                // Save the collection name to past collections
                const pastCollections = await window.electronAPI.getPastCollections();
                const uniquePastCollections = [...new Set([collectionName, ...pastCollections])];
                await window.electronAPI.savePastCollections(uniquePastCollections);
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

    const handleDeleteServiceAccount = async () => {
        if (selectedServiceAccount) {
            try {
                await window.electronAPI.deleteServiceAccount(selectedServiceAccount.content.project_id);
                setSnackbar({
                    open: true,
                    message: 'Service account deleted successfully',
                    severity: 'success',
                });
                setSelectedServiceAccount(null);
                setOpenDeleteConfirm(false);
            } catch (error) {
                console.error('Error deleting service account:', error);
                setSnackbar({
                    open: true,
                    message: 'Failed to delete service account.',
                    severity: 'error',
                });
            }
        }
    };

    const handleNext = () => {
        setActiveStep(prevActiveStep => prevActiveStep + 1);
    };

    const handleBack = () => {
        setActiveStep(prevActiveStep => prevActiveStep - 1);
    };

    const steps = [
        {
            label: 'Provide Service Account',
            content: (
                <Box>
                    <Typography variant="body1" gutterBottom>
                        Provide your Firebase service account. You can:
                    </Typography>
                    <RadioGroup
                        value={serviceAccountOption}
                        onChange={(e) => setServiceAccountOption(e.target.value)}
                    >
                        {serviceAccounts?.length > 0 && (
                            <FormControlLabel
                                value="select"
                                control={<Radio />}
                                label="Select from saved accounts"
                            />
                        )}
                        <FormControlLabel
                            value="upload"
                            control={<Radio />}
                            label="Upload Service Account File"
                        />
                        <FormControlLabel
                            value="type"
                            control={<Radio />}
                            label="Type Service Account JSON"
                        />
                    </RadioGroup>
                    {serviceAccountOption === 'select' && serviceAccounts?.length > 0 && (
                        <Box mt={2}>
                            <Select
                                value={selectedServiceAccount || ''}
                                onChange={(e) => setSelectedServiceAccount(e.target.value)}
                                fullWidth
                            >
                                {serviceAccounts.map((account, index) => (
                                    <MenuItem key={index} value={account}>
                                        {account?.name?.length > 20 ? (
                                            <Tooltip title={account.name}>
                                                <Typography
                                                    noWrap
                                                    sx={{ maxWidth: '200px' }}
                                                >
                                                    {account.name}
                                                </Typography>
                                            </Tooltip>
                                        ) : (
                                            account.name
                                        )}
                                    </MenuItem>
                                ))}
                            </Select>
                            <Box mt={1}>
                                <Button
                                    variant="outlined"
                                    color="error"
                                    startIcon={<DeleteIcon />}
                                    onClick={() => setOpenDeleteConfirm(true)}
                                    disabled={!selectedServiceAccount}
                                >
                                    Delete Selected Account
                                </Button>
                            </Box>
                        </Box>
                    )}
                    {serviceAccountOption === 'upload' && (
                        <Box mt={2}>
                            <Button
                                variant="contained"
                                color="primary"
                                component="label"
                                startIcon={<CloudUploadIcon />}
                            >
                                Upload Service Account
                                <VisuallyHiddenInput
                                    type="file"
                                    onChange={handleServiceAccountUpload}
                                    accept=".json"
                                />
                            </Button>
                        </Box>
                    )}
                    {serviceAccountOption === 'type' && (
                        <Box mt={2}>
                            <TextField
                                label="Type Service Account JSON"
                                multiline
                                rows={6}
                                value={typedServiceAccount}
                                onChange={(e) => setTypedServiceAccount(e.target.value)}
                                fullWidth
                                variant="outlined"
                            />
                            <Box mt={1}>
                                <Button
                                    variant="contained"
                                    color="primary"
                                    startIcon={<SaveIcon />}
                                    onClick={handleServiceAccountType}
                                >
                                    Save Service Account
                                </Button>
                            </Box>
                        </Box>
                    )}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-end' }}>
                        <Button
                            variant="contained"
                            color="primary"
                            onClick={handleNext}
                            disabled={
                                (serviceAccountOption === 'select' && !selectedServiceAccount) ||
                                (serviceAccountOption === 'upload' && !serviceAccounts?.length) ||
                                (serviceAccountOption === 'type' && !typedServiceAccount.trim())
                            }
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
                        value={collectionName}
                        onChange={(event) => setCollectionName(event.target.value)}
                        fullWidth
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
            label: 'Provide Database Schema (Optional)',
            content: (
                <Box>
                    <Typography variant="body1" gutterBottom>
                        Provide your database schema (optional). You can:
                    </Typography>
                    <RadioGroup
                        value={schemaOption}
                        onChange={(e) => setSchemaOption(e.target.value)}
                    >
                        <FormControlLabel
                            value="assume"
                            control={<Radio />}
                            label="Let the app assume the schema"
                        />
                        <FormControlLabel
                            value="upload"
                            control={<Radio />}
                            label="Upload Schema File"
                        />
                        <FormControlLabel
                            value="type"
                            control={<Radio />}
                            label="Type Schema"
                        />
                    </RadioGroup>

                    {schemaOption === 'assume' && (
                        <Box mt={2}>
                            <Typography variant="body1" gutterBottom>
                                Choose how to determine the schema:
                            </Typography>
                            <RadioGroup
                                value={autoSchemaOption}
                                onChange={(e) => setAutoSchemaOption(e.target.value)}
                            >
                                <FormControlLabel
                                    value="mostDocs"
                                    control={<Radio />}
                                    label="Use document type with most documents"
                                />
                                <FormControlLabel
                                    value="mostFields"
                                    control={<Radio />}
                                    label="Use document type with most fields"
                                />
                            </RadioGroup>
                        </Box>
                    )}

                    {schemaOption === 'upload' && (
                        <Box mt={2}>
                            <Button
                                variant="contained"
                                color="primary"
                                component="label"
                            >
                                Upload Schema File
                                <VisuallyHiddenInput
                                    type="file"
                                    onChange={handleSchemaFileUpload}
                                    accept=".json"
                                />
                            </Button>
                            {schema && (
                                <Typography variant="body2" color="text.secondary" mt={1}>
                                    Schema file loaded.
                                </Typography>
                            )}
                        </Box>
                    )}
                    {schemaOption === 'type' && (
                        <TextField
                            label="Type Schema JSON"
                            multiline
                            rows={6}
                            value={typedSchema}
                            onChange={(e) => setTypedSchema(e.target.value)}
                            fullWidth
                            variant="outlined"
                            sx={{ mt: 2 }}
                        />
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
                        disabled={!selectedServiceAccount || !collectionName || isLoading}
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
                    </Box>
                </Box>
            ),
        },
        {
            label: 'Results',
            content: (
                <Box>
                    {discrepancies && discrepancies.length > 0 ? (
                        <Typography variant="body1">See the discrepancies below.</Typography>
                    ) : (
                        <Typography variant="body1">No discrepancies found.</Typography>
                    )}
                    <Box sx={{ mt: 2, display: 'flex', justifyContent: 'flex-start' }}>
                        <Button
                            variant="outlined"
                            onClick={handleBack}
                        >
                            Back
                        </Button>
                    </Box>
                </Box>
            ),
        },
    ];

    // Function to determine chip color based on status
    const getStatusColor = (status) => {
        switch (status) {
            case 'Matching':
                return 'default'; // White
            case 'Missing':
                return 'error'; // Red
            case 'Extra':
                return 'warning'; // Yellow
            default:
                return 'default';
        }
    };

    return (
        <Container maxWidth="md">
            <Box mt={4}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Database Management
                </Typography>

                <Card elevation={3}>
                    <CardContent>
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

                {isLoading && <LinearProgress sx={{ my: 2 }} />}

                {activeStep === 4 && discrepancies && discrepancies.length > 0 && (
                    <Box mt={4}>
                        <Card elevation={3}>
                            <CardContent>
                                <Typography variant="h5" gutterBottom>
                                    Document Discrepancies
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                {discrepancies.map((discrepancy, index) => (
                                    <Accordion key={index}>
                                        <AccordionSummary
                                            expandIcon={<ExpandMoreIcon />}
                                            aria-controls={`panel${index}-content`}
                                            id={`panel${index}-header`}
                                        >
                                            <Tooltip title={discrepancy.type || 'Unknown'}>
                                                <Typography
                                                    variant="subtitle1"
                                                    noWrap
                                                    sx={{
                                                        maxWidth: '200px',
                                                        overflow: 'hidden',
                                                        textOverflow: 'ellipsis',
                                                    }}
                                                >
                                                    Document Type: {discrepancy.type || 'Unknown'}
                                                </Typography>
                                            </Tooltip>
                                        </AccordionSummary>
                                        <AccordionDetails>
                                            {/* Fields Display */}
                                            <Box mb={2}>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Fields:
                                                </Typography>
                                                <Box display="flex" flexWrap="wrap" gap={1}>
                                                    {/* Matching Fields - White Chips */}
                                                    {discrepancy.matchingFields && discrepancy.matchingFields.map((field, i) => (
                                                        <Chip
                                                            key={`matching-${i}`}
                                                            label={field}
                                                            color={getStatusColor('Matching')}
                                                            variant="outlined"
                                                            size="small"
                                                        />
                                                    ))}
                                                    {/* Missing Fields - Red Chips */}
                                                    {discrepancy.missingFields && discrepancy.missingFields.map((field, i) => (
                                                        <Chip
                                                            key={`missing-${i}`}
                                                            label={field}
                                                            color={getStatusColor('Missing')}
                                                            variant="outlined"
                                                            size="small"
                                                        />
                                                    ))}
                                                    {/* Extra Fields - Yellow Chips */}
                                                    {discrepancy.extraFields && discrepancy.extraFields.map((field, i) => (
                                                        <Chip
                                                            key={`extra-${i}`}
                                                            label={field}
                                                            color={getStatusColor('Extra')}
                                                            variant="outlined"
                                                            size="small"
                                                        />
                                                    ))}
                                                </Box>
                                            </Box>

                                            {/* Affected Documents as Chips */}
                                            <Box>
                                                <Typography variant="subtitle2" gutterBottom>
                                                    Affected Documents ({discrepancy.documents.length}):
                                                </Typography>
                                                <Box display="flex" flexWrap="wrap" gap={1}>
                                                    {discrepancy.documents.map((doc, i) => (
                                                        <Chip
                                                            key={i}
                                                            label={doc}
                                                            variant="outlined"
                                                            size="small"
                                                        />
                                                    ))}
                                                </Box>
                                            </Box>
                                        </AccordionDetails>
                                    </Accordion>
                                ))}
                            </CardContent>
                        </Card>
                    </Box>
                )}

                {activeStep === 4 && discrepancies && discrepancies.length === 0 && (
                    <Box mt={4}>
                        <Card elevation={3}>
                            <CardContent>
                                <Typography variant="h5" gutterBottom>
                                    Document Discrepancies
                                </Typography>
                                <Divider sx={{ mb: 2 }} />
                                <Typography variant="body1">No discrepancies found.</Typography>
                            </CardContent>
                        </Card>
                    </Box>
                )}
            </Box>

            {/* Hidden file inputs */}
            <VisuallyHiddenInput
                type="file"
                accept=".json"
                ref={serviceAccountFileInputRef}
                onChange={handleServiceAccountUpload}
            />

            <VisuallyHiddenInput
                type="file"
                accept=".json"
                ref={schemaFileInputRef}
                onChange={handleSchemaFileUpload}
            />

            {/* Delete Confirmation Dialog */}
            <Dialog
                open={openDeleteConfirm}
                onClose={() => setOpenDeleteConfirm(false)}
                aria-labelledby="confirm-delete-dialog"
            >
                <DialogTitle id="confirm-delete-dialog">Confirm Deletion</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Are you sure you want to delete the selected service account? This action cannot be undone.
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setOpenDeleteConfirm(false)} color="primary">
                        Cancel
                    </Button>
                    <Button
                        onClick={handleDeleteServiceAccount}
                        color="error"
                        startIcon={<DeleteIcon />}
                    >
                        Delete
                    </Button>
                </DialogActions>
            </Dialog>

            {/* Snackbar for Notifications */}
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
