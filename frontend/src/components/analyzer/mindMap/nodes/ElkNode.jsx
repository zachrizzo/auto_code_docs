// src/components/analyzer/mindMap/nodes/ElkNode.jsx
import React, { useState, useEffect, useContext } from 'react';
import { Handle, Position } from 'reactflow';
import {
    Card,
    CardContent,
    Typography,
    IconButton,
    Box,
    Collapse,
    Tooltip,
} from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import InfoIcon from '@mui/icons-material/Info';
import { styled } from '@mui/system';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import ClassIcon from '@mui/icons-material/Class';
import FunctionsIcon from '@mui/icons-material/Functions';

import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import clike from 'react-syntax-highlighter/dist/esm/languages/prism/clike';

import NodeClickContext from '../../../../contexts/NodeClickContext'; // Adjust the path as necessary

SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('clike', clike);

function detectLanguage(code, fileName) {
    if (fileName) {
        if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript';
        if (fileName.endsWith('.py')) return 'python';
        if (fileName.endsWith('.java')) return 'java';
    }

    if (code.includes('def ') && code.includes(':')) return 'python';
    if (code.includes('function') || code.includes('=>')) return 'javascript';
    if (code.includes('public class')) return 'java';

    return 'clike';
}

const ExpandMore = styled((props) => {
    const { expand, ...other } = props;
    return <IconButton {...other} />;
})(({ theme, expand }) => ({
    transform: expand ? 'rotate(180deg)' : 'rotate(0deg)',
    marginLeft: 'auto',
    padding: '4px',
    transition: theme.transitions.create('transform', {
        duration: theme.transitions.duration.shortest,
    }),
}));

function ElkNode({ id, data }) {
    const [expanded, setExpanded] = useState(false);
    const [language, setLanguage] = useState('javascript');
    const handleNodeClick = useContext(NodeClickContext);

    useEffect(() => {
        if (data.code) {
            const detectedLang = detectLanguage(data.code, data.fileName);
            setLanguage(detectedLang);
        }
    }, [data.code, data.fileName]);

    let NodeIcon;
    if (data.nodeType === 'file') {
        NodeIcon = InsertDriveFileIcon;
    } else if (data.nodeType === 'class') {
        NodeIcon = ClassIcon;
    } else if (data.nodeType === 'function') {
        NodeIcon = FunctionsIcon;
    } else {
        NodeIcon = CodeIcon;
    }

    // Handle anonymous function names
    const displayName = data.label.startsWith('anonymous_')
        ? data.label.slice(0, 13) + '...'
        : data.label;

    return (
        <Box sx={{ position: 'relative', minWidth: 200 }}>
            {/* Render Target Handle on the left */}
            <Handle
                type="target"
                position={Position.Left}
                id="target" // Single target handle
                style={{ top: '50%', background: '#555' }}
            />

            <Card
                variant="outlined"
                sx={{
                    borderRadius: 2,
                    boxShadow: 3,
                    backgroundColor: 'background.paper',
                }}
            >
                <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box display="flex" alignItems="center" mb={1}>
                        <NodeIcon color="primary" sx={{ mr: 1 }} />
                        <Typography variant="subtitle1" component="div" noWrap>
                            {displayName}
                        </Typography>
                        {/* Button to open the Drawer */}
                        <Tooltip title="View Details">
                            <IconButton
                                size="small"
                                onClick={() => handleNodeClick(id)}
                                sx={{ ml: 1 }}
                            >
                                <InfoIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                    </Box>
                    <Box display="flex" alignItems="center">
                        <Tooltip title={expanded ? 'Hide Code' : 'Show Code'}>
                            <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                                <CodeIcon fontSize="small" />
                            </IconButton>
                        </Tooltip>
                        <Typography variant="caption" color="textSecondary">
                            {expanded ? 'Hide Code' : 'Show Code'}
                        </Typography>
                        <ExpandMore
                            expand={expanded}
                            onClick={() => setExpanded(!expanded)}
                            aria-expanded={expanded}
                            aria-label="show more"
                        >
                            <ExpandMoreIcon />
                        </ExpandMore>
                    </Box>
                    <Collapse in={expanded} timeout="auto" unmountOnExit>
                        <Box mt={2}>
                            <SyntaxHighlighter language={language} style={oneDark}>
                                {data.code || 'No code available'}
                            </SyntaxHighlighter>
                        </Box>
                    </Collapse>
                </CardContent>
            </Card>

            {/* Render Source Handle on the right */}
            <Handle
                type="source"
                position={Position.Right}
                id="source" // Single source handle
                style={{ top: '50%', background: '#555' }}
            />
        </Box>
    );
}

export default ElkNode;
