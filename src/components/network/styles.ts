import { StylesheetCSS } from "cytoscape";

export const networkStyles: StylesheetCSS[] = [
  {
    selector: 'node',
    css: {
      'background-color': '#E5E7EB', // Fallback background color
      'label': 'data(label)',
      'color': '#666',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'text-margin-y': 10,
      'font-size': 14,
      'width': 50, // Adjust size if needed
      'height': 50, // Adjust size if needed
      'border-width': 3,
      'border-color': '#E5E7EB',
      'shape': 'ellipse',
      'background-image': 'data(icon)', // Use node's icon as background image
      'background-fit': 'cover', // Ensure the image covers the node
    },
  },
  {
    selector: 'edge',
    css: {
      'width': 2,
      'line-color': '#94A3B8',
      'opacity': 0.6,
      'curve-style': 'bezier',
      'target-arrow-shape': 'triangle',
      'target-arrow-color': '#94A3B8',
      'arrow-scale': 0.8,
    },
  },
  {
    selector: 'node[status = "healthy"]',
    css: {
      'background-color': '#10B981',
      'border-color': '#059669',
    },
  },
  {
    selector: 'node[status = "compromised"]',
    css: {
      'background-color': '#EF4444',
      'border-color': '#DC2626',
    },
  },
  {
    selector: 'node[status = "isolated"]',
    css: {
      'background-color': '#F59E0B',
      'border-color': '#D97706',
      'border-style': 'dashed',
    },
  },
  {
    selector: 'node[status = "restored"]',
    css: {
      'background-color': '#6366F1',
      'border-color': '#4F46E5',
    },
  },
  {
    selector: ':selected',
    css: {
      'border-width': 4,
      'border-color': '#3B82F6',
      'overlay-opacity': 0.2,
      'overlay-color': '#3B82F6',
    },
  },
];