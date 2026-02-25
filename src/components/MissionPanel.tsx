import type { ReactNode } from 'react';
import { Assignment, Category, Day } from '../types';
import { shortCallsign, formatFuelLbs } from '../utils/missionUtils';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import CrisisAlertIcon from '@mui/icons-material/CrisisAlert';
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
  allAssignments?: Assignment[];
}

export const PANEL_WIDTH = 220;
export const PANEL_WIDTH_CELL = 260;
const CELL_SUBTEXT_SIZE = 13;
const EVENT_ICON_COLOR = '#D1D5DB';

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

// ── Fuel bar ─────────────────────────────────────────────────────────────────
function FuelBar({ remaining, total }: { remaining: number; total: number }) {
  const pct = total > 0 ? Math.max(0, Math.min(100, (remaining / total) * 100)) : 0;
  const barColor = pct > 50 ? '#4ADE80' : pct > 25 ? '#FACC15' : '#EF4444';
  return (
    <div style={{ width: '100%', height: 6, backgroundColor: '#2a2a2a', borderRadius: 2, overflow: 'hidden', marginTop: 3 }}>
      <div style={{ width: `${pct}%`, height: '100%', backgroundColor: barColor, borderRadius: 2 }} />
    </div>
  );
}

function InlineIcon({ children }: { children: ReactNode }) {
  return (
    <span style={{ display: 'inline-flex', verticalAlign: 'text-bottom', marginRight: 4 }}>
      {children}
    </span>
  );
}

