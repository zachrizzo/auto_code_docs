import * as React from 'react';
import IndeterminateCheckBoxRoundedIcon from '@mui/icons-material/IndeterminateCheckBoxRounded';
import DisabledByDefaultRoundedIcon from '@mui/icons-material/DisabledByDefaultRounded';
import AddBoxRoundedIcon from '@mui/icons-material/AddBoxRounded';
import { styled, alpha } from '@mui/material/styles';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem';

const CustomTreeItem = styled(TreeItem)(({ theme }) => ({
    [`& .${treeItemClasses.content}`]: {
        padding: theme.spacing(0.5, 1),
        margin: theme.spacing(0.2, 0),
    },
    [`& .${treeItemClasses.iconContainer}`]: {
        '& .close': {
            opacity: 0.3,
        },
    },
    [`& .${treeItemClasses.groupTransition}`]: {
        marginLeft: 15,
        paddingLeft: 18,
        borderLeft: `1px dashed ${alpha(theme.palette.text.primary, 0.4)}`,
    },
}));

function ExpandIcon(props) {
    return <AddBoxRoundedIcon {...props} sx={{ opacity: 0.8 }} />;
}

function CollapseIcon(props) {
    return <IndeterminateCheckBoxRoundedIcon {...props} sx={{ opacity: 0.8 }} />;
}

function EndIcon(props) {
    return <DisabledByDefaultRoundedIcon {...props} sx={{ opacity: 0.3 }} />;
}

export default function BorderedTreeView({ data, onNodeClick }) {
    const renderTreeItems = (node) => (
        <CustomTreeItem
            key={node.id}
            itemId={node.id}
            label={node.label}
            onClick={() => onNodeClick(node.path, node.id)}
        >
            {node.children && node.children.map((childNode) => renderTreeItems(childNode))}
        </CustomTreeItem>
    );

    const createTreeData = (data) => {
        let uniqueCounter = 0;
        const generateUniqueId = () => {
            uniqueCounter++;
            return `unique-${uniqueCounter}`;
        };

        return Object.entries(data).map(([fileName, fileData]) => {
            const fileChildren = [];

            // Add classes and their methods
            (fileData.classes || []).forEach((classObj) => {
                const classChildren = (classObj.methods || []).map((method) => ({
                    id: generateUniqueId(),
                    label: method.name,
                    path: `${fileName}-${classObj.name}-${method.name}`,
                    children: [],
                }));

                fileChildren.push({
                    id: generateUniqueId(),
                    label: classObj.name,
                    path: `${fileName}-${classObj.name}`,
                    children: classChildren,
                });
            });

            // Add functions
            (fileData.functions || []).forEach((func) => {
                fileChildren.push({
                    id: generateUniqueId(),
                    label: func.name,
                    path: `${fileName}-${func.name}`,
                    children: [],
                });
            });

            return {
                id: generateUniqueId(),
                label: fileName,
                path: fileName,
                children: fileChildren,
            };
        });
    };
    const treeData = createTreeData(data);

    return (
        <SimpleTreeView
            aria-label="customized"
            defaultExpandedItems={['1', '3']}
            slots={{
                expandIcon: ExpandIcon,
                collapseIcon: CollapseIcon,
                endIcon: EndIcon,
            }}
            sx={{ overflowX: 'hidden', minHeight: 270, flexGrow: 1, maxWidth: 300 }}
        >
            {treeData.map((node) => renderTreeItems(node))}
        </SimpleTreeView>
    );
}
