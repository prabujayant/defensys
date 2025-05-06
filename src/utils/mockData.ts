import { Node } from '../types/node';

export const mockNodes: Node[] = [
  {
    id: '1',
    name: 'Node 1',
    status: 'healthy',
    metrics: { latency: 10, resourceUsage: 0.3, anomalyScore: 0.1 },
    lastUpdated: new Date().toISOString(),
    predictions: [],
    comments: [],
  },
  {
    id: '2',
    name: 'Node 2',
    status: 'healthy',
    metrics: { latency: 15, resourceUsage: 0.2, anomalyScore: 0.1 },
    lastUpdated: new Date().toISOString(),
    predictions: [],
    comments: [],
  },
  {
    id: '3',
    name: 'Node 3',
    status: 'healthy',
    metrics: { latency: 12, resourceUsage: 0.25, anomalyScore: 0.15 },
    lastUpdated: new Date().toISOString(),
    predictions: [],
    comments: [],
  },
  {
    id: '4',
    name: 'Node 4',
    status: 'healthy',
    metrics: { latency: 16, resourceUsage: 0.5, anomalyScore: 0.9 },
    lastUpdated: new Date().toISOString(),
    predictions: [],
    comments: [],
  },
];