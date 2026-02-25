import { Assignment, Category, Day } from '../types';
import {
  getFlightStatus,
  getFlightStatusColor,
  getScenarioReferenceTime,
} from '../utils/flightStatus';

interface MissionPanelProps {
  day: Day;
  assignments: Assignment[];
  categories: Category[];
  rowHeight: number;
  headerHeight: number;
  cellOverview?: boolean;
}

export const PANEL_WIDTH = 220;
export const PANEL_WIDTH_CELL = 260;

function getStatusColor(status: string): string {
  switch (status) {
    case 'OK': return '#4CAF50';
    case 'AT RISK': return '#FF9800';
    case 'DEGRADED': return '#F44336';
    default: return '#9E9E9E';
  }
}

function getTypeColor(catName: string): string {
  switch (catName) {
    case 'Tanker': return '#5B9BD5';
    case 'Strike': return '#E07B39';
    case 'CAP': return '#4CAF7D';
    default: return '#9E9E9E';
  }
}

export default function MissionPanel({
  day,
  assignments,
  categories,
  rowHeight,
  headerHeight,
  cellOverview = false,
}: MissionPanelProps) {
  const getCategoryName = (categoryId: string) =>
    categories.find(c => c.categoryId === categoryId)?.name ?? '?';

  const panelWidth = cellOverview ? PANEL_WIDTH_CELL : PANEL_WIDTH;
  const scenarioReferenceTime = getScenarioReferenceTime(day, assignments);
  const statusById = new Map(
    assignments.map((a) => [a.assignmentId, getFlightStatus(a, scenarioReferenceTime)])
  );
  const inAirCount = assignments.filter((a) => {
    const fs = statusById.get(a.assignmentId);
    return fs && fs !== 'Pending' && fs !== 'Mission Complete';
  }).length;

  return (
    <div
      style={{
        width: panelWidth,
        flexShrink: 0,
        borderRight: '1px solid #2a2a2a',
        backgroundColor: '#171717',
        position: 'relative',
        zIndex: 1,
      }}
    >
      {/* Sticky header */}
      <div
        style={{
          position: 'sticky',
          top: 0,
          height: headerHeight,
          backgroundColor: '#171717',
          borderBottom: '1px solid #2a2a2a',
          zIndex: 3,
          display: 'flex',
          alignItems: 'center',
          padding: '0 10px',
        }}
      >
        <span style={{ color: '#555', fontSize: 10, fontWeight: 600, letterSpacing: '0.08em', userSelect: 'none' }}>
          {cellOverview ? 'CELL OVERVIEW' : 'MISSION'}
        </span>
        {cellOverview && (
          <span style={{ marginLeft: 'auto', fontSize: 10, color: '#777', fontVariantNumeric: 'tabular-nums' }}>
            {inAirCount}/{assignments.length} in air
          </span>
        )}
      </div>

      {/* Mission rows */}
      {assignments.map((assignment) => {
        const catName = getCategoryName(assignment.categoryId);
        const healthColor = getStatusColor(assignment.status);
        const typeColor = getTypeColor(catName);
        const flightStatus = statusById.get(assignment.assignmentId) ?? 'Pending';
        const flightStatusColor = getFlightStatusColor(flightStatus);

        if (cellOverview) {
          return (
            <div
              key={assignment.assignmentId}
              style={{
                height: rowHeight,
                borderBottom: '1px solid #1c1c1c',
                boxSizing: 'border-box',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-start',
                paddingTop: 6,
                position: 'relative',
                overflow: 'hidden',
              }}
            >
              {/* Status stripe */}
              <div style={{ position: 'absolute', left: 0, top: 6, bottom: 6, width: 3, backgroundColor: flightStatusColor, borderRadius: '0 2px 2px 0' }} />

              {/* Header row: number + full callsign + type badge */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 5, padding: '0 10px 0 12px' }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: '#e8e8e8', fontVariantNumeric: 'tabular-nums', flexShrink: 0 }}>
                  {assignment.missionNumber}
                </span>
                <span style={{ fontSize: 13, color: '#bbb', fontFamily: 'monospace', fontWeight: 600, flexShrink: 0 }}>
                  {assignment.callsign}
                </span>
                <span style={{
                  fontSize: 10, fontWeight: 700, color: typeColor,
                  border: `1px solid ${typeColor}`, borderRadius: 3,
                  padding: '1px 3px', letterSpacing: '0.05em', lineHeight: 1.4, marginLeft: 'auto',
                }}>
                  {catName.toUpperCase()}
                </span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '2px 10px 0 12px' }}>
                <span style={{ fontSize: 12, color: flightStatusColor, fontWeight: 700, lineHeight: 1.3 }}>
                  {flightStatus}
                </span>
                <span style={{ color: '#555' }}>•</span>
                <span style={{ fontSize: 12, color: healthColor, fontWeight: 700, lineHeight: 1.3 }}>
                  {assignment.status}
                </span>
              </div>
            </div>
          );
        }

        // Standard compact row
        return (
          <div
            key={assignment.assignmentId}
            style={{
              height: rowHeight,
              display: 'flex',
              alignItems: 'center',
              padding: '0 10px',
              gap: 7,
              overflow: 'hidden',
              borderBottom: '1px solid #1c1c1c',
              boxSizing: 'border-box',
            }}
          >
            <div style={{ width: 7, height: 7, borderRadius: '50%', backgroundColor: healthColor, flexShrink: 0 }} />
            <span style={{ fontSize: 13, fontWeight: 700, color: '#e8e8e8', flexShrink: 0, fontVariantNumeric: 'tabular-nums' }}>
              {assignment.missionNumber}
            </span>
            <span style={{ fontSize: 11, color: '#999', flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontFamily: 'monospace' }}>
              {assignment.callsign}
            </span>
            <span style={{
              fontSize: 9, fontWeight: 700, color: typeColor,
              border: `1px solid ${typeColor}`, borderRadius: 3,
              padding: '1px 4px', flexShrink: 0,
              letterSpacing: '0.06em', lineHeight: 1.4,
            }}>
              {catName.toUpperCase()}
            </span>
          </div>
        );
      })}
    </div>
  );
}
