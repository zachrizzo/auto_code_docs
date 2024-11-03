import React, { useState, useRef, useEffect } from 'react';
import {
    Fab,
    Popover,
    TextField,
    Box,
    Typography,
    IconButton,
    CircularProgress,
    Paper,
    Tooltip,
    Fade,
    useTheme,
    useMediaQuery
} from '@mui/material';
import ChatIcon from '@mui/icons-material/Chat';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import MinimizeIcon from '@mui/icons-material/Minimize';
import OpenInFullIcon from '@mui/icons-material/OpenInFull';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { searchCode } from '../../api/CodeDocumentation';

// Syntax highlighting component
const CodeBlock = ({ code }) => {
    const [copied, setCopied] = useState(false);
    const theme = useTheme();

    const handleCopy = async () => {
        await navigator.clipboard.writeText(code);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <Box sx={{ position: 'relative', my: 1 }}>
            <Paper
                sx={{
                    backgroundColor: theme.palette.mode === 'dark' ? 'grey.900' : 'grey.800',
                    p: 2,
                    borderRadius: 1,
                    position: 'relative',
                    '&:hover .copy-button': {
                        opacity: 1,
                    },
                    borderLeft: `4px solid ${theme.palette.primary.main}`,
                }}
                elevation={3}
            >
                <IconButton
                    className="copy-button"
                    size="small"
                    onClick={handleCopy}
                    sx={{
                        position: 'absolute',
                        top: 8,
                        right: 8,
                        opacity: 0,
                        transition: 'all 0.2s ease-in-out',
                        backgroundColor: 'rgba(255, 255, 255, 0.1)',
                        '&:hover': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            transform: 'scale(1.1)',
                        },
                    }}
                >
                    <Tooltip
                        title={copied ? "Copied!" : "Copy code"}
                        TransitionComponent={Fade}
                        TransitionProps={{ timeout: 300 }}
                    >
                        <ContentCopyIcon fontSize="small" sx={{ color: 'grey.300' }} />
                    </Tooltip>
                </IconButton>
                <Typography
                    component="pre"
                    sx={{
                        fontFamily: 'Consolas, Monaco, "Courier New", monospace',
                        fontSize: '0.875rem',
                        color: 'grey.100',
                        overflowX: 'auto',
                        m: 0,
                        '&::-webkit-scrollbar': {
                            height: 8,
                            bgcolor: 'rgba(0, 0, 0, 0.1)',
                        },
                        '&::-webkit-scrollbar-thumb': {
                            backgroundColor: 'rgba(255, 255, 255, 0.2)',
                            borderRadius: 4,
                            '&:hover': {
                                backgroundColor: 'rgba(255, 255, 255, 0.3)',
                            },
                        },
                    }}
                >
                    <code>{code}</code>
                </Typography>
            </Paper>
        </Box>
    );
};

