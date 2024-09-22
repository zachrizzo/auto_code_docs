// CustomEdges.js
import React from 'react';
import { Position, getBezierPath } from '@xyflow/react';

const foreignObjectSize = 40;

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
    const edgePath = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

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
                <textPath href={`#${id}`} style={{ fontSize: 12 }} startOffset="50%" textAnchor="middle">
                    Declaration
                </textPath>
            </text>
        </>
    );
};

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
    const edgePath = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

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
                <textPath href={`#${id}`} style={{ fontSize: 12 }} startOffset="50%" textAnchor="middle">
                    Call
                </textPath>
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
    const edgePath = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

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
                <textPath href={`#${id}`} style={{ fontSize: 12 }} startOffset="50%" textAnchor="middle">
                    Cross File Call
                </textPath>
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
    const edgePath = getBezierPath({
        sourceX,
        sourceY,
        targetX,
        targetY,
        sourcePosition,
        targetPosition,
    });

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
                <textPath href={`#${id}`} style={{ fontSize: 12 }} startOffset="50%" textAnchor="middle">
                    Codependent
                </textPath>
            </text>
        </>
    );
};
