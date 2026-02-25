import { useMemo, useState } from 'react';
import { Assignment, Category, Day } from '../types';
import { formatHHMMSS } from '../utils/timeUtils';
import { formatFuelLbs } from '../utils/missionUtils';
import { FlightStatus, getFlightStatus, getScenarioReferenceTime } from '../utils/flightStatus';

interface TankerDashboardProps {
  day: Day;
  assignments: Assignment[];
  categories: Category[];
  allAssignments: Assignment[];
  onSelectAssignment: (id: string) => void;
}

interface TankerCardData {
  assignment: Assignment;
  flightStatus: FlightStatus;
  totalFuel: number;
  remainingFuel: number;
  reserveFuel: number;
  marginFuel: number;
  fuelPct: number;
  scheduleWindow: string;
  offloads: Array<{
    receiverCallsign: string;
    time: Date;
    fuelLbs: number;
  }>;
}

type TankerFilter = 'all' | 'airborne' | 'scheduled' | 'issues';

function getMarginColor(totalFuel: number, marginLbs: number): string {
  if (totalFuel <= 0) return '#9CA3AF';
  const marginPct = (marginLbs / totalFuel) * 100;
  if (marginPct > 10) return '#34D399';
  if (marginPct > 0) return '#FBBF24';
  return '#F87171';
}

function FuelHealthBar({
  totalFuel,
  remainingFuel,
  reserveFuel,
}: {
  totalFuel: number;
  remainingFuel: number;
  reserveFuel: number;
}) {
  const totalSafe = Math.max(1, totalFuel);
  const remainingPct = Math.max(0, Math.min(100, (remainingFuel / totalSafe) * 100));
  const reservePct = Math.max(0, Math.min(100, (reserveFuel / totalSafe) * 100));
  const reserveMarkerLeft = Math.max(0, Math.min(100, 100 - reservePct));

  return (
    <div>
      <div style={{ position: 'relative', height: 10, borderRadius: 5, background: '#1f2937', overflow: 'hidden' }}>
        <div
          style={{
            width: `${remainingPct}%`,
            height: '100%',
            background: 'linear-gradient(90deg, #4ade80, #22c55e)',
          }}
        />
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: `${reserveMarkerLeft}%`,
            width: 2,
            height: '100%',
            backgroundColor: '#f59e0b',
          }}
        />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4, fontSize: 11, color: '#9CA3AF' }}>
        <span>0</span>
        <span>Reserve</span>
        <span>{formatFuelLbs(totalFuel)} lbs</span>
      </div>
    </div>
  );
}

function SubwaySchedule({ offloads }: { offloads: TankerCardData['offloads'] }) {
  if (offloads.length === 0) {
    return <div style={{ color: '#6b7280', fontSize: 12 }}>No receiver schedule.</div>;
  }

  return (
    <div style={{ display: 'grid', gap: 6 }}>
      {offloads.map((stop, i) => (
        <div
          key={`${stop.receiverCallsign}-${stop.time.toISOString()}-${i}`}
          style={{
            display: 'grid',
            gridTemplateColumns: '72px 1fr auto',
            gap: 8,
            alignItems: 'center',
            background: '#111827',
            border: '1px solid #1f2937',
            borderLeft: '3px solid #3B82F6',
            borderRadius: 6,
            padding: '5px 8px',
          }}
        >
          <span style={{ color: '#9CA3AF', fontFamily: 'monospace', fontSize: 11 }}>
            {formatHHMMSS(stop.time)}Z
          </span>
          <span style={{ color: '#D1D5DB', fontSize: 12, fontWeight: 600 }}>{stop.receiverCallsign}</span>
          <span style={{ color: '#93C5FD', fontSize: 12, fontWeight: 700 }}>{formatFuelLbs(stop.fuelLbs)} lbs</span>
        </div>
      ))}
    </div>
  );
}

