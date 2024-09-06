// BidirectionalEdge.js
import React from 'react';
import { getBezierPath, EdgeText } from 'reactflow';

function BidirectionalEdge({
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
                style={{ ...style, strokeWidth: 2, stroke: '#00FF00' }}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd="url(#bidirectionalArrowEnd)"
                markerStart="url(#bidirectionalArrowStart)"
            />
            <EdgeText
                x={labelX}
                y={labelY}
                label={data?.label}
                labelStyle={{ fill: '#fff', fontWeight: 700 }}
            />
        </>
    );
}

export default BidirectionalEdge;
