import { useState, useRef, useCallback, useEffect } from 'react';
import { Day, Assignment, Category } from '../types';
import Timeline from './Timeline';
import MissionPanel from './MissionPanel';
import Tooltip from './Tooltip';

interface ScheduleViewerProps {
  day: Day;
  assignments: Assignment[];
  allAssignments: Assignment[];
  categories: Category[];
  selectedAssignmentId: string | null;
  onSelectAssignment: (id: string | null) => void;
  cellOverview: boolean;
}

const ROW_HEIGHT = 40;
const ROW_HEIGHT_CELL = 108;
const HEADER_HEIGHT = 30;

export default function ScheduleViewer({
  day,
  assignments,
  allAssignments,
  categories,
  selectedAssignmentId,
  onSelectAssignment,
  cellOverview,
}: ScheduleViewerProps) {
  const [tooltip, setTooltip] = useState<{
    assignmentId: string;
    eventIndex?: number;
    x: number;
    y: number;
  } | null>(null);

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewportHeight, setViewportHeight] = useState(600);

  const handleTooltipShow = useCallback((
    assignmentId: string,
    x: number,
    y: number,
    eventIndex?: number,
  ) => {
    setTooltip({ assignmentId, x, y, eventIndex });
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

  const effectiveRowHeight = cellOverview
    ? ROW_HEIGHT_CELL
    : ROW_HEIGHT;

  const workerScrollOffset = Math.max(0, scrollTop - HEADER_HEIGHT);

  return (
    <div style={{ height: '100%', position: 'relative', overflow: 'hidden' }}>
      <div
        ref={scrollContainerRef}
        style={{
          height: '100%',
          overflow: 'auto',
          position: 'relative',
          display: 'flex',
        }}
        onScroll={handleScroll}
      >
        <MissionPanel
          assignments={assignments}
          categories={categories}
          rowHeight={effectiveRowHeight}
          headerHeight={HEADER_HEIGHT}
          cellOverview={cellOverview}
          day={day}
        />

        {/* Timeline */}
        <div style={{ flex: 1, minWidth: 0 }}>
          <Timeline
            day={day}
            assignments={assignments}
            rowHeight={effectiveRowHeight}
            headerHeight={HEADER_HEIGHT}
            cellOverview={cellOverview}
            selectedAssignmentId={selectedAssignmentId}
            onSelectAssignment={onSelectAssignment}
            onTooltipShow={handleTooltipShow}
            onTooltipHide={handleTooltipHide}
            scrollTop={workerScrollOffset}
            viewportHeight={viewportHeight}
          />
        </div>
      </div>

      {tooltipAssignment && tooltip && (
        <Tooltip
          assignment={tooltipAssignment}
          eventIndex={tooltip.eventIndex}
          allAssignments={allAssignments}
          x={tooltip.x}
          y={tooltip.y}
        />
      )}
    </div>
  );
}
