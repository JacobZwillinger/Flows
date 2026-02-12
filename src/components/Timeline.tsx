import { useRef, useEffect, useState, useMemo } from 'react';
import { scaleTime } from 'd3-scale';
import { zoom as d3zoom, zoomIdentity } from 'd3-zoom';
import { select } from 'd3-selection';
import { Day, Assignment } from '../types';
import { formatHHMMSS, generateHourMarks } from '../utils/timeUtils';
import AssignmentWorm from './AssignmentWorm';

interface TimelineProps {
  day: Day;
  assignments: Assignment[];
  rowHeight: number;
  headerHeight: number;
  selectedAssignmentId: string | null;
  onSelectAssignment: (id: string | null) => void;
  onTooltipShow: (assignmentId: string, x: number, y: number) => void;
  onTooltipHide: () => void;
  scrollTop: number;
  viewportHeight: number;
}

export default function Timeline({
  day,
  assignments,
  rowHeight,
  headerHeight,
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

  // d3-zoom setup — only zoom on ctrl+wheel or pinch, drag to pan horizontally
  useEffect(() => {
    if (!svgRef.current) return;

    const svg = select(svgRef.current);

    const zoomBehavior = d3zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, maxScale])
      .translateExtent([[0, -Infinity], [containerWidth, Infinity]])
      .filter((event: Event) => {
        // Only zoom on ctrl+wheel (pinch triggers ctrlKey on trackpad)
        if (event.type === 'wheel') {
          return (event as WheelEvent).ctrlKey;
        }
        // Drag to pan — but not from worm clicks
        if (event.type === 'mousedown') {
          const target = event.target as SVGElement;
          if (target.getAttribute('data-worm') || target.closest('[data-worm]')) return false;
          return true;
        }
        // Block double-click zoom
        if (event.type === 'dblclick') return false;
        return true;
      })
      .on('zoom', (event) => {
        setTransform({ k: event.transform.k, x: event.transform.x });
      });

    svg.call(zoomBehavior as any);

    // Prevent default on ctrl+wheel to stop browser zoom
    const wheelHandler = (event: WheelEvent) => {
      if (event.ctrlKey) {
        event.preventDefault();
      }
    };
    svgRef.current.addEventListener('wheel', wheelHandler, { passive: false });

    return () => {
      svg.on('.zoom', null);
      svgRef.current?.removeEventListener('wheel', wheelHandler);
    };
  }, [maxScale, containerWidth]);

  // Virtualization using parent-provided scrollTop/viewportHeight
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
      {/* Sticky header overlay for tick labels */}
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
          {/* Hour gridline tops in header */}
          {hourMarks.map((hourMark, i) => {
            const x = xScale(hourMark);
            return (
              <line
                key={i}
                x1={x}
                y1={0}
                x2={x}
                y2={headerHeight}
                stroke="#333"
                strokeWidth={1}
              />
            );
          })}
          {/* Hour tick labels */}
          {hourMarks.map((hourMark, i) => {
            const x = xScale(hourMark);
            return (
              <text
                key={i}
                x={x}
                y={20}
                fill="#999"
                fontSize={11}
                textAnchor="middle"
                style={{ userSelect: 'none' }}
              >
                {formatHHMMSS(hourMark)}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Main SVG — contains gridlines and worms */}
      <svg
        ref={svgRef}
        width={containerWidth}
        height={assignments.length * rowHeight}
        style={{ display: 'block' }}
      >
        {/* Background */}
        <rect
          width={containerWidth}
          height={assignments.length * rowHeight}
          fill="#1e1e1e"
          onClick={() => onSelectAssignment(null)}
        />

        {/* Hour gridlines (full height) */}
        {hourMarks.map((hourMark, i) => {
          const x = xScale(hourMark);
          return (
            <line
              key={i}
              x1={x}
              y1={0}
              x2={x}
              y2={assignments.length * rowHeight}
              stroke="#333"
              strokeWidth={1}
            />
          );
        })}

        {/* Assignment worms (virtualized) */}
        {visibleAssignments.map((assignment, relIdx) => {
          const idx = startRow + relIdx;
          const startX = xScale(new Date(assignment.start));
          const endX = xScale(new Date(assignment.end));
          const w = endX - startX;
          const y = idx * rowHeight + 4;
          const h = rowHeight - 8;

          return (
            <AssignmentWorm
              key={assignment.assignmentId}
              x={startX}
              y={y}
              width={w}
              height={h}
              isSelected={assignment.assignmentId === selectedAssignmentId}
              color="#4A90E2"
              label={assignment.workerDisplay}
              onClick={() => onSelectAssignment(assignment.assignmentId)}
              onMouseEnter={(event) => {
                const rect = (event.target as SVGRectElement).getBoundingClientRect();
                onTooltipShow(assignment.assignmentId, rect.left + rect.width / 2, rect.top - 10);
              }}
              onMouseLeave={onTooltipHide}
            />
          );
        })}
      </svg>
    </div>
  );
}
