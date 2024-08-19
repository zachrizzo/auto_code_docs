// CustomEdge.js
import React from 'react';
import { EdgeText, getBezierPath } from 'reactflow';
import { Box } from '@mui/material';

function CustomEdge({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
}) {
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        sourcePosition,
        targetX,
        targetY,
        targetPosition,
    });

    return (
        <>
            <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={edgePath}
            />
            <EdgeText
                x={labelX}
                y={labelY}
                label={
                    <Box
                        sx={{
                            backgroundColor: 'white',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            fontSize: '10px',
                        }}
                    >
                        {data?.label}
                    </Box>
                }
            />
        </>
    );
}

export default CustomEdge;
