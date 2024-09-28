// src/components/InstallModal.js
import React from 'react';
import { Modal, Box, Typography, CircularProgress, Button } from '@mui/material';


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

function InstallModal({ open, onClose, messages, isCompleted }) {
    return (
        <Modal
            open={open}
            onClose={isCompleted ? onClose : null}
            aria-labelledby="installation-modal-title"
            aria-describedby="installation-modal-description"
        >
            <Box sx={style}>
                <Typography id="installation-modal-title" variant="h6" component="h2" gutterBottom>
                    Downloading AI Models
                </Typography>
                <Box sx={{ maxHeight: 200, overflowY: 'auto', mb: 2 }}>
                    {messages.map((msg, index) => (
                        <Typography key={index} variant="body2">
                            {msg}
                        </Typography>
                    ))}
                </Box>
                {!isCompleted && <CircularProgress />}
                {isCompleted && (
                    <Button variant="contained" color="primary" onClick={onClose}>
                        Close
                    </Button>
                )}
            </Box>
        </Modal>
    );
}

export default InstallModal;
