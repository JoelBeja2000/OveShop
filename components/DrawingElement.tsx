
import React from 'react';
import { DrawingStroke, Point } from '../src/domain/types';

interface DrawingElementProps {
  stroke: DrawingStroke;
  /** The virtual canvas width used by the coordinate system. Defaults to 1000. */
  canvasWidth?: number;
  /** The virtual canvas height. Defaults to canvasWidth (square). */
  canvasHeight?: number;
}

export const DrawingElement: React.FC<DrawingElementProps> = ({ stroke, canvasWidth, canvasHeight }) => {
  const getPathData = (points: Point[]) => {
    if (points.length === 0) return '';
    const first = points[0];
    let path = `M ${first.x} ${first.y}`;
    for (let i = 1; i < points.length; i++) {
       path += ` L ${points[i].x} ${points[i].y}`;
    }
    return path;
  };

  // Use the provided canvas dimensions, or detect from point values
  const w = canvasWidth ?? 1000;
  const h = canvasHeight ?? w;

  return (
    <svg
      width="100%"
      height="100%"
      viewBox={`0 0 ${w} ${h}`}
      preserveAspectRatio="none"
      className="absolute inset-0 pointer-events-none overflow-visible"
      style={{ display: 'block' }}
    >
      {stroke.segments.map((seg, idx) => (
        <g key={idx}>
          <path
            d={getPathData(seg.points)}
            stroke={seg.color}
            strokeWidth={seg.width}
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
            vectorEffect="non-scaling-stroke"
            style={{ 
              opacity: seg.opacity,
              filter: seg.type === 'highlighter' ? 'blur(1px)' : 'none'
            }}
          />
        </g>
      ))}
    </svg>
  );
};
