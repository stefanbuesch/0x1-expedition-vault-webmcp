/**
 * Expedition map layout engine — pure functions for computing node positions,
 * SVG dimensions, and edge paths from map data.
 */

type MapNode = { id: string; row: number; column: number }; // thin local adapter; engine body ported from /frontend/

export const LAYOUT = {
  iconSize: 52,
  assetSize: 80,
  rowHeight: 180,
  columnWidth: 160,
  paddingX: 100,
  paddingY: 140,
};

export type NodePositions = Map<string, { x: number; y: number }>;

export type MapLayoutRuntimeOptions = {
  seed?: number;
};

function hashString(value: string): number {
  let hash = 0x811c9dc5;
  for (let i = 0; i < value.length; i += 1) {
    hash ^= value.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function mixSeed(...values: number[]): number {
  let hash = 0x811c9dc5;
  for (const value of values) {
    hash ^= value >>> 0;
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

function seededRandom(seed: number): number {
  let t = (seed >>> 0) + 0x6d2b79f5;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

function signedRandom(seed: number): number {
  return seededRandom(seed) * 2 - 1;
}

type Point = { x: number; y: number };

type EdgeGeometry = {
  path: string;
  length: number;
};

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function cubicApproxLength(p0: Point, p1: Point, p2: Point, p3: Point): number {
  const chord = Math.hypot(p3.x - p0.x, p3.y - p0.y);
  const controlNet =
    Math.hypot(p1.x - p0.x, p1.y - p0.y) +
    Math.hypot(p2.x - p1.x, p2.y - p1.y) +
    Math.hypot(p3.x - p2.x, p3.y - p2.y);
  return (chord + controlNet) * 0.5;
}

function formatPoint(point: Point): string {
  return `${point.x.toFixed(2)} ${point.y.toFixed(2)}`;
}

function buildEdgeGeometry(
  fromId: string,
  toId: string,
  positions: NodePositions,
  options: MapLayoutRuntimeOptions = {}
): EdgeGeometry {
  const from = positions.get(fromId);
  const to = positions.get(toId);
  if (!from || !to) return { path: '', length: 200 };

  const start: Point = {
    x: from.x,
    y: from.y + LAYOUT.iconSize * 0.75
  };
  const end: Point = {
    x: to.x,
    y: to.y - LAYOUT.iconSize * 0.75
  };

  const dx = end.x - start.x;
  const dy = end.y - start.y;
  if (dy <= 0) {
    const straightLength = Math.hypot(dx, dy);
    return {
      path: `M ${formatPoint(start)} L ${formatPoint(end)}`,
      length: straightLength
    };
  }

  const edgeSeed = mixSeed(options.seed ?? 0, hashString(fromId), hashString(toId), Math.round(dx), Math.round(dy));
  const swayLimit = clamp(Math.abs(dx) * 0.42 + 24, 24, 110);
  const sway = signedRandom(edgeSeed ^ 0x9e3779b9) * swayLimit * 0.55;
  const bend = clamp(Math.abs(dy) * (0.19 + seededRandom(edgeSeed ^ 0x85ebca6b) * 0.16), 18, 84);

  if (Math.abs(dx) < 20) {
    const cp1: Point = { x: start.x + sway * 0.15, y: start.y + dy * 0.33 };
    const cp2: Point = { x: end.x - sway * 0.15, y: end.y - dy * 0.33 };
    return {
      path: `M ${formatPoint(start)} C ${formatPoint(cp1)}, ${formatPoint(cp2)}, ${formatPoint(end)}`,
      length: cubicApproxLength(start, cp1, cp2, end)
    };
  }

  const mid: Point = {
    x: start.x + dx * 0.5 + sway,
    y: start.y + dy * 0.5
  };
  const cp1: Point = { x: start.x + dx * 0.08, y: start.y + bend };
  const cp2: Point = { x: mid.x - dx * 0.12, y: mid.y - bend * 0.45 };
  const cp3: Point = { x: mid.x + dx * 0.12, y: mid.y + bend * 0.45 };
  const cp4: Point = { x: end.x - dx * 0.08, y: end.y - bend };

  return {
    path: `M ${formatPoint(start)} C ${formatPoint(cp1)}, ${formatPoint(cp2)}, ${formatPoint(mid)} C ${formatPoint(cp3)}, ${formatPoint(cp4)}, ${formatPoint(end)}`,
    length: cubicApproxLength(start, cp1, cp2, mid) + cubicApproxLength(mid, cp3, cp4, end)
  };
}

export function computeNodePositions(nodes: MapNode[], options: MapLayoutRuntimeOptions = {}): NodePositions {
  const positions: NodePositions = new Map();
  const rows = new Map<number, MapNode[]>();
  const baseSeed = options.seed ?? 0;

  for (const node of nodes) {
    const rowNodes = rows.get(node.row) ?? [];
    rowNodes.push(node);
    rows.set(node.row, rowNodes);
  }

  const sortedRows = Array.from(rows.entries())
    .sort((a, b) => a[0] - b[0])
    .map(([row, rowNodes]) => ({
      row,
      nodes: [...rowNodes].sort((a, b) => a.column - b.column || a.id.localeCompare(b.id))
    }));

  const maxNodesInRow = Math.max(...sortedRows.map((entry) => entry.nodes.length));
  const totalWidth = maxNodesInRow * LAYOUT.columnWidth + LAYOUT.paddingX * 2;

  for (const rowEntry of sortedRows) {
    const rowNodes = rowEntry.nodes;
    const columns = rowNodes.map((node) => node.column);
    const minColumn = Math.min(...columns);
    const maxColumn = Math.max(...columns);
    const rowSpan = Math.max(LAYOUT.columnWidth, (rowNodes.length - 1) * LAYOUT.columnWidth);
    const startX = (totalWidth - rowSpan) / 2;

    rowNodes.forEach((node, index) => {
      const normalizedColumn = maxColumn === minColumn
        ? (rowNodes.length === 1 ? 0.5 : index / (rowNodes.length - 1))
        : (node.column - minColumn) / (maxColumn - minColumn);
      const baseX = startX + normalizedColumn * rowSpan;
      const nodeSeed = mixSeed(baseSeed, rowEntry.row, index, hashString(node.id));
      const jitterX = signedRandom(nodeSeed ^ 0x7f4a7c15) * 16;
      const jitterY = signedRandom(nodeSeed ^ 0x94d049bb) * 9;
      positions.set(node.id, {
        x: baseX + jitterX,
        y: LAYOUT.paddingY + node.row * LAYOUT.rowHeight + jitterY,
      });
    });
  }

  return positions;
}

export function computeSvgDimensions(nodes: MapNode[]): { width: number; height: number } {
  const maxRow = Math.max(...nodes.map(n => n.row));
  const rows = new Map<number, MapNode[]>();

  for (const node of nodes) {
    const rowNodes = rows.get(node.row) ?? [];
    rowNodes.push(node);
    rows.set(node.row, rowNodes);
  }

  const maxNodesInRow = Math.max(...Array.from(rows.values()).map(r => r.length));

  return {
    width: Math.max(500, maxNodesInRow * LAYOUT.columnWidth + LAYOUT.paddingX * 2),
    height: (maxRow + 1) * LAYOUT.rowHeight + LAYOUT.paddingY * 2,
  };
}

/** S-curve bezier path between two map nodes. */
export function getEdgePath(
  fromId: string,
  toId: string,
  positions: NodePositions,
  options: MapLayoutRuntimeOptions = {}
): string {
  return buildEdgeGeometry(fromId, toId, positions, options).path;
}

/** Approximate bezier path length (for animation calculations). */
export function getPathLength(
  fromId: string,
  toId: string,
  positions: NodePositions,
  options: MapLayoutRuntimeOptions = {}
): number {
  return buildEdgeGeometry(fromId, toId, positions, options).length;
}