// ── Row cards (cell overview) ─────────────────────────────────────────────────
function TankerCard({ assignment, allAssignments }: { assignment: Assignment; allAssignments: Assignment[] }) {
  const { totalFuelLbs = 0, remainingFuelLbs = 0 } = assignment;
  const pct = totalFuelLbs > 0 ? Math.round((remainingFuelLbs / totalFuelLbs) * 100) : 0;
  const receiverEvents = assignment.events.filter(e => e.type === 'refuel-tanker');
  const receiverCallsigns = receiverEvents
    .map(e => {
      const rec = e.linkedAssignmentId ? allAssignments.find(a => a.assignmentId === e.linkedAssignmentId) : null;
      return rec ? rec.callsign : '?';
    })
    .join(', ');
  const fuelColor = pct > 50 ? '#4ADE80' : pct > 25 ? '#FACC15' : '#EF4444';

  return (
    <div style={{ padding: '2px 10px 4px 12px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <FuelBar remaining={remainingFuelLbs} total={totalFuelLbs} />
      <div style={{ fontSize: CELL_SUBTEXT_SIZE, color: '#888', marginTop: 2, lineHeight: 1.4 }}>
        {formatFuelLbs(remainingFuelLbs)} / {formatFuelLbs(totalFuelLbs)} lbs
        <span style={{ color: fuelColor, marginLeft: 5, fontWeight: 700 }}>{pct}%</span>
      </div>
      <div style={{ fontSize: CELL_SUBTEXT_SIZE, marginTop: 1, lineHeight: 1.4 }}>
        {receiverEvents.length > 0
          ? (
            <span style={{ color: '#666' }}>
              <InlineIcon><LocalGasStationIcon sx={{ fontSize: 14, color: EVENT_ICON_COLOR }} /></InlineIcon>
              {receiverEvents.length}x recv: <span style={{ color: '#888' }}>{receiverCallsigns}</span>
            </span>
          )
          : <span style={{ color: '#3a3a3a' }}>No receivers</span>
        }
      </div>
    </div>
  );
}

function StrikeCard({ assignment, allAssignments }: { assignment: Assignment; allAssignments: Assignment[] }) {
  const { dmpiTotal = 0, dmpiHit = 0 } = assignment;
  const tankerEvent = assignment.events.find(e => e.type === 'refuel-receiver');
  const tanker = tankerEvent?.linkedAssignmentId
    ? allAssignments.find(a => a.assignmentId === tankerEvent.linkedAssignmentId)
    : null;
  const hitPct = dmpiTotal > 0 ? dmpiHit / dmpiTotal : 0;
  const hitColor = hitPct > 0.8 ? '#4CAF50' : hitPct > 0.5 ? '#FF9800' : '#F44336';

  return (
    <div style={{ padding: '2px 10px 4px 12px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ fontSize: CELL_SUBTEXT_SIZE, color: hitColor, marginTop: 2, lineHeight: 1.4, fontWeight: 600 }}>
        <InlineIcon><CrisisAlertIcon sx={{ fontSize: 14, color: EVENT_ICON_COLOR }} /></InlineIcon>
        {dmpiHit}/{dmpiTotal} DMPIs
        <span style={{ color: '#555', fontWeight: 400, marginLeft: 5 }}>({dmpiTotal - dmpiHit} miss)</span>
      </div>
      <div style={{ fontSize: CELL_SUBTEXT_SIZE, color: '#666', marginTop: 1, lineHeight: 1.4 }}>
        {tanker
          ? (
            <>
              <InlineIcon><LocalGasStationIcon sx={{ fontSize: 14, color: EVENT_ICON_COLOR }} /></InlineIcon>
              AAR: <span style={{ color: '#888' }}>{tanker.callsign}</span>
            </>
          )
          : <span style={{ color: '#3a3a3a' }}>No AAR</span>
        }
      </div>
    </div>
  );
}

function CAPCard({ assignment, allAssignments }: { assignment: Assignment; allAssignments: Assignment[] }) {
  const { onStationMinutes = 0, threatContacts = 0, interceptsCompleted = 0 } = assignment;
  const tankerEvent = assignment.events.find(e => e.type === 'refuel-receiver');
  const tanker = tankerEvent?.linkedAssignmentId
    ? allAssignments.find(a => a.assignmentId === tankerEvent.linkedAssignmentId)
    : null;
  const interceptPct = threatContacts > 0 ? interceptsCompleted / threatContacts : 0;
  const interceptColor = threatContacts === 0 ? '#555'
    : interceptPct > 0.7 ? '#4CAF50'
    : interceptPct > 0.4 ? '#FF9800' : '#F44336';

  return (
    <div style={{ padding: '2px 10px 4px 12px', display: 'flex', flexDirection: 'column', gap: 0 }}>
      <div style={{ fontSize: CELL_SUBTEXT_SIZE, color: '#88bb88', marginTop: 2, lineHeight: 1.4 }}>
        On-station: <span style={{ fontWeight: 600 }}>{onStationMinutes}m</span>
      </div>
      <div style={{ fontSize: CELL_SUBTEXT_SIZE, color: interceptColor, lineHeight: 1.4, marginTop: 1 }}>
        <InlineIcon><CrisisAlertIcon sx={{ fontSize: 14, color: EVENT_ICON_COLOR }} /></InlineIcon>
        {interceptsCompleted}/{threatContacts} intercepts
      </div>
      {tanker && (
        <div style={{ fontSize: CELL_SUBTEXT_SIZE, color: '#666', lineHeight: 1.4, marginTop: 1 }}>
          <InlineIcon><LocalGasStationIcon sx={{ fontSize: 14, color: EVENT_ICON_COLOR }} /></InlineIcon>
          AAR: <span style={{ color: '#888' }}>{tanker.callsign}</span>
        </div>
      )}
    </div>
  );
}

export default function MissionPanel({
  day,
  assignments,
  categories,
  rowHeight,
  headerHeight,
  cellOverview = false,
  allAssignments = [],
}: MissionPanelProps) {
  const getCategoryName = (categoryId: string) =>
    categories.find(c => c.categoryId === categoryId)?.name ?? '?';

  const panelWidth = cellOverview ? PANEL_WIDTH_CELL : PANEL_WIDTH;
  const scenarioReferenceTime = getScenarioReferenceTime(day, assignments);

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
      </div>

      {/* Mission rows */}
      {assignments.map((assignment) => {
        const catName = getCategoryName(assignment.categoryId);
        const healthColor = getStatusColor(assignment.status);
        const typeColor = getTypeColor(catName);
        const flightStatus = getFlightStatus(assignment, scenarioReferenceTime);
        const flightStatusColor = getFlightStatusColor(flightStatus);
        const sc = shortCallsign(assignment.callsign);

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
              <div style={{ padding: '0 10px 0 12px', fontSize: 12, color: flightStatusColor, fontWeight: 700, lineHeight: 1.3 }}>
                {flightStatus}
              </div>

              {/* Detail section */}
              {catName === 'Tanker' && <TankerCard assignment={assignment} allAssignments={allAssignments} />}
              {catName === 'Strike' && <StrikeCard assignment={assignment} allAssignments={allAssignments} />}
              {catName === 'CAP' && <CAPCard assignment={assignment} allAssignments={allAssignments} />}
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
              {sc}
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
