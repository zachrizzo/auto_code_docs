import React from 'react';
import {
    TextField,
    Button,
    Typography,
    Box,
    Modal,
} from '@mui/material';
import ModalContent from '../styled/ModalContent.jsx';


const FirebaseConfigModal = ({ open, handleClose, firebaseConfig, setFirebaseConfig, handleSave, handleDelete }) => {
    const handleChange = (e) => {
        setFirebaseConfig({
            ...firebaseConfig,
            [e.target.name]: e.target.value,
        });
    };

    return (
        <Modal
            open={open}
            onClose={handleClose}
            aria-labelledby="firebase-config-modal"
            aria-describedby="firebase-configuration-modal"
        >
            <ModalContent elevation={24}>
                <Typography variant="h4" component="h2" id="firebase-config-modal" gutterBottom>
                    Firebase Configuration
                </Typography>
                {['apiKey', 'authDomain', 'projectId', 'storageBucket', 'messagingSenderId', 'appId', 'measurementId'].map((field) => (
                    <TextField
                        key={field}
                        label={field.split(/(?=[A-Z])/).join(' ')}
                        name={field}
                        value={firebaseConfig?.[field] || ''}
                        onChange={handleChange}
                        fullWidth
                        margin="normal"
                        disabled={field === 'projectId' && firebaseConfig?.projectId}
                    />
                ))}
                <Box mt={2}>
                    <Button variant="contained" color="primary" onClick={handleSave}>
                        Save Changes
                    </Button>
                    {firebaseConfig && firebaseConfig.projectId && (
                        <Button variant="outlined" color="secondary" onClick={handleDelete} sx={{ marginLeft: '10px' }}>
                            Delete
                        </Button>
                    )}
                </Box>
            </ModalContent>
        </Modal>
    );
};

export default FirebaseConfigModal;
