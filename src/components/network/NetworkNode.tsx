import React from 'react';
import { Node } from '../../types/node';

interface NetworkNodeProps {
  node: Node;
  onClick: (node: Node) => void;
}

export function NetworkNode({ node, onClick }: NetworkNodeProps) {
  const statusColors = {
    healthy: 'bg-node-healthy',
    compromised: 'bg-node-compromised',
    isolated: 'bg-node-isolated',
    restored: 'bg-node-restored',
  };

  // Check if node is defined and has the 'status' property
  if (!node || !node.id || !node.status) {
    console.error('Invalid node data:', node);
    return null; // Return null to prevent rendering when node is invalid
  }

  return (
    <div
      onClick={() => onClick(node)}
      className={`${statusColors[node.status]} w-10 h-10 rounded-full cursor-pointer 
        flex items-center justify-center text-white font-medium
        ${node.status === 'isolated' ? 'border-2 border-dashed border-gray-400' : ''}`}
    >
      {node.id}
    </div>
  );
}