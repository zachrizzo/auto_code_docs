// BorderedTreeView.jsx
import React from 'react';
import { TreeView, TreeItem } from '@mui/lab';
import { Typography } from '@mui/material';
import { ExpandMore, ChevronRight } from '@mui/icons-material';

function BorderedTreeView({ data, onNodeClick }) {
    const renderTree = (nodes) => (
        <TreeItem
            key={nodes.id}
            nodeId={nodes.id}
            label={
                <Typography variant="body2" onClick={() => onNodeClick(nodes.id)} sx={{ cursor: 'pointer' }}>
                    {nodes.label}
                </Typography>
            }
        >
            {Array.isArray(nodes.children)
                ? nodes.children.map((node) => renderTree(node))
                : null}
        </TreeItem>
    );

    const createTreeData = (data) => {
        const treeData = [];

        data.nodes.forEach((node) => {
            if (node.id.startsWith('file-')) {
                const fileNode = {
                    id: node.id,
                    label: node.data.label,
                    children: [],
                };

                // Find all declarations related to this file
                data.edges.forEach((edge) => {
                    if (edge.source === node.id) {
                        const childNode = data.nodes.find((n) => n.id === edge.target);
                        if (childNode) {
                            fileNode.children.push({
                                id: childNode.id,
                                label: childNode.data.label,
                                children: [], // Add more nesting if needed
                            });
                        }
                    }
                });

                treeData.push(fileNode);
            }
        });

        return treeData;
    };

    const treeData = createTreeData(data);

    return (
        <TreeView
            aria-label="code structure"
            defaultCollapseIcon={<ExpandMore />}
            defaultExpandIcon={<ChevronRight />}
            sx={{ height: '100%', flexGrow: 1, overflowY: 'auto', p: 2 }}
        >
            {treeData.map((node) => renderTree(node))}
        </TreeView>
    );
}

export default BorderedTreeView;
