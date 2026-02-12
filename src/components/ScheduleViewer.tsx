import { useState, useRef, useCallback, useEffect } from 'react';
import { Day, Assignment } from '../types';
import Timeline from './Timeline';
import Tooltip from './Tooltip';

interface ScheduleViewerProps {
  day: Day;
  assignments: Assignment[];

  selectedAssignmentId: string | null;
  onSelectAssignment: (id: string | null) => void;
}

const ROW_HEIGHT = 40;
const HEADER_HEIGHT = 30;

export default function ScheduleViewer({
  day,
  assignments,
  selectedAssignmentId,
  onSelectAssignment,
}: ScheduleViewerProps) {
  const [tooltip, setTooltip] = useState<{
    assignmentId: string;
    x: number;
    y: number;
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  const handleTooltipShow = useCallback((assignmentId: string, x: number, y: number) => {
    setTooltip({ assignmentId, x, y });
  }, []);

  const handleTooltipHide = useCallback(() => {
    setTooltip(null);
  }, []);

  const handleScroll = useCallback(() => {
    if (scrollContainerRef.current) {
      setScrollTop(scrollContainerRef.current.scrollTop);
    }
  }, []);

  useEffect(() => {
    if (!scrollContainerRef.current) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setViewportHeight(entry.contentRect.height);
      }
    });
    observer.observe(scrollContainerRef.current);
    return () => observer.disconnect();
  }, []);

  const tooltipAssignment = tooltip
    ? assignments.find((a) => a.assignmentId === tooltip.assignmentId) ?? null
    : null;

  const workerScrollOffset = Math.max(0, scrollTop - HEADER_HEIGHT);

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div
        ref={scrollContainerRef}
        style={{ height: '100%', overflow: 'auto', position: 'relative' }}
        onScroll={handleScroll}
      >
        <Timeline
          day={day}
          assignments={assignments}
          rowHeight={ROW_HEIGHT}
          headerHeight={HEADER_HEIGHT}
          selectedAssignmentId={selectedAssignmentId}
          onSelectAssignment={onSelectAssignment}
          onTooltipShow={handleTooltipShow}
          onTooltipHide={handleTooltipHide}
          scrollTop={workerScrollOffset}
          viewportHeight={viewportHeight}
        />
      </div>

      {tooltipAssignment && tooltip && (
        <Tooltip
          assignment={tooltipAssignment}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  );
}
