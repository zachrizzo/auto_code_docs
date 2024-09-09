// ElkNode.js
import React, { useState, useEffect } from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, Typography, IconButton, Box } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import InfoIcon from '@mui/icons-material/Info';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import { useTheme } from '@mui/material/styles';
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Import languages you want to support
import jsx from 'react-syntax-highlighter/dist/esm/languages/prism/jsx';
import javascript from 'react-syntax-highlighter/dist/esm/languages/prism/javascript';
import python from 'react-syntax-highlighter/dist/esm/languages/prism/python';
import java from 'react-syntax-highlighter/dist/esm/languages/prism/java';
import clike from 'react-syntax-highlighter/dist/esm/languages/prism/clike';

SyntaxHighlighter.registerLanguage('jsx', jsx);
SyntaxHighlighter.registerLanguage('javascript', javascript);
SyntaxHighlighter.registerLanguage('python', python);
SyntaxHighlighter.registerLanguage('java', java);
SyntaxHighlighter.registerLanguage('clike', clike);

// Simple language detection function
function detectLanguage(code, fileName) {
    if (fileName) {
        if (fileName.endsWith('.js') || fileName.endsWith('.jsx')) return 'javascript';
        if (fileName.endsWith('.py')) return 'python';
        if (fileName.endsWith('.java')) return 'java';
    }

    // Simple content-based detection
    if (code.includes('def ') && code.includes(':')) return 'python';
    if (code.includes('function') || code.includes('=>')) return 'javascript';
    if (code.includes('public class')) return 'java';

    return 'clike'; // default to C-like syntax
}

function ElkNode({ data }) {
    const [expanded, setExpanded] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [resizing, setResizing] = useState(false);
    const [language, setLanguage] = useState('javascript');

    const theme = useTheme();

    useEffect(() => {
        if (data.code) {
            const detectedLang = detectLanguage(data.code, data.fileName);
            setLanguage(detectedLang);
        }
    }, [data.code, data.fileName]);

    return (
        <Box sx={{ position: 'relative', minWidth: 150, maxHeight: 150 }} >
            <Box
                sx={{
                    position: 'absolute',
                    top: -20,
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'flex',
                    backgroundColor: theme.palette.background.paper,
                    borderRadius: '16px',
                    padding: '4px',
                    boxShadow: theme.shadows[2],
                    zIndex: 1,
                }}
            >
                <IconButton size="small" onClick={() => setExpanded(!expanded)}>
                    <CodeIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setShowInfo(!showInfo)}>
                    <InfoIcon fontSize="small" />
                </IconButton>
                <IconButton size="small" onClick={() => setResizing(!resizing)}>
                    <AspectRatioIcon fontSize="small" />
                </IconButton>
            </Box>
            <Card variant="outlined" sx={{ width: '100%' }}>
                <CardContent>
                    <div className="handles targets">
                        {data.targetHandles.map((handle) => (
                            <Handle
                                key={handle.id}
                                id={handle.id}
                                type="target"
                                position={Position.Left}
                            />
                        ))}
                    </div>
                    <Typography variant="h6" component="div">
                        {data.label}
                    </Typography>
                    {expanded && (
                        <Box sx={{ mt: 1, maxHeight: 300, overflow: 'auto' }}>
                            <SyntaxHighlighter language={language} style={oneDark}>
                                {data.code || 'No code available'}
                            </SyntaxHighlighter>
                        </Box>
                    )}
                    {showInfo && (
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            {data.info || 'No additional information available'}
                        </Typography>
                    )}
                    <div className="handles sources">
                        {data.sourceHandles.map((handle) => (
                            <Handle
                                key={handle.id}
                                id={handle.id}
                                type="source"
                                position={Position.Right}
                            />
                        ))}
                    </div>
                </CardContent>
            </Card>
        </ Box>
    );
}

export default ElkNode;
