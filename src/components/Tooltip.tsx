import { Assignment } from '../types';
import { formatHHMMSS } from '../utils/timeUtils';
import { shortCallsign, formatFuelLbs } from '../utils/missionUtils';

interface TooltipProps {
  assignment: Assignment;
  eventIndex?: number;
  allAssignments: Assignment[];
  x: number;
  y: number;
}

function getStatusColor(status: string): string {
  switch (status) {
    case 'OK': return '#4CAF50';
    case 'AT RISK': return '#FF9800';
    case 'DEGRADED': return '#F44336';
    default: return '#9E9E9E';
  }
}

const baseStyle: React.CSSProperties = {
  position: 'fixed',
  transform: 'translate(-50%, -100%)',
  backgroundColor: '#1e1e1e',
  color: 'white',
  padding: '8px 12px',
  borderRadius: 5,
  pointerEvents: 'none',
  zIndex: 9999,
  fontSize: 12,
  lineHeight: 1.5,
  whiteSpace: 'nowrap',
  border: '1px solid #3a3a3a',
  boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
};

export default function Tooltip({ assignment, eventIndex, allAssignments, x, y }: TooltipProps) {
  const startFormatted = formatHHMMSS(new Date(assignment.start));
  const endFormatted = formatHHMMSS(new Date(assignment.end));
  const statusColor = getStatusColor(assignment.status);
  const sc = shortCallsign(assignment.callsign);

  // ── Event-specific tooltip ────────────────────────────────────────────────
  if (eventIndex !== undefined) {
    const ev = assignment.events[eventIndex];
    if (!ev) return null;

    if (ev.type === 'refuel-tanker') {
      const receiver = ev.linkedAssignmentId
        ? allAssignments.find(a => a.assignmentId === ev.linkedAssignmentId)
        : null;
      return (
        <div style={{ ...baseStyle, left: x, top: y }}>
          <div style={{ color: '#4ADE80', fontWeight: 700, marginBottom: 3 }}>
            ⬇ Fuel Offload
          </div>
          {receiver && (
            <div style={{ color: '#ccc' }}>
              → <span style={{ fontFamily: 'monospace', color: '#fff' }}>{shortCallsign(receiver.callsign)}</span>
              <span style={{ color: '#666' }}> ({receiver.callsign})</span>
            </div>
          )}
          {ev.fuelLbs !== undefined && (
            <div style={{ color: '#aaa' }}>
              {formatFuelLbs(ev.fuelLbs)} lbs
            </div>
          )}
          <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
            {formatHHMMSS(new Date(ev.time))}Z
          </div>
        </div>
      );
    }

    if (ev.type === 'refuel-receiver') {
      const tanker = ev.linkedAssignmentId
        ? allAssignments.find(a => a.assignmentId === ev.linkedAssignmentId)
        : null;
      return (
        <div style={{ ...baseStyle, left: x, top: y }}>
          <div style={{ color: '#FACC15', fontWeight: 700, marginBottom: 3 }}>
            ⬆ Receiving Fuel
          </div>
          {tanker && (
            <div style={{ color: '#ccc' }}>
              ← <span style={{ fontFamily: 'monospace', color: '#fff' }}>{shortCallsign(tanker.callsign)}</span>
              <span style={{ color: '#666' }}> ({tanker.callsign})</span>
            </div>
          )}
          {ev.fuelLbs !== undefined && (
            <div style={{ color: '#aaa' }}>
              +{formatFuelLbs(ev.fuelLbs)} lbs
            </div>
          )}
          <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
            {formatHHMMSS(new Date(ev.time))}Z
          </div>
        </div>
      );
    }

    if (ev.type === 'strike') {
      const count = ev.dmpiCount ?? 1;
      return (
        <div style={{ ...baseStyle, left: x, top: y }}>
          <div style={{ color: '#EF4444', fontWeight: 700, marginBottom: 3 }}>
            💣 DMPI Release
          </div>
          <div style={{ color: '#ccc' }}>
            {count} weapon{count !== 1 ? 's' : ''} released
          </div>
          <div style={{ color: '#666', fontSize: 11, marginTop: 2 }}>
            {formatHHMMSS(new Date(ev.time))}Z
          </div>
        </div>
      );
    }
  }

  // ── General worm-body tooltip ─────────────────────────────────────────────
  return (
    <div style={{ ...baseStyle, left: x, top: y }}>
      <div style={{ fontWeight: 700, marginBottom: 2, display: 'flex', gap: 8, alignItems: 'baseline' }}>
        <span style={{ fontSize: 13 }}>{assignment.missionNumber}</span>
        <span style={{ fontFamily: 'monospace', color: '#aaa', fontWeight: 400 }}>{sc}</span>
        <span style={{ color: '#555', fontWeight: 400, fontSize: 10 }}>{assignment.callsign}</span>
      </div>
      <div style={{ color: '#888', fontSize: 11 }}>{startFormatted}–{endFormatted}Z</div>
      <div style={{ color: statusColor, fontSize: 11, marginTop: 2 }}>{assignment.status}</div>
    </div>
  );
}
