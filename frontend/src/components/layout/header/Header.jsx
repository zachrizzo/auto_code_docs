// src/components/Header.js

import React, { useState } from 'react';
import {
    AppBar,
    Toolbar,
    Typography,
    IconButton,
    Box,
    Tooltip,
    useTheme,
    useMediaQuery,
    Menu,
    MenuItem,
    Divider,
    Stack,
} from '@mui/material';
import { Link as RouterLink } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import Brightness4Icon from '@mui/icons-material/Brightness4';
import Brightness7Icon from '@mui/icons-material/Brightness7';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import SettingsPanel from '../../settings/SettingPanel';
import PropTypes from 'prop-types';
import { Code } from '@mui/icons-material';
import NavigationDrawer from './NavigationDrawer';

const Header = ({ darkMode, toggleDarkMode }) => {
    const [settingsAnchorEl, setSettingsAnchorEl] = useState(null);
    const [mobileMoreAnchorEl, setMobileMoreAnchorEl] = useState(null);
    const [drawerOpen, setDrawerOpen] = useState(false);
    const [settings, setSettings] = useState({
        autoGetDocs: true,
        docLength: 5,
        runLocally: true,
    });

    const isSettingsMenuOpen = Boolean(settingsAnchorEl);
    const isMobileMenuOpen = Boolean(mobileMoreAnchorEl);

    // Responsive design hooks
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const handleToggleSettings = (event) => {
        setSettingsAnchorEl(event.currentTarget);
    };

    const handleCloseSettings = () => {
        setSettingsAnchorEl(null);
    };

    const handleMobileMenuOpen = (event) => {
        setMobileMoreAnchorEl(event.currentTarget);
    };

    const handleMobileMenuClose = () => {
        setMobileMoreAnchorEl(null);
    };

    const handleToggleDrawer = () => {
        setDrawerOpen(!drawerOpen);
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

    const renderMobileMenu = (
        <Menu
            anchorEl={mobileMoreAnchorEl}
            anchorOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
            keepMounted
            transformOrigin={{
                vertical: 'top',
                horizontal: 'right',
            }}
            open={isMobileMenuOpen}
            onClose={handleMobileMenuClose}
        >
            <MenuItem onClick={toggleDarkMode}>
                <IconButton color="inherit">
                    {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                </IconButton>
                <Typography variant="body1">
                    {darkMode ? 'Light Mode' : 'Dark Mode'}
                </Typography>
            </MenuItem>
            <MenuItem onClick={handleToggleSettings}>
                <IconButton color="inherit">
                    <SettingsIcon />
                </IconButton>
                <Typography variant="body1">Settings</Typography>
            </MenuItem>
            <Divider />
            <MenuItem component={RouterLink} to="/" onClick={handleMobileMenuClose}>
                <IconButton color="inherit">
                    <HomeIcon />
                </IconButton>
                <Typography variant="body1">Home</Typography>
            </MenuItem>
        </Menu>
    );

    return (
        <>
            <AppBar position="static">
                <Toolbar>
                    {/* Menu Button */}
                    <IconButton
                        edge="start"
                        color="inherit"
                        aria-label="menu"
                        onClick={handleToggleDrawer}
                        sx={{ mr: 2 }}
                    >
                        <MenuIcon />
                    </IconButton>

                    {/* Logo Section */}
                    <Box
                        component={RouterLink}
                        to="/"
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            textDecoration: 'none',
                            color: 'inherit',
                        }}
                    >
                        <Code sx={{ mr: 1, fontSize: 30 }} />
                        <Tooltip title="Home">
                            <Typography variant="h6" noWrap>
                                Fractal X (beta)
                            </Typography>
                        </Tooltip>
                    </Box>

                    {/* Spacer */}
                    <Box sx={{ flexGrow: 1 }} />

                    {/* Desktop Icons */}
                    {!isMobile && (
                        <Box sx={{ display: 'flex', alignItems: 'center' }}>
                            <Tooltip title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
                                <IconButton onClick={toggleDarkMode} color="inherit">
                                    {darkMode ? <Brightness7Icon /> : <Brightness4Icon />}
                                </IconButton>
                            </Tooltip>
                            <Tooltip title="Settings">
                                <IconButton onClick={handleToggleSettings} color="inherit">
                                    <SettingsIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}

                    {/* Mobile Menu Icon */}
                    {isMobile && (
                        <Box sx={{ display: 'flex' }}>
                            <Tooltip title="Menu">
                                <IconButton
                                    edge="end"
                                    color="inherit"
                                    aria-label="menu"
                                    onClick={handleMobileMenuOpen}
                                >
                                    <MenuIcon />
                                </IconButton>
                            </Tooltip>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            {/* Mobile Menu */}
            {renderMobileMenu}

            {/* Navigation Drawer */}
            <NavigationDrawer open={drawerOpen} onClose={handleToggleDrawer} />

            {/* Settings Panel */}
            <SettingsPanel
                anchorEl={settingsAnchorEl}
                open={isSettingsMenuOpen}
                onClose={handleCloseSettings}
                settings={settings}
                handleToggle={handleToggle}
                handleChange={handleChange}
            />
        </>
    );
};

Header.propTypes = {
    darkMode: PropTypes.bool.isRequired,
    toggleDarkMode: PropTypes.func.isRequired,
};

export default Header;
