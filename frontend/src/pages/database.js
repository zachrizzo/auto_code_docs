import React, { useState, useEffect, useCallback } from 'react';
import {
    TextField,
    Button,
    Container,
    Typography,
    Box,
    Card,
    CardContent,
    CardActions,
    Checkbox,
    Dialog,
    DialogActions,
    DialogContent,
    DialogContentText,
    DialogTitle,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    Chip,
    Divider,
    Tooltip,
    Paper
} from '@mui/material';
import Store from 'electron-store';
import { useTheme } from '@mui/material/styles';
import FirebaseConfigModal from '../components/database/FirebaseConfigModal';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const store = new Store({
    name: 'FirebaseConfigManager',
    defaults: {
        firebaseConfigs: [],
    },
});

const CustomCard = ({ data, onSelect, selected, onEdit }) => {
    return (
        <Card style={{ minWidth: '300px' }}>
            <CardContent>
                <Checkbox
                    checked={selected}
                    onChange={(e) => onSelect(data, e.target.checked)}
                />
                <Typography variant="h6">Project ID: {data.projectId}</Typography>
                <Typography color="textSecondary">API Key: {data.apiKey}</Typography>
                <Typography color="textSecondary">Auth Domain: {data.authDomain}</Typography>
            </CardContent>
            <CardActions>
                <Button size="small" color="primary" onClick={() => onEdit(data)}>
                    Edit
                </Button>
            </CardActions>
        </Card>
    );
};

