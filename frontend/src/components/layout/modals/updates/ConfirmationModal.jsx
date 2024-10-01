// src/components/ConfirmationModal.js

import React from 'react';
import { Modal, Box, Typography, Button } from '@mui/material';

const style = {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: 400,
    bgcolor: 'background.paper',
    borderRadius: '8px',
    boxShadow: 24,
    p: 4,
    textAlign: 'center',
};

function ConfirmationModal({ open, onConfirm, onCancel }) {
    return (
        <Modal
            open={open}
            onClose={onCancel}
            aria-labelledby="confirmation-modal-title"
            aria-describedby="confirmation-modal-description"
        >
            <Box sx={style}>
                <Typography id="confirmation-modal-title" variant="h6" component="h2" gutterBottom>
                    Install AI Models
                </Typography>
                <Typography id="confirmation-modal-description" variant="body2" gutterBottom>
                    Some features require AI models to be installed. Do you want to proceed with the installation?
                </Typography>
                <Box sx={{ mt: 3, display: 'flex', justifyContent: 'space-around' }}>
                    <Button variant="contained" color="primary" onClick={onConfirm}>
                        Yes
                    </Button>
                    <Button variant="outlined" color="secondary" onClick={onCancel}>
                        No
                    </Button>
                </Box>
            </Box>
        </Modal>
    );
}

export default ConfirmationModal;
