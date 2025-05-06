import React from "react";
import { Node } from "../../types/node";

interface TooltipProps {
  position: { x: number; y: number };
  node: Node;
  statusInfo: { color: string; label: string };
  role: string;
}

export const Tooltip: React.FC<TooltipProps> = ({ position, node, statusInfo, role }) => {
  // Format metrics for display
  const formatMetric = (value: number | undefined): string => {
    if (value === undefined) return "N/A";
    return value.toFixed(2);
  };

  return (
    <div 
      className="absolute z-50 bg-gray-800/90 backdrop-blur-sm p-3 rounded-lg shadow-lg border border-indigo-500/30 text-white text-sm w-64"
      style={{ 
        left: `${position.x}px`, 
        top: `${position.y}px`,
        transform: 'translate(-50%, -100%)'
      }}
    >
      <div className="flex items-center justify-between mb-2">
        <h3 className="font-bold">{node.name}</h3>
        <span 
          className="px-2 py-0.5 rounded-full text-xs" 
          style={{ backgroundColor: statusInfo.color }}
        >
          {statusInfo.label}
        </span>
      </div>
      
      <div className="mb-2 text-gray-300 text-xs">
        {role}
      </div>
      
      <div className="grid grid-cols-2 gap-2 mt-2">
        {node.metrics && (
          <>
            <div className="bg-gray-700/50 p-1.5 rounded">
              <div className="text-gray-400 text-xs">Latency</div>
              <div className="font-medium">{formatMetric(node.metrics.latency)} ms</div>
            </div>
            
            <div className="bg-gray-700/50 p-1.5 rounded">
              <div className="text-gray-400 text-xs">CPU Usage</div>
              <div className="font-medium">{formatMetric(node.metrics.resourceUsage * 100)}%</div>
            </div>
            
            <div className="bg-gray-700/50 p-1.5 rounded">
              <div className="text-gray-400 text-xs">Risk Score</div>
              <div className="font-medium">{formatMetric(node.metrics.anomalyScore * 100)}%</div>
            </div>
            
            {node.metrics.memory && (
              <div className="bg-gray-700/50 p-1.5 rounded">
                <div className="text-gray-400 text-xs">Memory</div>
                <div className="font-medium">{node.metrics.memory}</div>
              </div>
            )}
          </>
        )}
      </div>
      
      <div className="text-xs text-gray-400 mt-2">
        Last Updated: {new Date(node.lastUpdated || Date.now()).toLocaleTimeString()}
      </div>
      
      <div className="absolute w-3 h-3 bg-gray-800 border-t border-r border-indigo-500/30 transform rotate-45 left-1/2 -bottom-1.5 -translate-x-1/2"></div>
    </div>
  );
};