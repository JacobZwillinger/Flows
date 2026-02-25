import React, { useId } from 'react';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import CrisisAlertIcon from '@mui/icons-material/CrisisAlert';
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

const EVENT_ICON_COLOR = '#D1D5DB';
const ICON_HALF = 7;

// ── Icons (centered at cx, cy) ───────────────────────────────────────────────

function FuelPumpIcon({ cx, cy }: { cx: number; cy: number }) {
  return (
    <foreignObject
      x={cx - ICON_HALF}
      y={cy - ICON_HALF}
      width={14}
      height={14}
      style={{ overflow: 'visible', pointerEvents: 'none' }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <LocalGasStationIcon sx={{ fontSize: 14, color: EVENT_ICON_COLOR }} />
      </div>
    </foreignObject>
  );
}

function StrikeIcon({ cx, cy }: { cx: number; cy: number }) {
  return (
    <foreignObject
      x={cx - ICON_HALF}
      y={cy - ICON_HALF}
      width={14}
      height={14}
      style={{ overflow: 'visible', pointerEvents: 'none' }}
    >
      <div
        style={{
          width: 14,
          height: 14,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <CrisisAlertIcon sx={{ fontSize: 14, color: EVENT_ICON_COLOR }} />
      </div>
    </foreignObject>
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
  const textPadding = 8;
  const iconTextClearance = 12;
  const firstPointX = pointEvents.length > 0
    ? Math.min(...pointEvents.map(e => e.x)) - iconTextClearance
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
        if (cx2 < x + ICON_HALF + 4 || cx2 > x + effectiveWidth - ICON_HALF - 4) return null;
        return (
          <g
            key={ev.eventIndex}
            style={{ cursor: 'crosshair', pointerEvents: 'all' }}
            onMouseEnter={(e) => { e.stopPropagation(); onEventMouseEnter(ev.eventIndex, e); }}
            onMouseLeave={(e) => { e.stopPropagation(); onBodyMouseEnter(e); }}
          >
            {/* Invisible hit area */}
            <rect x={cx2 - 11} y={y} width={22} height={height} fill="transparent" />
            {ev.type === 'refuel-tanker' || ev.type === 'refuel-receiver'
              ? <FuelPumpIcon cx={cx2} cy={cy} />
              : null}
          </g>
        );
      })}

      {/* ── DMPI / strike events (grouped by proximity) ── */}
      {showEvents && dmpiGroups.map((group) => {
        const cx2 = group.cx;
        if (cx2 < x + ICON_HALF + 4 || cx2 > x + effectiveWidth - ICON_HALF - 4) return null;
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
            <StrikeIcon cx={cx2} cy={cy} />
            {showBadge && (
              <>
                <circle cx={cx2 + 9} cy={cy - 9} r={8} fill="#1a1a1a" stroke={EVENT_ICON_COLOR} strokeWidth={1.5} style={{ pointerEvents: 'none' }} />
                <text
                  x={cx2 + 9}
                  y={cy - 9}
                  textAnchor="middle"
                  dy="0.35em"
                  fill={EVENT_ICON_COLOR}
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