const ChatMessage = ({ message }) => {
    const isUser = message.sender === 'user';
    const theme = useTheme();

    // Function to detect if text looks like code (contains common programming patterns)
    const looksLikeCode = (text) => {
        const codePatterns = [
            /function\s+\w+\s*\(/,  // function declarations
            /const\s+\w+\s*=/,      // const declarations
            /let\s+\w+\s*=/,        // let declarations
            /class\s+\w+/,          // class declarations
            /import\s+.*from/,      // import statements
            /export\s+default/,      // export statements
            /{\s*return\s+/,        // return statements in blocks
            /=>\s*{/                // arrow functions
        ];
        return codePatterns.some(pattern => pattern.test(text));
    };

    // Split message into parts (regular text and code blocks)
    const parts = message.text.split(/(\`\`\`[\s\S]*?\`\`\`)/g);

    return (
        <Box
            sx={{
                display: 'flex',
                justifyContent: isUser ? 'flex-end' : 'flex-start',
                mb: 2,
            }}
        >
            <Paper
                elevation={1}
                sx={{
                    maxWidth: '85%',
                    p: 2,
                    bgcolor: isUser ? 'primary.main' : 'background.paper',
                    color: isUser ? 'primary.contrastText' : 'text.primary',
                    borderRadius: 2,
                }}
            >
                {parts.map((part, index) => {
                    if (part.startsWith('```') && part.endsWith('```')) {
                        // Extract code without the backticks
                        const code = part.slice(3, -3).trim();
                        return <CodeBlock key={index} code={code} />;
                    }
                    // Auto-detect code-like content even without backticks
                    if (!isUser && looksLikeCode(part)) {
                        return <CodeBlock key={index} code={part} />;
                    }
                    return (
                        <Typography
                            key={index}
                            sx={{
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-word',
                                color: 'inherit', // Inherit color from parent
                                '& a': {
                                    color: isUser ? 'primary.contrastText' : 'primary.main',
                                },
                            }}
                        >
                            {part}
                        </Typography>
                    );
                })}
            </Paper>
        </Box>
    );
};

const ChatBubble = () => {
    const [anchorEl, setAnchorEl] = useState(null);
    const [query, setQuery] = useState('');
    const [chatMessages, setChatMessages] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(null);
    const [isExpanded, setIsExpanded] = useState(false);
    const messagesEndRef = useRef(null);
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [chatMessages]);

    const handleOpen = (event) => {
        setAnchorEl(event.currentTarget);
    };

    const handleClose = () => {
        setAnchorEl(null);
        setIsExpanded(false);
    };

    const handleMinimize = (event) => {
        event.stopPropagation();
        handleClose();
    };

    const handleToggleExpand = (event) => {
        event.stopPropagation();
        setIsExpanded(!isExpanded);
    };

    const formatSearchResult = (result) => {
        const { content, code_preview, metadata, score } = result;
        return `File: ${metadata.file_path}
${metadata.type}: ${metadata.name}
Relevance Score: ${(1 - score).toFixed(2)}

${code_preview ? `\`\`\`
${code_preview}
\`\`\`` : ''}

${content}`;
    };

    const handleSendMessage = async () => {
        if (!query.trim()) return;

        const userMessage = { sender: 'user', text: query };
        setChatMessages(prev => [...prev, userMessage]);
        setQuery('');
        setLoading(true);
        setError(null);

        try {
            const searchResults = await searchCode(query, 3);

            if (searchResults.length === 0) {
                setChatMessages(prev => [...prev, {
                    sender: 'ai',
                    text: "I couldn't find any relevant code matching your query. Could you try rephrasing or being more specific?"
                }]);
                return;
            }

            const formattedResponse = searchResults
                .map(formatSearchResult)
                .join('\n\n---\n\n');

            const aiResponse = {
                sender: 'ai',
                text: formattedResponse
            };

            setChatMessages(prev => [...prev, aiResponse]);
        } catch (err) {
            console.error('Error during code search:', err);
            setError(err.message);
            setChatMessages(prev => [...prev, {
                sender: 'ai',
                text: `Error: ${err.message}. Please try again or rephrase your query.`
            }]);
        } finally {
            setLoading(false);
        }
    };

    const open = Boolean(anchorEl);

    return (
        <Box sx={{ position: 'fixed', bottom: 16, right: 16, zIndex: 1000 }}>
            <Tooltip title="Code Assistant" TransitionComponent={Fade} enterDelay={200}>
                <Fab
                    color="primary"
                    aria-label="chat"
                    onClick={handleOpen}
                    sx={{
                        boxShadow: theme.shadows[8],
                        '&:hover': {
                            transform: 'scale(1.05)',
                            transition: 'transform 0.2s',
                        },
                    }}
                >
                    <ChatIcon />
                </Fab>
            </Tooltip>

            <Popover
                open={open}
                anchorEl={anchorEl}
                onClose={handleClose}
                anchorOrigin={{
                    vertical: 'top',
                    horizontal: 'left',
                }}
                transformOrigin={{
                    vertical: 'bottom',
                    horizontal: 'right',
                }}
                slotProps={{
                    paper: {
                        sx: {
                            width: isExpanded ? '80vw' : (isMobile ? '95vw' : '500px'),
                            height: isExpanded ? '80vh' : '600px',
                            maxWidth: '95vw',
                            maxHeight: '95vh',
                            display: 'flex',
                            flexDirection: 'column',
                            overflow: 'hidden',
                            transition: 'width 0.3s, height 0.3s',
                            boxShadow: theme.shadows[24],
                        }
                    }
                }}
            >
                <Box sx={{
                    p: 2,
                    borderBottom: 1,
                    borderColor: 'divider',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                }}>
                    <Typography variant="h6" sx={{ fontWeight: 500 }}>Code Assistant</Typography>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <IconButton
                            size="small"
                            onClick={handleToggleExpand}
                            sx={{ color: 'inherit' }}
                        >
                            {isExpanded ? <MinimizeIcon /> : <OpenInFullIcon />}
                        </IconButton>
                        <IconButton
                            size="small"
                            onClick={handleMinimize}
                            sx={{ color: 'inherit' }}
                        >
                            <CloseIcon />
                        </IconButton>
                    </Box>
                </Box>

                <Box sx={{
                    flexGrow: 1,
                    overflow: 'auto',
                    p: 3,
                    display: 'flex',
                    flexDirection: 'column',
                    gap: 2,
                    bgcolor: 'background.default',
                }}>
                    {chatMessages.length === 0 && (
                        <Box sx={{
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            height: '100%',
                            color: 'text.secondary',
                            textAlign: 'center',
                            p: 3,
                        }}>
                            <ChatIcon sx={{ fontSize: 48, mb: 2, opacity: 0.5 }} />
                            <Typography variant="h6">Welcome to Code Assistant</Typography>
                            <Typography variant="body2">
                                Ask questions about the codebase and I'll help you find what you're looking for.
                            </Typography>
                        </Box>
                    )}
                    {chatMessages.map((message, index) => (
                        <ChatMessage key={index} message={message} />
                    ))}
                    {loading && (
                        <Box sx={{ display: 'flex', justifyContent: 'center', p: 2 }}>
                            <CircularProgress size={32} />
                        </Box>
                    )}
                    <div ref={messagesEndRef} />
                </Box>

                <Box sx={{
                    p: 2,
                    borderTop: 1,
                    borderColor: 'divider',
                    bgcolor: 'background.paper',
                }}>
                    <Box sx={{
                        display: 'flex',
                        gap: 1,
                        alignItems: 'flex-start',
                    }}>
                        <TextField
                            fullWidth
                            multiline
                            maxRows={4}
                            size="small"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            onKeyPress={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendMessage();
                                }
                            }}
                            placeholder="Ask about the codebase... (Shift + Enter for new line)"
                            disabled={loading}
                            sx={{
                                '& .MuiOutlinedInput-root': {
                                    bgcolor: 'background.paper',
                                },
                            }}
                        />
                        <IconButton
                            color="primary"
                            onClick={handleSendMessage}
                            disabled={loading || !query.trim()}
                            sx={{
                                mt: 0.5,
                                bgcolor: 'primary.main',
                                color: 'primary.contrastText',
                                '&:hover': {
                                    bgcolor: 'primary.dark',
                                },
                                '&.Mui-disabled': {
                                    bgcolor: 'action.disabledBackground',
                                    color: 'action.disabled',
                                },
                            }}
                        >
                            <SendIcon />
                        </IconButton>
                    </Box>
                    {error && (
                        <Typography color="error" variant="caption" sx={{ mt: 1, display: 'block' }}>
                            {error}
                        </Typography>
                    )}
                </Box>
            </Popover>
        </Box>
    );
};

export default ChatBubble;
