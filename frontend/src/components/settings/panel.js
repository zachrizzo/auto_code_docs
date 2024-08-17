import React, { useState } from 'react';
import { Popover, Typography, FormControlLabel, Switch, Select, MenuItem, Box, Button } from '@mui/material';

const SettingsPanel = ({ anchorEl, onClose, open, settings, handleToggle, handleChange }) => {
    return (
        <Popover
            open={open}
            anchorEl={anchorEl}
            onClose={onClose}
            anchorOrigin={{
                vertical: 'bottom',
                horizontal: 'right',
            }}
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
        >
            <Box sx={{ p: 2, width: 300 }}>
                <Typography variant="h6">Settings</Typography>

                <FormControlLabel
                    control={
                        <Switch
                            checked={settings.autoGetDocs}
                            onChange={() => handleToggle('autoGetDocs')}
                            color="primary"
                        />
                    }
                    label="Auto Get Docs"
                />

                <Typography sx={{ mt: 2 }}>Length of Docs</Typography>
                <Select
                    value={settings.docLength}
                    onChange={(e) => handleChange('docLength', e.target.value)}
                    fullWidth
                >
                    {[...Array(10).keys()].map((num) => (
                        <MenuItem key={num + 1} value={num + 1}>
                            {num + 1} Sentence{num > 0 ? 's' : ''}
                        </MenuItem>
                    ))}
                </Select>

                <FormControlLabel
                    control={
                        <Switch
                            checked={settings.runLocally}
                            onChange={() => handleToggle('runLocally')}
                            color="primary"
                        />
                    }
                    label="Run Locally"
                    sx={{ mt: 2 }}
                />

                <Button variant="contained" color="primary" onClick={onClose} sx={{ mt: 2 }}>
                    Close
                </Button>
            </Box>
        </Popover>
    );
};

export default SettingsPanel;
