/**
 * Advanced Drawing Tools for Chart Analysis
 * Includes: Pitchfork, Channel, Rectangle, Text Annotations
 */

export interface Point {
  time: number;
  price: number;
}

export interface DrawingShape {
  id: string;
  type: 'pitchfork' | 'channel' | 'rectangle' | 'text';
  points: Point[];
  color: string;
  text?: string; // For text annotations
  style?: 'solid' | 'dashed' | 'dotted';
}

/**
 * Calculate Andrew's Pitchfork lines
 * Requires 3 points: pivot, high, low
 */
export function calculatePitchfork(points: Point[]): {
  median: Point[];
  upper: Point[];
  lower: Point[];
} | null {
  if (points.length < 3) return null;

  const [pivot, high, low] = points;

  // Calculate median line (from pivot through midpoint of high-low)
  const midpoint = {
    time: (high.time + low.time) / 2,
    price: (high.price + low.price) / 2,
  };

  // Extend median line
  const medianSlope = (midpoint.price - pivot.price) / (midpoint.time - pivot.time);
  const timeRange = Math.abs(high.time - low.time) * 2;

  const medianLine: Point[] = [
    pivot,
    {
      time: pivot.time + timeRange,
      price: pivot.price + medianSlope * timeRange,
    },
  ];

  // Calculate parallel lines offset by the distance from median to high/low
  const highOffset = high.price - midpoint.price;
  const lowOffset = low.price - midpoint.price;

  const upperLine: Point[] = medianLine.map(p => ({
    time: p.time,
    price: p.price + highOffset,
  }));

  const lowerLine: Point[] = medianLine.map(p => ({
    time: p.time,
    price: p.price + lowOffset,
  }));

  return {
    median: medianLine,
    upper: upperLine,
    lower: lowerLine,
  };
}

/**
 * Calculate parallel channel lines
 * Requires 4 points: 2 for main line, 2 for parallel line
 */
export function calculateChannel(points: Point[]): {
  line1: Point[];
  line2: Point[];
} | null {
  if (points.length < 4) return null;

  const [p1, p2, p3, p4] = points;

  // Calculate slopes
  const slope1 = (p2.price - p1.price) / (p2.time - p1.time);
  const slope2 = (p4.price - p3.price) / (p4.time - p3.time);

  // Use average slope for parallel lines
  const avgSlope = (slope1 + slope2) / 2;

  // Extend lines
  const timeRange = Math.max(
    Math.abs(p2.time - p1.time),
    Math.abs(p4.time - p3.time)
  ) * 1.5;

  const line1: Point[] = [
    { time: p1.time, price: p1.price },
    { time: p1.time + timeRange, price: p1.price + avgSlope * timeRange },
  ];

  const line2: Point[] = [
    { time: p3.time, price: p3.price },
    { time: p3.time + timeRange, price: p3.price + avgSlope * timeRange },
  ];

  return { line1, line2 };
}

/**
 * Calculate rectangle bounds
 * Requires 2 points: top-left and bottom-right
 */
export function calculateRectangle(points: Point[]): {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
} | null {
  if (points.length < 2) return null;

  const [p1, p2] = points;

  const minTime = Math.min(p1.time, p2.time);
  const maxTime = Math.max(p1.time, p2.time);
  const minPrice = Math.min(p1.price, p2.price);
  const maxPrice = Math.max(p1.price, p2.price);

  return {
    topLeft: { time: minTime, price: maxPrice },
    topRight: { time: maxTime, price: maxPrice },
    bottomLeft: { time: minTime, price: minPrice },
    bottomRight: { time: maxTime, price: minPrice },
  };
}

/**
 * Format drawing for display
 */
export function formatDrawingForDisplay(drawing: DrawingShape): string {
  switch (drawing.type) {
    case 'pitchfork':
      return 'Pitchfork';
    case 'channel':
      return 'Parallel Channel';
    case 'rectangle':
      return 'Rectangle';
    case 'text':
      return drawing.text || 'Text';
    default:
      return 'Unknown';
  }
}

/**
 * Generate unique ID for drawing
 */
export function generateDrawingId(): string {
  return `drawing_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

/**
 * Validate drawing points
 */
export function validateDrawingPoints(
  type: DrawingShape['type'],
  points: Point[]
): boolean {
  switch (type) {
    case 'pitchfork':
      return points.length === 3;
    case 'channel':
      return points.length === 4;
    case 'rectangle':
    case 'text':
      return points.length >= 1;
    default:
      return false;
  }
}
