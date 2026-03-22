export const getCytoscapeStyles = () => [
  {
    selector: 'node',
    style: {
      'width': 52,
      'height': 52,
      'label': 'data(label)',
      'text-valign': 'bottom',
      'text-halign': 'center',
      'font-size': '9px',
      'font-family': 'JetBrains Mono, monospace',
      'color': '#94a3b8',
      'text-margin-y': 6,
      'border-width': 2,
      'transition-property': 'background-color, border-color, width, height',
      'transition-duration': '0.3s',
    },
  },
  {
    selector: 'node[type="target"]',
    style: {
      'width': 70,
      'height': 70,
      'background-color': '#1e3a5f',
      'border-color': '#3b82f6',
      'border-width': 3,
      'color': '#60a5fa',
      'font-weight': 'bold',
    },
  },
  {
    selector: 'node[risk="CRITICAL"]',
    style: {
      'background-color': '#450a0a',
      'border-color': '#ef4444',
      'border-width': 3,
    },
  },
  {
    selector: 'node[risk="HIGH"]',
    style: {
      'background-color': '#431407',
      'border-color': '#f97316',
      'border-width': 2,
    },
  },
  {
    selector: 'node[risk="MEDIUM"]',
    style: {
      'background-color': '#422006',
      'border-color': '#f59e0b',
      'border-width': 2,
    },
  },
  {
    selector: 'node[risk="LOW"]',
    style: {
      'background-color': '#052e16',
      'border-color': '#22c55e',
      'border-width': 2,
    },
  },
  {
    selector: 'node[risk="SAFE"]',
    style: {
      'background-color': '#052e16',
      'border-color': '#10b981',
      'border-width': 2,
    },
  },
  {
    selector: 'node[type="contract"]',
    style: {
      'shape': 'diamond',
    },
  },
  {
    selector: 'edge',
    style: {
      'width': 1.5,
      'line-color': '#1e2847',
      'target-arrow-color': '#1e2847',
      'target-arrow-shape': 'triangle',
      'curve-style': 'bezier',
      'opacity': 0.7,
    },
  },
  {
    selector: 'edge[type="SENT_TO"]',
    style: {
      'line-color': '#3b82f6',
      'target-arrow-color': '#3b82f6',
      'width': 1.5,
    },
  },
  {
    selector: 'edge[type="SWAPPED"]',
    style: {
      'line-color': '#8b5cf6',
      'target-arrow-color': '#8b5cf6',
      'line-style': 'dashed',
    },
  },
  {
    selector: 'edge[type="INTERACTED_WITH"]',
    style: {
      'line-color': '#06b6d4',
      'target-arrow-color': '#06b6d4',
      'line-style': 'dotted',
    },
  },
  {
    selector: 'edge[type="APPROVED"]',
    style: {
      'line-color': '#f59e0b',
      'target-arrow-color': '#f59e0b',
      'line-style': 'dashed',
    },
  },
  {
    selector: 'node:selected',
    style: {
      'border-width': 4,
      'border-color': '#f8fafc',
      'overlay-color': '#3b82f6',
      'overlay-opacity': 0.1,
    },
  },
  {
    selector: 'node.highlighted',
    style: {
      'border-color': '#fbbf24',
      'border-width': 3,
    },
  },
  {
    selector: 'node.dimmed',
    style: {
      'opacity': 0.25,
    },
  },
  {
    selector: 'edge.dimmed',
    style: {
      'opacity': 0.1,
    },
  },
]

export const LAYOUT_CONFIG = {
  name: 'cose',
  idealEdgeLength: 120,
  nodeOverlap: 20,
  refresh: 20,
  fit: true,
  padding: 30,
  randomize: false,
  componentSpacing: 100,
  nodeRepulsion: 450000,
  edgeElasticity: 100,
  nestingFactor: 5,
  gravity: 80,
  numIter: 1000,
  initialTemp: 200,
  coolingFactor: 0.95,
  minTemp: 1.0,
}
