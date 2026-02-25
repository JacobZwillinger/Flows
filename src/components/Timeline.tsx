import { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { scaleTime } from 'd3-scale';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { Day, Assignment } from '../types';
import { formatHHMMSS, generateHourMarks } from '../utils/timeUtils';
import { shortCallsign } from '../utils/missionUtils';
import { getFlightStatus, getFlightStatusColor, getScenarioReferenceTime } from '../utils/flightStatus';
import AssignmentWorm from './AssignmentWorm';

interface TimelineProps {
  day: Day;
  assignments: Assignment[];
  rowHeight: number;
  headerHeight: number;
  cellOverview: boolean;
  selectedAssignmentId: string | null;
  onSelectAssignment: (id: string | null) => void;
  onTooltipShow: (assignmentId: string, x: number, y: number, eventIndex?: number) => void;
  onTooltipHide: () => void;
  scrollTop: number;
  viewportHeight: number;
}

export default function Timeline({
  day,
  assignments,
  rowHeight,
  headerHeight,
  cellOverview,
  selectedAssignmentId,
  onSelectAssignment,
  onTooltipShow,
  onTooltipHide,
  scrollTop,
  viewportHeight,
}: TimelineProps) {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(800);
  const [transform, setTransform] = useState({ k: 1, x: 0 });
  const scenarioReferenceTime = useMemo(
    () => getScenarioReferenceTime(day, assignments),
    [day, assignments]
  );

  const dayStart = useMemo(() => new Date(day.start), [day.start]);
  const dayEnd = useMemo(() => new Date(day.end), [day.end]);
  const numHours = useMemo(
    () => (dayEnd.getTime() - dayStart.getTime()) / (1000 * 60 * 60),
    [dayStart, dayEnd]
  );

  const hourMarks = useMemo(() => generateHourMarks(dayStart, dayEnd), [dayStart, dayEnd]);

  const baseXScale = useMemo(
    () => scaleTime().domain([dayStart, dayEnd]).range([0, containerWidth]),
    [dayStart, dayEnd, containerWidth]
  );

  const xScale = useMemo(() => {
    const t = zoomIdentity.translate(transform.x, 0).scale(transform.k);
    return t.rescaleX(baseXScale);
  }, [baseXScale, transform]);

  const maxScale = useMemo(() => {
    const targetPxPerHour = 1000;
    return Math.max(1, (targetPxPerHour * numHours) / containerWidth);
  }, [numHours, containerWidth]);

  // ResizeObserver
  useEffect(() => {
    if (!containerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width);
      }
    });
    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // d3-zoom setup
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);

    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, maxScale])
      .translateExtent([[0, -Infinity], [containerWidth, Infinity]])
      .filter((event: Event) => {
        if (event.type === 'wheel') {
          return (event as WheelEvent).ctrlKey;
        }
        if (event.type === 'mousedown') {
          const target = event.target as SVGElement;
          if (target.getAttribute('data-worm') || target.closest('[data-worm]')) return false;
          return true;
        }
        if (event.type === 'dblclick') return false;
        return true;
      })
      .on('zoom', (event) => {
        setTransform({ k: event.transform.k, x: event.transform.x });
      });

    svg.call(zoomBehavior as any);

    const svgEl = svgRef.current;
    const wheelHandler = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
        return;
      }
      const deltaX = event.shiftKey ? event.deltaY : event.deltaX;
      if (deltaX !== 0) {
        event.preventDefault();
        const currentTransform = select(svgEl).property('__zoom') || zoomIdentity;
        const newX = currentTransform.x - deltaX;
        const newTransform = zoomIdentity.translate(newX, 0).scale(currentTransform.k);
        svg.call(zoomBehavior.transform as any, newTransform);
      }
    };
    svgEl.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      svg.on('.zoom', null);
      svgEl.removeEventListener('wheel', wheelHandler);
    };
  }, [maxScale, containerWidth]);

  const handleSelectAssignment = useCallback((id: string | null) => {
    onSelectAssignment(id);
  }, [onSelectAssignment]);

  // Virtualization
  const buffer = 5;
  const startRow = Math.max(0, Math.floor(scrollTop / rowHeight) - buffer);
  const endRow = Math.min(
    assignments.length,
    Math.ceil((scrollTop + viewportHeight) / rowHeight) + buffer
  );
  const visibleAssignments = assignments.slice(startRow, endRow);

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', position: 'relative' }}
    >
      {/* Sticky header overlay */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: headerHeight,
          backgroundColor: '#1e1e1e',
          borderBottom: '1px solid #333',
          zIndex: 2,
          overflow: 'hidden',
        }}
      >
        <svg width={containerWidth} height={headerHeight} style={{ display: 'block' }}>
          {hourMarks.map((hourMark, i) => {
            const hx = xScale(hourMark);
            return (
              <line key={i} x1={hx} y1={0} x2={hx} y2={headerHeight} stroke="#333" strokeWidth={1} />
            );
          })}
          {hourMarks.map((hourMark, i) => {
            const hx = xScale(hourMark);
            return (
              <text key={i} x={hx} y={20} fill="#999" fontSize={11} textAnchor="middle" style={{ userSelect: 'none' }}>
                {formatHHMMSS(hourMark)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Main SVG */}
      <svg
        ref={svgRef}
        width={containerWidth}
        height={assignments.length * rowHeight}
        style={{ display: 'block' }}
      >
        <rect
          width={containerWidth}
          height={assignments.length * rowHeight}
          fill="#1e1e1e"
          onClick={() => handleSelectAssignment(null)}
        />

        {/* Hour gridlines */}
        {hourMarks.map((hourMark, i) => {
          const hx = xScale(hourMark);
          return (
            <line
              key={i}
              x1={hx} y1={0} x2={hx} y2={assignments.length * rowHeight}
              stroke="#282828" strokeWidth={1}
            />
          );
        })}

        {/* Assignment worms */}
        {visibleAssignments.map((assignment, relIdx) => {
          const idx = startRow + relIdx;
          const startX = xScale(new Date(assignment.start));
          const endX = xScale(new Date(assignment.end));
          const w = endX - startX;
          const rowTop = idx * rowHeight;
          const h = cellOverview
            ? Math.max(0.5, rowHeight - 8)
            : Math.max(0.5, rowHeight);
          const wy = cellOverview
            ? rowTop + 4
            : rowTop;
          const flightStatus = getFlightStatus(assignment, scenarioReferenceTime);
          const color = getFlightStatusColor(flightStatus);

          const sourceEvents = assignment.events ?? [];

          const eventPositions = sourceEvents.map((ev, index) => ({
            x: xScale(new Date(ev.time)),
            endX: ev.endTime ? xScale(new Date(ev.endTime)) : undefined,
            type: ev.type,
            fuelLbs: ev.fuelLbs,
            linkedAssignmentId: ev.linkedAssignmentId,
            dmpiCount: ev.dmpiCount,
            eventIndex: index,
          }));

          const label = `${assignment.missionNumber} ${shortCallsign(assignment.callsign)} ${flightStatus}`;

          return (
            <AssignmentWorm
              key={assignment.assignmentId}
              x={startX}
              y={wy}
              width={w}
              height={h}
              isSelected={assignment.assignmentId === selectedAssignmentId}
              color={color}
              label={label}
              events={eventPositions}
              onClick={() => handleSelectAssignment(assignment.assignmentId)}
              onBodyMouseEnter={(e) => {
                onTooltipShow(assignment.assignmentId, e.clientX, e.clientY - 14, undefined);
              }}
              onEventMouseEnter={(eventIndex, e) => {
                onTooltipShow(assignment.assignmentId, e.clientX, e.clientY - 14, eventIndex);
              }}
              onMouseLeave={onTooltipHide}
            />
          );
        })}
      </svg>
    </div>
  );
}
