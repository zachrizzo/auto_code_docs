// ElkNode.js
import React from 'react';
import { Handle, Position } from 'reactflow';
import { Card, CardContent, Typography } from '@mui/material';

function ElkNode({ data }) {
    return (
        <Card variant="outlined" sx={{ minWidth: 150, maxWidth: 250 }}>
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
