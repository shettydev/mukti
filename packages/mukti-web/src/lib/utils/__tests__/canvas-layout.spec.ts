import { describe, expect, it } from '@jest/globals';

import type { CanvasNode, LayoutConfig } from '@/types/canvas-visualization.types';

import { DEFAULT_LAYOUT } from '@/types/canvas-visualization.types';

import {
  calculateInsightPosition,
  calculateNextColumnY,
  generateLayout,
  getInsightNodeId,
  getNextInsightIndex,
  getRootNodeId,
  getSoilNodeId,
  isInsightNode,
  isRootNode,
  isSeedNode,
  isSoilNode,
  parseNodeId,
  SEED_NODE_ID,
} from '../canvas-layout';

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

const minimalProblem = { roots: [], seed: 'test problem', soil: [] };

function makeNode(
  id: string,
  type: string,
  x = 0,
  y = 0,
  extra: Record<string, unknown> = {}
): CanvasNode {
  return {
    data: { isExplored: false, label: id, ...extra } as CanvasNode['data'],
    id,
    position: { x, y },
    type: type as CanvasNode['type'],
  };
}

// ---------------------------------------------------------------------------
// ID helpers
// ---------------------------------------------------------------------------

describe('getInsightNodeId', () => {
  it('returns insight-{index}', () => {
    expect(getInsightNodeId(0)).toBe('insight-0');
    expect(getInsightNodeId(5)).toBe('insight-5');
  });
});

describe('getRootNodeId', () => {
  it('returns root-{index}', () => {
    expect(getRootNodeId(0)).toBe('root-0');
    expect(getRootNodeId(3)).toBe('root-3');
  });
});

describe('getSoilNodeId', () => {
  it('returns soil-{index}', () => {
    expect(getSoilNodeId(0)).toBe('soil-0');
    expect(getSoilNodeId(7)).toBe('soil-7');
  });
});

// ---------------------------------------------------------------------------
// Node type guards
// ---------------------------------------------------------------------------

describe('isInsightNode', () => {
  it('returns true for insight-* ids', () => {
    expect(isInsightNode('insight-0')).toBe(true);
    expect(isInsightNode('insight-99')).toBe(true);
  });
  it('returns false for non-insight ids', () => {
    expect(isInsightNode('root-0')).toBe(false);
    expect(isInsightNode('seed')).toBe(false);
    expect(isInsightNode('soil-0')).toBe(false);
  });
});

describe('isRootNode', () => {
  it('returns true for root-* ids', () => {
    expect(isRootNode('root-0')).toBe(true);
  });
  it('returns false for non-root ids', () => {
    expect(isRootNode('soil-0')).toBe(false);
    expect(isRootNode('seed')).toBe(false);
  });
});

describe('isSeedNode', () => {
  it('returns true only for the exact seed id', () => {
    expect(isSeedNode('seed')).toBe(true);
  });
  it('returns false for anything else', () => {
    expect(isSeedNode('root-0')).toBe(false);
    expect(isSeedNode('soil-0')).toBe(false);
    expect(isSeedNode('seedy')).toBe(false);
  });
});

