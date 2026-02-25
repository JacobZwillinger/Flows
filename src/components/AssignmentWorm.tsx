import React, { useId } from 'react';
import { MissionEventType } from '../types';

export interface EventPosition {
  x: number;
  endX?: number;            // only for on-station range events
  type: MissionEventType;
  fuelLbs?: number;
  linkedAssignmentId?: string;
  dmpiCount?: number;
  eventIndex: number;
}

interface AssignmentWormProps {
  x: number;
  y: number;
  width: number;
  height: number;
  isSelected: boolean;
  color: string;
  label: string;
  events: EventPosition[];
  onClick: () => void;
  onBodyMouseEnter: (event: React.MouseEvent) => void;
  onEventMouseEnter: (eventIndex: number, event: React.MouseEvent) => void;
  onMouseLeave: () => void;
}

// ── Icons (centered at cx, cy) ───────────────────────────────────────────────

/** Fuel pump body (pump dispenses downward — tanker offloading) */
function FuelPumpDown({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* pump body */}
      <rect x={cx - 5} y={cy - 8} width={10} height={9} rx={1.5} fill="#4ADE80" />
      {/* top display bump */}
      <rect x={cx - 3} y={cy - 12} width={6} height={4} rx={1} fill="#4ADE80" opacity={0.8} />
      {/* down-arrow caret */}
      <polygon points={`${cx - 5},${cy + 2} ${cx + 5},${cy + 2} ${cx},${cy + 9}`} fill="#4ADE80" />
    </g>
  );
}

/** Fuel pump (pump receives upward — strike/CAP receiving) */
function FuelPumpUp({ cx, cy }: { cx: number; cy: number }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* up-arrow caret */}
      <polygon points={`${cx - 5},${cy - 1} ${cx + 5},${cy - 1} ${cx},${cy - 9}`} fill="#FACC15" />
      {/* pump body */}
      <rect x={cx - 5} y={cy + 1} width={10} height={9} rx={1.5} fill="#FACC15" />
      {/* top display bump */}
      <rect x={cx - 3} y={cy + 10} width={6} height={4} rx={1} fill="#FACC15" opacity={0.8} />
    </g>
  );
}

/** Bomb icon — DMPI */
function BombIcon({ cx, cy, color = '#EF4444' }: { cx: number; cy: number; color?: string }) {
  return (
    <g style={{ pointerEvents: 'none' }}>
      {/* body */}
      <ellipse cx={cx} cy={cy + 2} rx={5} ry={7} fill={color} />
      {/* nose cone */}
      <polygon points={`${cx},${cy - 10} ${cx - 3},${cy - 5} ${cx + 3},${cy - 5}`} fill={color} />
      {/* fuse */}
      <line x1={cx} y1={cy - 10} x2={cx - 3.5} y2={cy - 13} stroke={color} strokeWidth={1.5} />
      {/* fins */}
      <polygon points={`${cx - 3.5},${cy + 7} ${cx - 7},${cy + 11} ${cx - 0.5},${cy + 7}`} fill={color} opacity={0.75} />
      <polygon points={`${cx + 3.5},${cy + 7} ${cx + 7},${cy + 11} ${cx + 0.5},${cy + 7}`} fill={color} opacity={0.75} />
    </g>
  );
}

// ── DMPI group clustering ────────────────────────────────────────────────────

interface DmpiGroup {
  cx: number;
  totalDmpi: number;
  representativeIndex: number;
}

function groupDmpiEvents(strikeEvents: EventPosition[], threshold = 16): DmpiGroup[] {
  if (strikeEvents.length === 0) return [];
  const sorted = [...strikeEvents].sort((a, b) => a.x - b.x);
  const groups: DmpiGroup[] = [];

  for (const ev of sorted) {
    const last = groups[groups.length - 1];
    if (last && Math.abs(ev.x - last.cx) <= threshold) {
      last.totalDmpi += ev.dmpiCount ?? 1;
      // Keep representative index as the first in the group
    } else {
      groups.push({
        cx: ev.x,
        totalDmpi: ev.dmpiCount ?? 1,
        representativeIndex: ev.eventIndex,
      });
    }
  }
  return groups;
}

// ── Main component ───────────────────────────────────────────────────────────

