export type NodeStatus = 'healthy' | 'compromised' | 'isolated' | 'restored';

export interface NodeMetrics {
  latency: number;
  resourceUsage: number;
  anomalyScore: number;
}

export interface HealthPrediction {
  risk: number;
  timeFrame: '1h' | '1d' | '1w';
  reason: string;
  predictedAt: string;
}

export interface NodeComment {
  id: string;
  userId: string;
  userName: string;
  content: string;
  timestamp: string;
  action?: 'isolate' | 'restore';
  status: 'pending' | 'approved' | 'rejected';
}

export interface Node {
  id: string;
  name?: string;
  status: NodeStatus;
  metrics: NodeMetrics;
  lastUpdated: string;
  predictions: HealthPrediction[];
  comments: NodeComment[];
  icon?: string; // Add the icon property here
}