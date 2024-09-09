// ElkNode.js
import React, { useState } from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, Typography, IconButton, Box } from '@mui/material';
import CodeIcon from '@mui/icons-material/Code';
import InfoIcon from '@mui/icons-material/Info';
import AspectRatioIcon from '@mui/icons-material/AspectRatio';
import { useTheme } from '@mui/material/styles';
import { Light as SyntaxHighlighter } from 'react-syntax-highlighter';
import js from 'react-syntax-highlighter/dist/esm/languages/hljs/javascript';
import { docco } from 'react-syntax-highlighter/dist/esm/styles/hljs';

SyntaxHighlighter.registerLanguage('javascript', js);

function ElkNode({ data }) {
    const [expanded, setExpanded] = useState(false);
    const [showInfo, setShowInfo] = useState(false);
    const [resizing, setResizing] = useState(false);

    const theme = useTheme();

    return (
        <Card variant="outlined" sx={{ minWidth: 150, maxWidth: expanded ? 600 : 300 }}>
            <Box sx={{ display: 'flex', justifyContent: 'flex-end', p: 0.5, bgcolor: theme.palette.accentColor.main }}>
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
                        <SyntaxHighlighter language="javascript" style={docco}>
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
    );
}

export default ElkNode;
