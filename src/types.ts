export interface Day {
  dayId: string;
  label: string;
  start: string;
  end: string;
}

export interface Category {
  categoryId: string;
  name: string; // 'Tanker' | 'Strike' | 'CAP'
}

export type MissionEventType = 'on-station' | 'refuel-tanker' | 'refuel-receiver' | 'strike';

export interface MissionEvent {
  type: MissionEventType;
  time: string;                  // ISO datetime (start time)
  endTime?: string;              // ISO datetime (end time — for 'on-station' bands)
  fuelLbs?: number;              // lbs of fuel (refuel-tanker / refuel-receiver)
  linkedAssignmentId?: string;   // cross-reference for refuel pairs
  dmpiCount?: number;            // for 'strike': DMPIs released in this attack run
}

export interface Assignment {
  assignmentId: string;
  dayId: string;
  missionNumber: number;
  callsign: string;
  categoryId: string;
  start: string;
  end: string;
  status: string; // 'OK' | 'AT RISK' | 'DEGRADED'
  events: MissionEvent[];
  // Tanker-specific
  totalFuelLbs?: number;
  remainingFuelLbs?: number;
  // Strike-specific
  dmpiTotal?: number;
  dmpiHit?: number;
  // CAP-specific
  onStationMinutes?: number;
  threatContacts?: number;
  interceptsCompleted?: number;
}

export interface MockData {
  days: Day[];
  categories: Category[];
  assignments: Assignment[];
}
