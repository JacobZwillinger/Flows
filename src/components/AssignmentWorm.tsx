import React, { useId } from 'react';

interface AssignmentWormProps {
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  color: string;
  label: string;
  onClick: () => void;
  onMouseEnter: (event: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

export default function AssignmentWorm({
  x,
  y,
  width,
  height,
  isSelected,
  color,
  label,
  onClick,
  onMouseEnter,
  onMouseLeave,
}: AssignmentWormProps) {
  const minWidth = 4;
  const effectiveWidth = Math.max(width, minWidth);
  const clipId = useId();
  const textPadding = 6;
  const showLabel = effectiveWidth > 20 && height > 12;

  return (
    <g
      data-worm="true"
      style={{
        cursor: 'pointer',
        filter: isSelected ? 'drop-shadow(0 0 4px rgba(255, 255, 255, 0.6))' : 'none',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onClick();
      }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <defs>
        <clipPath id={clipId}>
          <rect x={x + textPadding} y={y} width={Math.max(0, effectiveWidth - textPadding * 2)} height={height} />
        </clipPath>
      </defs>
      <rect
        data-worm="true"
        x={x}
        y={y}
        width={effectiveWidth}
        height={height}
        rx={6}
        fill={color}
        stroke={isSelected ? '#fff' : 'none'}
        strokeWidth={isSelected ? 2 : 0}
      />
      {showLabel && (
        <text
          data-worm="true"
          x={x + textPadding}
          y={y + height / 2}
          dy="0.35em"
          fill="#fff"
          fontSize={11}
          clipPath={`url(#${clipId})`}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {label}
        </text>
      )}
    </g>
  );
}
