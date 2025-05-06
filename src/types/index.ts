export type NodeStatus = 'healthy' | 'compromised' | 'isolated' | 'restored';

export interface Node {
  id: string;
  status: NodeStatus;
  metrics: {
    latency: number;
    resourceUsage: number;
    anomalyScore: number;
  };
  lastUpdated: string;
}

export interface SimulationSettings {
  nodeThreshold: number;
  recoveryTimeout: number;
  faultInjectionRate: number;
}