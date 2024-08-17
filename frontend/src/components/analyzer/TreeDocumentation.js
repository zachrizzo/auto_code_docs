import * as React from 'react';
import IndeterminateCheckBoxRoundedIcon from '@mui/icons-material/IndeterminateCheckBoxRounded';
import DisabledByDefaultRoundedIcon from '@mui/icons-material/DisabledByDefaultRounded';
import AddBoxRoundedIcon from '@mui/icons-material/AddBoxRounded';
import { styled, alpha } from '@mui/material/styles';
import { SimpleTreeView } from '@mui/x-tree-view/SimpleTreeView';
import { TreeItem, treeItemClasses } from '@mui/x-tree-view/TreeItem';
import { v4 as uuidv4 } from 'uuid';

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
    const renderTreeItems = React.useCallback((node) => (
        <CustomTreeItem
            key={node.id}
            itemId={node.id}
            label={node.label}
            onClick={() => onNodeClick(node.path, node.id)}
        >
            {node.children && node.children.map((childNode) => renderTreeItems(childNode))}
        </CustomTreeItem>
    ), [onNodeClick]);

    const createTreeData = React.useCallback((data) => {
        const createFunctionNode = (func, path, seenFunctions) => {
            if (seenFunctions.has(func.name)) return null;
            seenFunctions.add(func.name);

            const functionNode = {
                id: uuidv4(),
                label: func.name,
                path: path,
                children: [],
            };

            if (func.nestedFunctions && func.nestedFunctions.length > 0) {
                functionNode.children = func.nestedFunctions
                    .map(nestedFunc => createFunctionNode(nestedFunc, `${path}-${nestedFunc.name}`, seenFunctions))
                    .filter(Boolean);
            }

            return functionNode;
        };

        return Object.entries(data).map(([fileName, fileData]) => {
            const fileChildren = [];
            const seenFunctions = new Set();

            // Handle classes and their methods
            (fileData.classes || []).forEach((classObj) => {
                const classChildren = (classObj.methods || [])
                    .map((method) => createFunctionNode(method, `${fileName}-${classObj.name}-${method.name}`, seenFunctions))
                    .filter(Boolean);

                if (classChildren.length > 0) {
                    fileChildren.push({
                        id: uuidv4(),
                        label: classObj.name,
                        path: `${fileName}-${classObj.name}`,
                        children: classChildren,
                    });
                }
            });

            // Handle top-level functions
            (fileData.functions || []).forEach((func) => {
                const node = createFunctionNode(func, `${fileName}-${func.name}`, seenFunctions);
                if (node) fileChildren.push(node);
            });

            return {
                id: uuidv4(),
                label: fileName,
                path: fileName,
                children: fileChildren,
            };
        });
    }, []);

    const treeData = React.useMemo(() => createTreeData(data), [data, createTreeData]);

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
