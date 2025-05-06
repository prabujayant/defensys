import { Node } from '../types/node';

let nodeCounter = 5; // Start after existing mock nodes

export function generateNode(): Node {
  const id = String(nodeCounter++);
  return {
    id,
    name: `Node ${id}`,
    status: 'healthy',
    metrics: {
      latency: Math.floor(Math.random() * 50) + 10,
      resourceUsage: Math.random() * 0.3,
      anomalyScore: Math.random() * 0.2,
    },
    lastUpdated: new Date().toISOString(),
    predictions: [],
    comments: [],
  };
}

// Function to reset the nodeCounter
export function resetNodeCounter() {
  nodeCounter = 5; // Reset counter to its initial value
}