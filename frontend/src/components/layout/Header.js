import React, { useState } from 'react';
import { AppBar, Toolbar, Typography, IconButton, Box } from '@mui/material';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SettingsIcon from '@mui/icons-material/Settings';
import SettingsPanel from '../settings/panel';

const Header = ({ darkMode, toggleDarkMode }) => {
    const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
    const [settings, setSettings] = useState({
        autoGetDocs: true,
        docLength: 5,
        runLocally: true,
    });

    const handleToggleSettings = (event) => {
        setSettingsAnchorEl(event.currentTarget);
    };

    const handleCloseSettings = () => {
        setSettingsAnchorEl(null);
    };

    const handleToggle = (setting) => {
        setSettings((prevSettings) => ({
            ...prevSettings,
            [setting]: !prevSettings[setting],
        }));
    };

    const handleChange = (setting, value) => {
        setSettings((prevSettings) => ({
            ...prevSettings,
            [setting]: value,
        }));
    };

    const settingsOpen = Boolean(settingsAnchorEl);

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
                        My Application
                    </Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <IconButton onClick={toggleDarkMode} color="inherit">
                            {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                        </IconButton>
                        <IconButton onClick={handleToggleSettings} color="inherit">
                            <SettingsIcon />
                        </IconButton>
                    </Box>
                </Toolbar>
            </AppBar>

            <SettingsPanel
                anchorEl={settingsAnchorEl}
                open={settingsOpen}
                onClose={handleCloseSettings}
                settings={settings}
                handleToggle={handleToggle}
                handleChange={handleChange}
            />
        </>
    );
};

export default Header;
