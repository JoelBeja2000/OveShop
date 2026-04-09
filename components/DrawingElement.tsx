import React from 'react';
import { DrawingStroke, Point } from '../src/domain/types';

interface DrawingElementProps {
  stroke: DrawingStroke;
}

export const DrawingElement: React.FC<DrawingElementProps> = ({
  stroke
}) => {
  const renderSegmentPath = (points: Point[]) => {
    if (points.length === 0) return '';
    if (points.length < 3) {
      return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ');
    }
    
    // Quadratic curve smoothing
    let path = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length - 1; i++) {
        const p1 = { x: points[i].x, y: points[i].y };
        const p2 = { x: points[i + 1].x, y: points[i + 1].y };
        const mid = { x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 };
        path += ` Q ${p1.x} ${p1.y} ${mid.x} ${mid.y}`;
    }
    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y}`;
    return path;
  };

  return (
    <svg
      className="absolute inset-0 w-full h-full pointer-events-none overflow-visible"
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
      style={{ position: 'absolute', top: 0, left: 0 }}
    >
      {stroke.segments.map((segment, idx) => {
        const isHighlighter = segment.type === 'highlighter';
        return (
          <path
            key={`${stroke.id}-seg-${idx}`}
            d={renderSegmentPath(segment.points)}
            fill="none"
            stroke={segment.color}
            strokeWidth={segment.width}
            strokeLinecap={isHighlighter ? 'square' : 'round'}
            strokeLinejoin={isHighlighter ? 'miter' : 'round'}
            opacity={segment.opacity}
          />
        );
      })}
    </svg>
  );
};
