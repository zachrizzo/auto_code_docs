// src/components/analyzer/mindMap/edges/CustomEdges.jsx
import React from 'react';
import { getBezierPath, EdgeText } from 'reactflow';

export const DeclarationEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
}) => {
    // Validate coordinates
    if (
        typeof sourceX !== 'number' ||
        typeof sourceY !== 'number' ||
        typeof targetX !== 'number' ||
        typeof targetY !== 'number'
    ) {
        console.error(`Invalid coordinates for edge ${id}:`, { sourceX, sourceY, targetX, targetY });
        return null; // Prevent rendering this edge
    }

    // Generate Bezier path
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

    // Validate edge path
    if (!edgePath || edgePath.trim() === '') {
        console.error(`Empty edge path for edge ${id}`);
        return null;
    }

    console.log(`DeclarationEdge Path for ${id}: ${edgePath}`);

    return (
        <>
            <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd="url(#arrowclosed)"
            />
            <text>
                {/* <textPath href={`#${id}`} style={{ fontSize: 12 }} startOffset="50%" textAnchor="middle">
                    Declaration
                </textPath> */}
            </text>
        </>
    );
};

// Repeat similar structure for CallEdge, CrossFileCallEdge, CodependentEdge

export const CallEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
}) => {
    // Validate coordinates
    if (
        typeof sourceX !== 'number' ||
        typeof sourceY !== 'number' ||
        typeof targetX !== 'number' ||
        typeof targetY !== 'number'
    ) {
        console.error(`Invalid coordinates for edge ${id}:`, { sourceX, sourceY, targetX, targetY });
        return null; // Prevent rendering this edge
    }

    // Generate Bezier path
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

    // Validate edge path
    if (!edgePath || edgePath.trim() === '') {
        console.error(`Empty edge path for edge ${id}`);
        return null;
    }

    console.log(`CallEdge Path for ${id}: ${edgePath}`);

    return (
        <>
            <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd="url(#arrowclosed)"
            />
            <text>
                {/* <textPath href={`#${id}`} style={{ fontSize: 12 }} startOffset="50%" textAnchor="middle">
                    Call
                </textPath> */}
            </text>
        </>
    );
};

export const CrossFileCallEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
}) => {
    // Validate coordinates
    if (
        typeof sourceX !== 'number' ||
        typeof sourceY !== 'number' ||
        typeof targetX !== 'number' ||
        typeof targetY !== 'number'
    ) {
        console.error(`Invalid coordinates for edge ${id}:`, { sourceX, sourceY, targetX, targetY });
        return null; // Prevent rendering this edge
    }

    // Generate Bezier path
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

    // Validate edge path
    if (!edgePath || edgePath.trim() === '') {
        console.error(`Empty edge path for edge ${id}`);
        return null;
    }

    console.log(`CrossFileCallEdge Path for ${id}: ${edgePath}`);

    return (
        <>
            <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd="url(#arrowclosed)"
            />
            <text>
                {/* <textPath href={`#${id}`} style={{ fontSize: 12 }} startOffset="50%" textAnchor="middle">
                    Cross File Call
                </textPath> */}
            </text>
        </>
    );
};

export const CodependentEdge = ({
    id,
    sourceX,
    sourceY,
    targetX,
    targetY,
    sourcePosition,
    targetPosition,
    style = {},
    data,
}) => {
    // Validate coordinates
    if (
        typeof sourceX !== 'number' ||
        typeof sourceY !== 'number' ||
        typeof targetX !== 'number' ||
        typeof targetY !== 'number'
    ) {
        console.error(`Invalid coordinates for edge ${id}:`, { sourceX, sourceY, targetX, targetY });
        return null; // Prevent rendering this edge
    }

    // Generate Bezier path
    const [edgePath, labelX, labelY] = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

    // Validate edge path
    if (!edgePath || edgePath.trim() === '') {
        console.error(`Empty edge path for edge ${id}`);
        return null;
    }

    console.log(`CodependentEdge Path for ${id}: ${edgePath}`);

    return (
        <>
            <path
                id={id}
                style={style}
                className="react-flow__edge-path"
                d={edgePath}
                markerEnd="url(#arrowclosed)"
                markerStart="url(#arrowclosed)"
            />
            <text>
                {/* <textPath href={`#${id}`} style={{ fontSize: 12 }} startOffset="50%" textAnchor="middle">
                    Codependent
                </textPath> */}
            </text>
        </>
    );
};