const DatabaseManagementPage = () => {
    const [firebaseConfigs, setFirebaseConfigs] = useState([]);
    const [selectedConfigs, setSelectedConfigs] = useState([]);
    const [selectedConfig, setSelectedConfig] = useState(null);
    const [openModal, setOpenModal] = useState(false);
    const [openDeleteConfirm, setOpenDeleteConfirm] = useState(false);
    const [collectionName, setCollectionName] = useState('');
    const [discrepancies, setDiscrepancies] = useState([]);
    const [serviceAccount, setServiceAccount] = useState(null);
    const [isLoading, setIsLoading] = useState(true);
    const [dbSchema, setDbSchema] = useState([]);
    const [assumeSchema, setAssumeSchema] = useState(false);

    const theme = useTheme();

    useEffect(() => {
        const loadConfigs = () => {
            const savedConfigs = store.get('firebaseConfigs');
            setFirebaseConfigs(Array.isArray(savedConfigs) ? savedConfigs : []);
        };

        loadConfigs();

        const unsubscribe = store.onDidChange('firebaseConfigs', loadConfigs);
        return () => unsubscribe();
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
            alert('Please upload a Firebase service account JSON file.');
            return;
        }

        if (!collectionName) {
            alert('Please enter a collection name.');
            return;
        }

        try {
            const response = await fetch('http://localhost:8000/compare-documents', {
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
            } else if (data && data.error) {
                console.error('Error from API:', data.error);
                alert(`Error from server: ${data.error}`);
            } else {
                console.error('Unexpected response format:', data);
                alert('Unexpected response format received from the server.');
            }
        } catch (error) {
            console.error('Error comparing Firestore data:', error);
            alert(`Error comparing Firestore data: ${error.message}`);
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
            } catch (error) {
                console.error('Error parsing JSON file:', error);
                alert('Invalid JSON file. Please upload a valid Firebase service account JSON file.');
            }
        };
        reader.readAsText(file);
        setIsLoading(false);
    };

    const handleSave = useCallback(() => {
        if (selectedConfig) {
            let updatedConfigs;
            const existingConfigIndex = firebaseConfigs.findIndex(config => config.projectId === selectedConfig.projectId);

            if (existingConfigIndex !== -1) {
                updatedConfigs = firebaseConfigs.map((config, index) =>
                    index === existingConfigIndex ? selectedConfig : config
                );
            } else {
                const newConfig = { ...selectedConfig, projectId: selectedConfig.projectId || `project-${Date.now()}` };
                updatedConfigs = [...firebaseConfigs, newConfig];
            }

            setFirebaseConfigs(updatedConfigs);
            store.set('firebaseConfigs', updatedConfigs);

            handleCloseModal();
            alert(`Firebase configuration ${existingConfigIndex !== -1 ? 'updated' : 'added'} successfully!`);
        } else {
            alert('No configuration selected to save.');
        }
    }, [firebaseConfigs, selectedConfig]);

    const handleDelete = () => setOpenDeleteConfirm(true);

    const confirmDelete = useCallback(() => {
        if (selectedConfig) {
            const updatedConfigs = firebaseConfigs.filter((config) => config.projectId !== selectedConfig.projectId);
            setFirebaseConfigs(updatedConfigs);
            store.set('firebaseConfigs', updatedConfigs);

            setOpenDeleteConfirm(false);
            handleCloseModal();
            alert('Firebase configuration deleted successfully!');
        } else {
            alert('No configuration selected to delete.');
        }
    }, [firebaseConfigs, selectedConfig]);

    const handleCancelDelete = () => setOpenDeleteConfirm(false);

    const handleSelectConfig = (config, isSelected) => {
        if (isSelected) {
            setSelectedConfigs((prev) => [...prev, config]);
            setSelectedConfig(config);
        } else {
            setSelectedConfigs((prev) => prev.filter((c) => c.projectId !== config.projectId));
            setSelectedConfig(null);
        }
    };

    const truncate = (str, n) => {
        return (str.length > n) ? str.slice(0, n - 1) + '...' : str;
    };

    const getMissingFields = (structure) => {
        return dbSchema.filter(field => !structure.includes(field));
    };

    const getExtraFields = (structure) => {
        return structure.filter(field => !dbSchema.includes(field));
    };

    const getAssumedSchema = (discrepancies) => {
        if (!discrepancies.length) return [];

        let maxFieldsDoc = discrepancies[0];

        discrepancies.forEach(discrepancy => {
            if (discrepancy.structure.length > maxFieldsDoc.structure.length) {
                maxFieldsDoc = discrepancy;
            }
        });

        return maxFieldsDoc.structure;
    };
    // Function to handle schema upload
    const handleSchemaUpload = (event) => {
        const file = event.target.files[0];
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const schemaContent = JSON.parse(e.target.result);
                setDbSchema(schemaContent.fields || []);
            } catch (error) {
                console.error('Error parsing schema file:', error);
                alert('Invalid schema file. Please upload a valid JSON file.');
            }
        };
        reader.readAsText(file);
    };

    return (
        <Container maxWidth="full">
            <Box mt={4}>
                <Typography variant="h4" component="h1" gutterBottom>
                    Database Management
                </Typography>

                <Box mt={4}>
                    <TextField
                        label="Collection Name"
                        variant="outlined"
                        value={collectionName}
                        onChange={(e) => setCollectionName(e.target.value)}
                        fullWidth
                        margin="normal"
                    />
                    <Button
                        sx={{ marginY: 2 }}
                        variant="contained"
                        color="primary"
                        onClick={compareFirestoreData}
                        disabled={!serviceAccount}
                    >
                        Fetch and Compare Documents
                    </Button>
                </Box>
                <Box mt={4}>
                    <input type="file" accept=".json" onChange={handleServiceAccountUpload} />
                    {serviceAccount && (
                        <Typography variant="body2" color="textSecondary">
                            Service account JSON loaded.
                        </Typography>
                    )}
                </Box>

                {/* <Box
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
                        scrollbarWidth: 'none',
                        '&::-webkit-scrollbar': {
                            display: 'none',
                        },
                        msOverflowStyle: 'none',
                    }}
                >
                    {firebaseConfigs.map((config) => (
                        <CustomCard
                            key={config.projectId}
                            data={config}
                            selected={selectedConfigs.some(c => c.projectId === config.projectId)}
                            onSelect={handleSelectConfig}
                            onEdit={handleOpenModal}
                        />
                    ))}
                </Box> */}
                {/* <FirebaseConfigModal
                    open={openModal}
                    handleClose={handleCloseModal}
                    firebaseConfig={selectedConfig}
                    setFirebaseConfig={setSelectedConfig}
                    handleSave={handleSave}
                    handleDelete={handleDelete}
                /> */}
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

                <Box mt={4}>
                    <input type="file" accept=".json" onChange={handleSchemaUpload} />
                    {dbSchema.length > 0 && (
                        <Typography variant="body2" color="textSecondary">
                            Database schema loaded ({dbSchema.length} fields).
                        </Typography>
                    )}
                </Box>
                <Box mt={2}>
                    <Checkbox
                        checked={assumeSchema}
                        onChange={(e) => setAssumeSchema(e.target.checked)}
                        color="primary"
                    />
                    <Typography variant="body2" color="textSecondary" display="inline">
                        Assume schema based on the document with the most fields.
                    </Typography>
                </Box>
                {discrepancies && discrepancies.length > 0 ? (
                    <Box mt={4}>
                        <Card elevation={3}>
                            <CardContent>
                                <Typography variant="h5" gutterBottom>Document Type Discrepancies</Typography>
                                <Divider style={{ marginBottom: '1rem' }} />
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
                                                <Typography variant="subtitle2" gutterBottom>Structure:</Typography>
                                                <Box display="flex" flexWrap="wrap" gap={1}>
                                                    {Array.isArray(discrepancy.structure) ?
                                                        discrepancy.structure.map((item, i) => {
                                                            if (!dbSchema.includes(item)) {
                                                                return (
                                                                    <Chip
                                                                        key={`extra-${i}`}
                                                                        label={item}
                                                                        size="small"
                                                                        color="warning"
                                                                        variant="outlined"
                                                                    />
                                                                );
                                                            }
                                                            return (
                                                                <Chip
                                                                    key={i}
                                                                    label={item}
                                                                    size="small"
                                                                />
                                                            );
                                                        }) :
                                                        <Typography variant="body2">N/A</Typography>
                                                    }
                                                    {dbSchema.length > 0 && getMissingFields(discrepancy.structure).map((item, i) => (
                                                        <Chip
                                                            key={`missing-${i}`}
                                                            label={item}
                                                            size="small"
                                                            color="error"
                                                            variant="outlined"
                                                        />
                                                    ))}
                                                </Box>
                                            </Box>
                                            <Box>
                                                <Typography variant="subtitle2" gutterBottom>Documents: {discrepancy.documents.length}</Typography>
                                                <Paper style={{ maxHeight: 200, overflow: 'auto', background: theme.palette.accentColor.main, padding: '8px' }}>
                                                    {Array.isArray(discrepancy.documents) ? (
                                                        discrepancy.documents.map((doc, i) => (
                                                            <Chip
                                                                key={i}
                                                                label={doc}
                                                                variant="outlined"
                                                                style={{ margin: '2px 4px' }}
                                                            />
                                                        ))
                                                    ) : (
                                                        <Chip label="N/A" variant="outlined" />
                                                    )}
                                                </Paper>
                                            </Box>
                                        </AccordionDetails>

                                    </Accordion>
                                ))}
                            </CardContent>
                        </Card>
                    </Box>
                ) : (
                    <Card elevation={3} style={{ marginTop: '1rem' }}>
                        <CardContent>
                            <Typography variant="body1">No discrepancies found.</Typography>
                        </CardContent>
                    </Card>
                )}
            </Box>
        </Container >
    );
};

export default DatabaseManagementPage;
