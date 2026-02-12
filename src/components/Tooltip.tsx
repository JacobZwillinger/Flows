import { Assignment } from '../types';
import { formatHHMMSS } from '../utils/timeUtils';

interface TooltipProps {
  assignment: Assignment;
  x: number;
  y: number;
}

export default function Tooltip({ assignment, x, y }: TooltipProps) {
  const startFormatted = formatHHMMSS(new Date(assignment.start));
  const endFormatted = formatHHMMSS(new Date(assignment.end));

  return (
    <div
      style={{
        position: 'fixed',
        left: x,
        top: y,
        transform: 'translate(-50%, -100%)',
        backgroundColor: '#333',
        color: 'white',
        padding: '8px 12px',
        borderRadius: 4,
        pointerEvents: 'none',
        zIndex: 9999,
        fontSize: 13,
        lineHeight: 1.4,
        whiteSpace: 'nowrap',
      }}
    >
      <div style={{ fontWeight: 'bold', marginBottom: 4 }}>{assignment.title}</div>
      <div>{startFormatted}–{endFormatted}</div>
      <div>{assignment.status}</div>
    </div>
  );
}