export default function AssignmentWorm({
  x,
  y,
  width,
  height,
  isSelected,
  color,
  label,
  events,
  onClick,
  onBodyMouseEnter,
  onEventMouseEnter,
  onMouseLeave,
}: AssignmentWormProps) {
  const clipId = useId();
  const minWidth = 4;
  const effectiveWidth = Math.max(width, minWidth);
  const rx = Math.min(6, height / 2);
  const cy = y + height / 2;

  // Separate event types
  const onStationEvents = events.filter(e => e.type === 'on-station');
  const pointEvents = events.filter(e => e.type !== 'on-station');

  // Clamp a value to worm horizontal bounds
  const clampX = (v: number) => Math.max(x, Math.min(x + effectiveWidth, v));

  // Text clip: leave room before the first point event icon
  const textPadding = 6;
  const firstPointX = pointEvents.length > 0
    ? Math.min(...pointEvents.map(e => e.x)) - 9
    : x + effectiveWidth;
  const textClipEndX = Math.min(firstPointX, x + effectiveWidth - textPadding);
  const textClipWidth = Math.max(0, textClipEndX - (x + textPadding));
  const showLabel = effectiveWidth > 22 && height >= 8 && textClipWidth > 16;
  const showEvents = height >= 10;

  // Group DMPI events by proximity
  const strikeEvents = pointEvents.filter(e => e.type === 'strike');
  const nonStrikePointEvents = pointEvents.filter(e => e.type !== 'strike');
  const dmpiGroups = groupDmpiEvents(strikeEvents);

  return (
    <g
      data-worm="true"
      style={{
        cursor: 'pointer',
        filter: isSelected ? 'drop-shadow(0 0 4px rgba(255,255,255,0.6))' : 'none',
      }}
      onClick={(e) => { e.stopPropagation(); onClick(); }}
      onMouseEnter={onBodyMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      <defs>
        {/* Text clip — stops before first event */}
        <clipPath id={`${clipId}-text`}>
          <rect x={x + textPadding} y={y} width={textClipWidth} height={height} />
        </clipPath>
        {/* Worm shape clip — used for on-station bands */}
        <clipPath id={`${clipId}-worm`}>
          <rect x={x} y={y} width={effectiveWidth} height={height} rx={rx} />
        </clipPath>
        {/* Diagonal stripe pattern for on-station bands */}
        <pattern
          id={`hatch-${clipId}`}
          patternUnits="userSpaceOnUse"
          width={6}
          height={6}
          patternTransform="rotate(45)"
        >
          <line x1={0} y1={0} x2={0} y2={6} stroke="rgba(255,255,255,0.28)" strokeWidth={2} />
        </pattern>
      </defs>

      {/* ── Worm body ── */}
      <rect
        data-worm="true"
        x={x}
        y={y}
        width={effectiveWidth}
        height={height}
        rx={rx}
        fill={color}
        stroke={isSelected ? '#fff' : 'none'}
        strokeWidth={isSelected ? 2 : 0}
      />

      {/* ── On-station bands (no pointer events — let hover pass to worm body) ── */}
      {showEvents && onStationEvents.map((ev, i) => {
        if (ev.endX === undefined) return null;
        const bandX = clampX(ev.x);
        const bandEndX = clampX(ev.endX);
        const bandW = Math.max(0, bandEndX - bandX);
        if (bandW < 2) return null;
        return (
          <rect
            key={i}
            x={bandX}
            y={y}
            width={bandW}
            height={height}
            fill={`url(#hatch-${clipId})`}
            clipPath={`url(#${clipId}-worm)`}
            style={{ pointerEvents: 'none' }}
          />
        );
      })}

      {/* ── Label text (behind point events, clipped before first icon) ── */}
      {showLabel && (
        <text
          data-worm="true"
          x={x + textPadding}
          y={cy}
          dy="0.35em"
          fill="rgba(255,255,255,0.70)"
          fontSize={10}
          fontFamily="monospace"
          clipPath={`url(#${clipId}-text)`}
          style={{ userSelect: 'none', pointerEvents: 'none' }}
        >
          {label}
        </text>
      )}

      {/* ── Refuel + non-strike point events ── */}
      {showEvents && nonStrikePointEvents.map((ev) => {
        const cx2 = ev.x;
        if (cx2 < x + 6 || cx2 > x + effectiveWidth - 6) return null;
        return (
          <g
            key={ev.eventIndex}
            style={{ cursor: 'crosshair', pointerEvents: 'all' }}
            onMouseEnter={(e) => { e.stopPropagation(); onEventMouseEnter(ev.eventIndex, e); }}
            onMouseLeave={(e) => { e.stopPropagation(); onBodyMouseEnter(e); }}
          >
            {/* Invisible hit area */}
            <rect x={cx2 - 11} y={y} width={22} height={height} fill="transparent" />
            {ev.type === 'refuel-tanker'
              ? <FuelPumpDown cx={cx2} cy={cy} />
              : <FuelPumpUp cx={cx2} cy={cy} />
            }
          </g>
        );
      })}

      {/* ── DMPI / strike events (grouped by proximity) ── */}
      {showEvents && dmpiGroups.map((group) => {
        const cx2 = group.cx;
        if (cx2 < x + 6 || cx2 > x + effectiveWidth - 6) return null;
        const showBadge = group.totalDmpi > 1;
        return (
          <g
            key={`dmpi-${group.representativeIndex}`}
            style={{ cursor: 'crosshair', pointerEvents: 'all' }}
            onMouseEnter={(e) => { e.stopPropagation(); onEventMouseEnter(group.representativeIndex, e); }}
            onMouseLeave={(e) => { e.stopPropagation(); onBodyMouseEnter(e); }}
          >
            {/* Invisible hit area */}
            <rect x={cx2 - 11} y={y} width={22} height={height} fill="transparent" />
            <BombIcon cx={cx2} cy={cy} />
            {showBadge && (
              <>
                <circle cx={cx2 + 9} cy={cy - 9} r={8} fill="#1a1a1a" stroke="#EF4444" strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                <text
                  x={cx2 + 9}
                  y={cy - 9}
                  textAnchor="middle"
                  dy="0.35em"
                  fill="#EF4444"
                  fontSize={9}
                  fontWeight={700}
                  style={{ pointerEvents: 'none', userSelect: 'none' }}
                >
                  {group.totalDmpi > 9 ? '9+' : group.totalDmpi}
                </text>
              </>
            )}
          </g>
        );
      })}
    </g>
  );
}