describe('isSoilNode', () => {
  it('returns true for soil-* ids', () => {
    expect(isSoilNode('soil-0')).toBe(true);
  });
  it('returns false for non-soil ids', () => {
    expect(isSoilNode('root-0')).toBe(false);
    expect(isSoilNode('seed')).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// parseNodeId
// ---------------------------------------------------------------------------

describe('parseNodeId', () => {
  it('parses the seed node', () => {
    expect(parseNodeId('seed')).toEqual({ type: 'seed' });
  });

  it('parses root nodes with index', () => {
    expect(parseNodeId('root-0')).toEqual({ index: 0, type: 'root' });
    expect(parseNodeId('root-12')).toEqual({ index: 12, type: 'root' });
  });

  it('parses soil nodes with index', () => {
    expect(parseNodeId('soil-3')).toEqual({ index: 3, type: 'soil' });
  });

  it('parses insight nodes with index', () => {
    expect(parseNodeId('insight-7')).toEqual({ index: 7, type: 'insight' });
  });

  it('returns null for unknown node ids', () => {
    expect(parseNodeId('unknown-99')).toBeNull();
    expect(parseNodeId('')).toBeNull();
    expect(parseNodeId('root-abc')).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// SEED_NODE_ID constant
// ---------------------------------------------------------------------------

describe('SEED_NODE_ID', () => {
  it('is the string "seed"', () => {
    expect(SEED_NODE_ID).toBe('seed');
  });
});

// ---------------------------------------------------------------------------
// calculateNextColumnY
// ---------------------------------------------------------------------------

describe('calculateNextColumnY', () => {
  const config: LayoutConfig = { ...DEFAULT_LAYOUT };

  it('returns center Y offset when the column is empty', () => {
    const y = calculateNextColumnY([], config);
    expect(y).toBe(config.centerY + config.seedEstimatedHeight / 2);
  });

  it('returns one spacing unit below the bottommost node', () => {
    const nodes = [makeNode('root-0', 'root', 0, 200), makeNode('root-1', 'root', 0, 400)];
    const y = calculateNextColumnY(nodes, config);
    expect(y).toBe(400 + config.nodeVerticalSpacing);
  });

  it('correctly identifies the bottommost node regardless of array order', () => {
    const nodes = [makeNode('root-1', 'root', 0, 400), makeNode('root-0', 'root', 0, 200)];
    const y = calculateNextColumnY(nodes, config);
    expect(y).toBe(400 + config.nodeVerticalSpacing);
  });
});

// ---------------------------------------------------------------------------
// calculateInsightPosition
// ---------------------------------------------------------------------------

describe('calculateInsightPosition', () => {
  it('places the first insight directly below the parent at INSIGHT_OFFSET distance', () => {
    const parent = makeNode('seed', 'seed', 500, 300);
    const position = calculateInsightPosition(parent, []);

    // Base angle is PI/2 (pointing downward), with no siblings → offset = 0
    // cos(PI/2) ≈ 0, sin(PI/2) = 1
    expect(position.x).toBeCloseTo(500, 0);
    expect(position.y).toBeCloseTo(300 + 150, 0); // 150 = INSIGHT_OFFSET
  });

  it('spreads subsequent insights around an arc below the parent', () => {
    const parent = makeNode('seed', 'seed', 500, 300);
    const sibling = makeNode('insight-0', 'insight', 500, 450, { parentNodeId: 'seed' });

    const position1 = calculateInsightPosition(parent, []);
    const position2 = calculateInsightPosition(parent, [sibling]);

    // The two positions should differ
    expect(position1.x).not.toBe(position2.x);
  });

  it('only counts siblings that share the same parentNodeId', () => {
    const parent = makeNode('root-0', 'root', 100, 200);
    const unrelatedSibling = makeNode('insight-0', 'insight', 0, 0, { parentNodeId: 'soil-0' });

    const position = calculateInsightPosition(parent, [unrelatedSibling]);

    // unrelated sibling shouldn't count, so angle offset is 0
    expect(position.x).toBeCloseTo(100, 0);
    expect(position.y).toBeCloseTo(200 + 150, 0);
  });
});

// ---------------------------------------------------------------------------
// getNextInsightIndex
// ---------------------------------------------------------------------------

describe('getNextInsightIndex', () => {
  it('returns 0 when there are no insight nodes', () => {
    const nodes = [makeNode('seed', 'seed'), makeNode('root-0', 'root')];
    expect(getNextInsightIndex(nodes)).toBe(0);
  });

  it('returns max index + 1 from existing insight nodes', () => {
    const nodes = [
      makeNode('seed', 'seed'),
      makeNode('insight-0', 'insight'),
      makeNode('insight-3', 'insight'),
    ];
    expect(getNextInsightIndex(nodes)).toBe(4);
  });
});

// ---------------------------------------------------------------------------
// generateLayout
// ---------------------------------------------------------------------------

describe('generateLayout', () => {
  it('generates a seed node at the center', () => {
    const { nodes } = generateLayout(minimalProblem);
    const seed = nodes.find((n) => n.id === 'seed');

    expect(seed).toBeDefined();
    expect(seed?.type).toBe('seed');
    expect(seed?.position.x).toBe(DEFAULT_LAYOUT.centerX);
    expect(seed?.position.y).toBe(DEFAULT_LAYOUT.centerY);
  });

  it('generates no soil or root nodes when arrays are empty', () => {
    const { edges, nodes } = generateLayout(minimalProblem);

    expect(nodes.filter((n) => n.type === 'soil')).toHaveLength(0);
    expect(nodes.filter((n) => n.type === 'root')).toHaveLength(0);
    expect(edges).toHaveLength(0);
  });

  it('generates one soil node per item and connects it to seed', () => {
    const { edges, nodes } = generateLayout({ ...minimalProblem, soil: ['budget', 'deadline'] });

    const soilNodes = nodes.filter((n) => n.type === 'soil');
    expect(soilNodes).toHaveLength(2);
    expect(soilNodes[0].id).toBe('soil-0');
    expect(soilNodes[1].id).toBe('soil-1');

    const soilEdges = edges.filter((e) => e.target.startsWith('soil-'));
    expect(soilEdges).toHaveLength(2);
    soilEdges.forEach((e) => expect(e.source).toBe('seed'));
  });

  it('generates one root node per item and connects it to seed', () => {
    const { edges, nodes } = generateLayout({
      ...minimalProblem,
      roots: ['assumption A', 'assumption B'],
    });

    const rootNodes = nodes.filter((n) => n.type === 'root');
    expect(rootNodes).toHaveLength(2);

    const rootEdges = edges.filter((e) => e.target.startsWith('root-'));
    expect(rootEdges).toHaveLength(2);
    rootEdges.forEach((e) => expect(e.source).toBe('seed'));
  });

  it('places soil nodes in the left column and root nodes in the right column', () => {
    const { nodes } = generateLayout({
      roots: ['root'],
      seed: 'seed',
      soil: ['context'],
    });

    const soilNode = nodes.find((n) => n.id === 'soil-0')!;
    const rootNode = nodes.find((n) => n.id === 'root-0')!;
    const seedNode = nodes.find((n) => n.id === 'seed')!;

    // Soil is to the left of seed, root is to the right
    expect(soilNode.position.x).toBeLessThan(seedNode.position.x);
    expect(rootNode.position.x).toBeGreaterThan(seedNode.position.x);
  });

  it('centres columns vertically around the seed', () => {
    const { nodes } = generateLayout({
      roots: ['r0', 'r1', 'r2'],
      seed: 'problem',
      soil: [],
    });

    const rootYs = nodes.filter((n) => n.type === 'root').map((n) => n.position.y);
    const avgY = rootYs.reduce((s, y) => s + y, 0) / rootYs.length;
    const seedCenterY = DEFAULT_LAYOUT.centerY + DEFAULT_LAYOUT.seedEstimatedHeight / 2;

    expect(avgY).toBeCloseTo(seedCenterY, 0);
  });

  it('respects a custom layout config', () => {
    const customConfig: LayoutConfig = {
      ...DEFAULT_LAYOUT,
      centerX: 1000,
      centerY: 500,
    };

    const { nodes } = generateLayout(minimalProblem, customConfig);
    const seed = nodes.find((n) => n.id === 'seed')!;

    expect(seed.position.x).toBe(1000);
    expect(seed.position.y).toBe(500);
  });

  it('generates unique edge ids', () => {
    const { edges } = generateLayout({
      roots: ['r0', 'r1'],
      seed: 'seed',
      soil: ['s0', 's1'],
    });

    const ids = edges.map((e) => e.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
