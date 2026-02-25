import { Assignment, Category, Day } from '../types';
import { formatHHMMSS } from '../utils/timeUtils';
import { formatFuelLbs } from '../utils/missionUtils';
import { getFlightStatus, getScenarioReferenceTime } from '../utils/flightStatus';

interface TankerDashboardProps {
  day: Day;
  assignments: Assignment[];
  categories: Category[];
  allAssignments: Assignment[];
  onSelectAssignment: (id: string) => void;
}

interface OffloadStop {
  receiverCallsign: string;
  time: Date;
  fuelLbs: number;
}

function getMarginColor(totalFuel: number, marginLbs: number): string {
  if (totalFuel <= 0) return '#9CA3AF';
  const marginPct = (marginLbs / totalFuel) * 100;
  if (marginPct > 10) return '#34D399';
  if (marginPct > 0) return '#FBBF24';
  return '#F87171';
}

function SubwayMap({ stops }: { stops: OffloadStop[] }) {
  if (stops.length === 0) {
    return <div style={{ color: '#6b7280', fontSize: 12 }}>No scheduled offloads.</div>;
  }

  const width = 760;
  const x0 = 24;
  const x1 = width - 24;
  const y = 28;
  const spacing = stops.length === 1 ? 0 : (x1 - x0) / (stops.length - 1);

  return (
    <svg viewBox={`0 0 ${width} 76`} width="100%" height={76} style={{ display: 'block' }}>
      <line x1={x0} y1={y} x2={x1} y2={y} stroke="#374151" strokeWidth={3} />
      {stops.map((stop, i) => {
        const x = x0 + spacing * i;
        return (
          <g key={`${stop.receiverCallsign}-${stop.time.toISOString()}-${i}`}>
            <circle cx={x} cy={y} r={6} fill="#3B82F6" />
            <text x={x} y={12} fill="#9CA3AF" fontSize={11} textAnchor="middle">
              {formatHHMMSS(stop.time)}Z
            </text>
            <text x={x} y={50} fill="#D1D5DB" fontSize={11} textAnchor="middle">
              {stop.receiverCallsign}
            </text>
            <text x={x} y={66} fill="#93C5FD" fontSize={10} textAnchor="middle">
              {formatFuelLbs(stop.fuelLbs)} lbs
            </text>
          </g>
        );
      })}
    </svg>
  );
}

export default function TankerDashboard({
  day,
  assignments,
  categories,
  allAssignments,
  onSelectAssignment,
}: TankerDashboardProps) {
  const tankerCategoryIds = new Set(
    categories
      .filter((c) => c.name.toLowerCase() === 'tanker')
      .map((c) => c.categoryId)
  );

  const tankerDayAssignments = assignments
    .filter((a) => a.dayId === day.dayId && tankerCategoryIds.has(a.categoryId))
    .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());

  const referenceTime = getScenarioReferenceTime(day, tankerDayAssignments);
  const airborneTankers = tankerDayAssignments.filter((a) => {
    const fs = getFlightStatus(a, referenceTime);
    return fs !== 'Pending' && fs !== 'Mission Complete';
  });

  return (
    <div style={{ height: '100%', overflow: 'auto', padding: 16 }}>
      <div style={{ display: 'flex', alignItems: 'baseline', gap: 12, marginBottom: 14 }}>
        <h2 style={{ margin: 0, fontSize: 20, color: '#E5E7EB' }}>Airborne Tanker Dashboard</h2>
        <span style={{ color: '#9CA3AF', fontSize: 12 }}>
          {airborneTankers.length} airborne tanker{airborneTankers.length === 1 ? '' : 's'}
        </span>
      </div>

      {airborneTankers.length === 0 && (
        <div style={{ color: '#9CA3AF', fontSize: 14 }}>No airborne tankers for this day at the current scenario time.</div>
      )}

      <div style={{ display: 'grid', gap: 12 }}>
        {airborneTankers.map((assignment) => {
          const totalFuel = assignment.totalFuelLbs ?? 0;
          const remainingFuel = assignment.remainingFuelLbs ?? 0;
          const reserveFuel = Math.round(totalFuel * 0.15);
          const marginFuel = remainingFuel - reserveFuel;
          const marginColor = getMarginColor(totalFuel, marginFuel);
          const fuelPct = totalFuel > 0 ? Math.round((remainingFuel / totalFuel) * 100) : 0;
          const offloads: OffloadStop[] = assignment.events
            .filter((e) => e.type === 'refuel-tanker')
            .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime())
            .map((e) => {
              const linked = e.linkedAssignmentId
                ? allAssignments.find((a) => a.assignmentId === e.linkedAssignmentId)
                : null;
              return {
                receiverCallsign: linked?.callsign ?? 'UNKNOWN',
                time: new Date(e.time),
                fuelLbs: e.fuelLbs ?? 0,
              };
            });

          return (
            <button
              key={assignment.assignmentId}
              type="button"
              onClick={() => onSelectAssignment(assignment.assignmentId)}
              style={{
                width: '100%',
                textAlign: 'left',
                background: '#171717',
                border: '1px solid #2a2a2a',
                borderRadius: 10,
                padding: 14,
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
                <div style={{ display: 'flex', gap: 8, alignItems: 'baseline' }}>
                  <span style={{ fontSize: 18, fontWeight: 700, color: '#E5E7EB' }}>{assignment.missionNumber}</span>
                  <span style={{ fontSize: 15, color: '#D1D5DB', fontFamily: 'monospace' }}>{assignment.callsign}</span>
                </div>
                <span style={{ fontSize: 12, color: '#9CA3AF' }}>Click for full details</span>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Fuel Remaining</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: '#E5E7EB' }}>
                    {formatFuelLbs(remainingFuel)} lbs <span style={{ color: '#34D399', fontSize: 13 }}>{fuelPct}%</span>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: '#9CA3AF' }}>Margin (vs 15% reserve)</div>
                  <div style={{ fontSize: 16, fontWeight: 700, color: marginColor }}>
                    {marginFuel >= 0 ? '+' : ''}{formatFuelLbs(marginFuel)} lbs
                  </div>
                </div>
              </div>

              <div style={{ fontSize: 11, color: '#9CA3AF', marginBottom: 4 }}>
                Offload subway map (ET + quantity to each receiver)
              </div>
              <SubwayMap stops={offloads} />
            </button>
          );
        })}
      </div>
    </div>
  );
}

