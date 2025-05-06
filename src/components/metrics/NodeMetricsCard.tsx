import React from 'react';
import { Activity, Clock, Cpu } from 'lucide-react';
import { NodeMetrics } from '../../types/node';

interface NodeMetricsCardProps {
  metrics: NodeMetrics;
  lastUpdated: string;
}

export function NodeMetricsCard({ metrics, lastUpdated }: NodeMetricsCardProps) {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4">
      <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Node Metrics</h3>
      
      <div className="space-y-4">
        <div className="flex items-center">
          <Clock className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mr-2" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Latency</p>
            <p className="font-medium text-gray-900 dark:text-white">{metrics.latency}ms</p>
          </div>
        </div>

        <div className="flex items-center">
          <Cpu className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mr-2" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Resource Usage</p>
            <p className="font-medium text-gray-900 dark:text-white">{(metrics.resourceUsage * 100).toFixed(1)}%</p>
          </div>
        </div>

        <div className="flex items-center">
          <Activity className="w-5 h-5 text-indigo-500 dark:text-indigo-400 mr-2" />
          <div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Anomaly Score</p>
            <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full mt-1">
              <div 
                className={`h-full rounded-full ${
                  metrics.anomalyScore > 0.7 ? 'bg-red-500' :
                  metrics.anomalyScore > 0.4 ? 'bg-yellow-500' : 'bg-green-500'
                }`}
                style={{ width: `${metrics.anomalyScore * 100}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400 mt-4">
          Last updated: {new Date(lastUpdated).toLocaleString()}
        </p>
      </div>
    </div>
  );
}