// src/components/NavigationDrawer.js

import React from 'react';
import {
    Drawer,
    List,
    ListItem,
    ListItemIcon,
    ListItemText,
    useTheme
} from '@mui/material';

import { Link as RouterLink } from 'react-router-dom';
import HomeIcon from '@mui/icons-material/Home';
import AnalyticsIcon from '@mui/icons-material/Analytics';
import StorageIcon from '@mui/icons-material/Storage';
import PropTypes from 'prop-types';

const NavigationDrawer = ({ open, onClose }) => {
    const theme = useTheme();

    const menuItems = [
        { text: 'Home', icon: <HomeIcon />, path: '/' },
        { text: 'Analyze', icon: <AnalyticsIcon />, path: '/analyze' },
        { text: 'Database', icon: <StorageIcon />, path: '/database' },
    ];

    return (
        <Drawer
            anchor="left"
            open={open}
            onClose={onClose}
            PaperProps={{
                sx: {
                    width: 240,
                    backgroundColor: theme.palette.background.light,
                    // backgroundImage: `linear-gradient(45deg, ${theme.palette.primary.main} 0%, ${theme.palette.secondary.main} 100%)`,
                },
            }}
        >
            <List>
                {menuItems.map((item) => (
                    <ListItem
                        button
                        key={item.text}
                        component={RouterLink}
                        to={item.path}
                        onClick={onClose}
                        sx={{
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                            },
                        }}
                    >
                        <ListItemIcon sx={{ color: theme.palette.text }}>
                            {item.icon}
                        </ListItemIcon>
                        <ListItemText
                            primary={item.text}
                            sx={{ color: theme.palette.text.primary }}
                        />
                    </ListItem>
                ))}
            </List>
        </Drawer>
    );
};

NavigationDrawer.propTypes = {
    open: PropTypes.bool.isRequired,
    onClose: PropTypes.func.isRequired,
};

export default NavigationDrawer;