export default function TankerDashboard({
  day,
  assignments,
  categories,
  allAssignments,
  onSelectAssignment,
}: TankerDashboardProps) {
  const [filter, setFilter] = useState<TankerFilter>('airborne');

  const tankerCategoryIds = useMemo(
    () => new Set(categories.filter((c) => c.name.toLowerCase() === 'tanker').map((c) => c.categoryId)),
    [categories]
  );

  const tankerCards = useMemo<TankerCardData[]>(() => {
    const tankerDayAssignments = assignments
      .filter((a) => a.dayId === day.dayId && tankerCategoryIds.has(a.categoryId))
      .sort((a, b) => new Date(a.start).getTime() - new Date(b.start).getTime());
    const referenceTime = getScenarioReferenceTime(day, tankerDayAssignments);

    return tankerDayAssignments.map((assignment) => {
      const totalFuel = assignment.totalFuelLbs ?? 0;
      const remainingFuel = assignment.remainingFuelLbs ?? 0;
      const reserveFuel = Math.round(totalFuel * 0.15);
      const marginFuel = remainingFuel - reserveFuel;
      const fuelPct = totalFuel > 0 ? Math.round((remainingFuel / totalFuel) * 100) : 0;
      const offloads = assignment.events
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

      return {
        assignment,
        flightStatus: getFlightStatus(assignment, referenceTime),
        totalFuel,
        remainingFuel,
        reserveFuel,
        marginFuel,
        fuelPct,
        scheduleWindow: `${formatHHMMSS(new Date(assignment.start))}Z - ${formatHHMMSS(new Date(assignment.end))}Z`,
        offloads,
      };
    });
  }, [assignments, day, tankerCategoryIds, allAssignments]);

  const oversubscribed = tankerCards.filter((c) => c.marginFuel < 0);
  const airborneCount = tankerCards.filter(
    (c) => c.flightStatus !== 'Pending' && c.flightStatus !== 'Mission Complete'
  ).length;

  const filteredCards = tankerCards.filter((card) => {
    if (filter === 'all') return true;
    if (filter === 'airborne') return card.flightStatus !== 'Pending' && card.flightStatus !== 'Mission Complete';
    if (filter === 'scheduled') return card.flightStatus === 'Pending';
    return card.marginFuel < 0;
  });

  return (
    <div style={{ height: '100%', overflow: 'auto', background: 'linear-gradient(180deg, #111315, #0b0d10)' }}>
      <div style={{ borderBottom: '1px solid #24272d', padding: '12px 16px', background: '#1f232a' }}>
        <div style={{ fontSize: 30, fontWeight: 800, color: '#e5e7eb', lineHeight: 1.1 }}>Tanker Dashboard</div>
        <div style={{ marginTop: 4, color: '#9CA3AF', fontSize: 12 }}>
          Quick health view for tanker cell lead
        </div>
      </div>

      {oversubscribed.length > 0 && (
        <div
          style={{
            padding: '10px 16px',
            background: '#2b1316',
            borderBottom: '1px solid #7f1d1d',
            color: '#fca5a5',
            fontSize: 13,
            fontWeight: 600,
          }}
        >
          {oversubscribed.length} tanker{oversubscribed.length === 1 ? '' : 's'} below reserve:
          {' '}
          {oversubscribed
            .map((c) => `${c.assignment.callsign} (${c.marginFuel >= 0 ? '+' : ''}${formatFuelLbs(c.marginFuel)} lbs)`)
            .join(', ')}
        </div>
      )}

      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 8,
          padding: '10px 16px',
          borderBottom: '1px solid #24272d',
          background: '#171a1f',
        }}
      >
        <span style={{ color: '#6b7280', fontSize: 11, fontWeight: 700, letterSpacing: '0.08em' }}>FILTER</span>
        {([
          ['all', `All (${tankerCards.length})`],
          ['airborne', `Airborne (${airborneCount})`],
          ['scheduled', `Scheduled (${tankerCards.length - airborneCount})`],
          ['issues', `Issues (${oversubscribed.length})`],
        ] as Array<[TankerFilter, string]>).map(([id, label]) => {
          const active = filter === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => setFilter(id)}
              style={{
                border: active ? '1px solid #4b91c9' : '1px solid #2f343b',
                background: active ? '#1f3b4f' : '#111317',
                color: active ? '#dbeafe' : '#9CA3AF',
                fontSize: 12,
                borderRadius: 6,
                padding: '5px 10px',
                cursor: 'pointer',
              }}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div style={{ padding: 16, display: 'grid', gap: 12, gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))' }}>
        {filteredCards.map((card) => {
          const isIssue = card.marginFuel < 0;
          const marginColor = getMarginColor(card.totalFuel, card.marginFuel);

          return (
            <button
              key={card.assignment.assignmentId}
              type="button"
              onClick={() => onSelectAssignment(card.assignment.assignmentId)}
              style={{
                textAlign: 'left',
                background: '#171b21',
                border: isIssue ? '1px solid #dc2626' : '1px solid #303742',
                borderRadius: 10,
                padding: 14,
                color: 'inherit',
                cursor: 'pointer',
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10 }}>
                <div>
                  <div style={{ fontSize: 32, fontWeight: 800, color: '#e5e7eb', lineHeight: 1 }}>{card.assignment.callsign}</div>
                  <div style={{ color: '#6b7280', fontSize: 12, marginTop: 2 }}>Mission {card.assignment.missionNumber}</div>
                </div>
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    color: card.flightStatus === 'Pending' ? '#60A5FA' : '#4ADE80',
                    background: '#1f2937',
                    border: '1px solid #334155',
                    borderRadius: 6,
                    padding: '4px 8px',
                    letterSpacing: '0.06em',
                  }}
                >
                  {card.flightStatus.toUpperCase()}
                </span>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#9CA3AF', marginBottom: 4 }}>
                  <span>Fuel Health</span>
                  <span>{card.scheduleWindow}</span>
                </div>
                <FuelHealthBar
                  totalFuel={card.totalFuel}
                  remainingFuel={card.remainingFuel}
                  reserveFuel={card.reserveFuel}
                />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, marginTop: 8 }}>
                  <div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Remaining</div>
                    <div style={{ fontSize: 17, color: '#e5e7eb', fontWeight: 700 }}>
                      {formatFuelLbs(card.remainingFuel)} lbs
                      <span style={{ marginLeft: 6, fontSize: 13, color: '#86efac' }}>{card.fuelPct}%</span>
                    </div>
                  </div>
                  <div>
                    <div style={{ fontSize: 11, color: '#6b7280' }}>Margin (vs reserve)</div>
                    <div style={{ fontSize: 17, color: marginColor, fontWeight: 700 }}>
                      {card.marginFuel >= 0 ? '+' : ''}{formatFuelLbs(card.marginFuel)} lbs
                    </div>
                  </div>
                </div>
              </div>

              <div style={{ marginTop: 12 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                  <span style={{ color: '#9CA3AF', fontSize: 11, letterSpacing: '0.06em', fontWeight: 700 }}>
                    REFUELING SCHEDULE
                  </span>
                  <span style={{ color: '#9CA3AF', fontSize: 11 }}>{card.offloads.length} receivers</span>
                </div>
                <SubwaySchedule offloads={card.offloads} />
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

