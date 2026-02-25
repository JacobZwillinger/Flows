import { Assignment, Day, MissionEvent } from '../types';

export type FlightStatus =
  | 'Pending'
  | 'Takeoff'
  | 'Enroute'
  | 'On Station'
  | 'RTB'
  | 'Mission Complete';

export const IN_AIR_COLOR = '#3B82F6';
export const GROUND_COLOR = '#6B7280';

function byTimeAsc(a: MissionEvent, b: MissionEvent): number {
  return new Date(a.time).getTime() - new Date(b.time).getTime();
}

function getOnStationEvents(events: MissionEvent[]): MissionEvent[] {
  return events
    .filter((ev) => ev.type === 'on-station' && ev.endTime)
    .sort(byTimeAsc);
}

export function getScenarioReferenceTime(day: Day, assignments: Assignment[]): Date {
  const dayStartMs = new Date(day.start).getTime();
  const dayEndMs = new Date(day.end).getTime();
  const nowMs = Date.now();

  if (nowMs >= dayStartMs && nowMs <= dayEndMs) {
    return new Date(nowMs);
  }

  if (assignments.length === 0) {
    return new Date(dayStartMs + (dayEndMs - dayStartMs) * 0.5);
  }

  const sortedByStart = [...assignments].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );
  const mid = sortedByStart[Math.floor(sortedByStart.length / 2)];
  const midStartMs = new Date(mid.start).getTime();
  const midEndMs = new Date(mid.end).getTime();
  const durationMs = Math.max(1, midEndMs - midStartMs);

  // Anchor in the middle mission so past/future datasets still show realistic spread.
  return new Date(midStartMs + Math.min(20 * 60 * 1000, durationMs * 0.2));
}

export function getFlightStatus(assignment: Assignment, referenceTime: Date): FlightStatus {
  const nowMs = referenceTime.getTime();
  const startMs = new Date(assignment.start).getTime();
  const endMs = new Date(assignment.end).getTime();

  if (nowMs < startMs) return 'Pending';
  if (nowMs >= endMs) return 'Mission Complete';

  const durationMs = Math.max(1, endMs - startMs);
  const takeoffEndMs = startMs + Math.min(20 * 60 * 1000, durationMs * 0.15);
  if (nowMs < takeoffEndMs) return 'Takeoff';

  const onStation = getOnStationEvents(assignment.events ?? []);
  if (onStation.length > 0) {
    for (const ev of onStation) {
      const osStart = new Date(ev.time).getTime();
      const osEnd = new Date(ev.endTime!).getTime();
      if (nowMs >= osStart && nowMs <= osEnd) return 'On Station';
    }

    const firstOnStationMs = new Date(onStation[0].time).getTime();
    const lastOnStationEndMs = new Date(onStation[onStation.length - 1].endTime!).getTime();

    if (nowMs < firstOnStationMs) return 'Enroute';
    if (nowMs > lastOnStationEndMs) return 'RTB';
    return 'Enroute';
  }

  const rtbStartMs = endMs - durationMs * 0.25;
  return nowMs >= rtbStartMs ? 'RTB' : 'Enroute';
}

export function getFlightStatusColor(status: FlightStatus): string {
  return status === 'Pending' || status === 'Mission Complete' ? GROUND_COLOR : IN_AIR_COLOR;
}

