import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

type MissionEventType = 'on-station' | 'refuel-tanker' | 'refuel-receiver' | 'strike';

interface MissionEvent {
  type: MissionEventType;
  time: string;
  endTime?: string;
  fuelLbs?: number;
  linkedAssignmentId?: string;
  dmpiCount?: number;
}

interface Assignment {
  assignmentId: string;
  dayId: string;
  missionNumber: number;
  callsign: string;
  categoryId: string;
  start: string;
  end: string;
  status: string;
  events: MissionEvent[];
  totalFuelLbs?: number;
  remainingFuelLbs?: number;
  dmpiTotal?: number;
  dmpiHit?: number;
  onStationMinutes?: number;
  threatContacts?: number;
  interceptsCompleted?: number;
}

interface Day { dayId: string; label: string; start: string; end: string; }
interface Category { categoryId: string; name: string; }
interface MockData { days: Day[]; categories: Category[]; assignments: Assignment[]; }

function rnd(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function addMinutes(isoStr: string, mins: number): string {
  const d = new Date(isoStr);
  d.setMinutes(d.getMinutes() + mins);
  return d.toISOString();
}

function pickStatus(): string {
  const r = Math.random();
  if (r < 0.68) return 'OK';
  if (r < 0.88) return 'AT RISK';
  return 'DEGRADED';
}

// Generate a unique callsign for index i within a type
function tankerCallsign(i: number): string {
  const bases = ['TEXACO', 'ARCO', 'SHELL', 'MOBIL', 'EXXON'];
  const base = bases[i % bases.length];
  const num = String(Math.floor(i / bases.length) + 1).padStart(2, '0');
  return base + num;
}

function strikeCallsign(i: number): string {
  const bases = ['VIPER', 'EAGLE', 'FALCON', 'DEVIL', 'TIGER'];
  const base = bases[i % bases.length];
  const num = String(Math.floor(i / bases.length) + 1).padStart(2, '0');
  return base + num;
}

function capCallsign(i: number): string {
  const bases = ['HAWK', 'COBRA', 'LANCE', 'BLADE', 'FURY'];
  const base = bases[i % bases.length];
  const num = String(Math.floor(i / bases.length) + 1).padStart(2, '0');
  return base + num;
}

function generateMissions(dayData: Day, msnBase: number, idBase: number): Assignment[] {
  const missions: Assignment[] = [];
  const WINDOW = 720; // 12-hour window in minutes

  // ── TANKERS (17) ──────────────────────────────────────────────────────────
  for (let i = 0; i < 17; i++) {
    const callsign = tankerCallsign(i);
    const duration = rnd(150, 240);
    const startOffset = rnd(0, WINDOW - duration);
    const start = addMinutes(dayData.start, startOffset);
    const end = addMinutes(start, duration);
    const status = pickStatus();

    // On-station window: starts ~20-35 min after launch, runs until ~30 min before RTB
    const osStartOff = rnd(20, 35);
    const osEndOff = duration - rnd(20, 35);
    const osStart = addMinutes(start, osStartOff);
    const osEnd = addMinutes(start, Math.max(osStartOff + 60, osEndOff));

    const totalFuelLbs = rnd(180, 215) * 1000;

    missions.push({
      assignmentId: `assignment-${String(idBase + missions.length + 1).padStart(4, '0')}`,
      dayId: dayData.dayId,
      missionNumber: msnBase + missions.length + 1,
      callsign,
      categoryId: 'cat-1',
      start, end, status,
      events: [{ type: 'on-station', time: osStart, endTime: osEnd }],
      totalFuelLbs,
      remainingFuelLbs: totalFuelLbs,
    });
  }

  // ── STRIKES (18) ──────────────────────────────────────────────────────────
  for (let i = 0; i < 18; i++) {
    const callsign = strikeCallsign(i);
    const duration = rnd(70, 160);
    const startOffset = rnd(30, WINDOW - duration - 30);
    const start = addMinutes(dayData.start, startOffset);
    const end = addMinutes(start, duration);
    const status = pickStatus();

    // Time-over-target (on-station) window
    const osStartOff = Math.round(duration * (0.50 + Math.random() * 0.15));
    const osDuration = rnd(18, Math.min(45, duration - osStartOff - 8));
    const osStart = addMinutes(start, osStartOff);
    const osEnd = addMinutes(osStart, osDuration);

    const events: MissionEvent[] = [{ type: 'on-station', time: osStart, endTime: osEnd }];

    // DMPI attack runs within the ToT window — 1–4 runs, spaced across the window
    const numRuns = rnd(1, Math.min(4, Math.floor(osDuration / 5)));
    let dmpiTotal = 0;
    for (let r = 0; r < numRuns; r++) {
      const dmpiCount = rnd(1, 4);
      dmpiTotal += dmpiCount;
      const segLen = Math.floor(osDuration / numRuns);
      const segStart = r * segLen + 2;
      const segEnd = (r + 1) * segLen - 2;
      const runOff = segEnd > segStart ? rnd(segStart, segEnd) : segStart;
      events.push({ type: 'strike', time: addMinutes(osStart, runOff), dmpiCount });
    }

    const hitRate =
      status === 'OK' ? rnd(85, 100) / 100 :
      status === 'AT RISK' ? rnd(55, 85) / 100 :
      rnd(20, 55) / 100;
    const dmpiHit = Math.round(dmpiTotal * hitRate);

    events.sort((a, b) => a.time.localeCompare(b.time));

    missions.push({
      assignmentId: `assignment-${String(idBase + missions.length + 1).padStart(4, '0')}`,
      dayId: dayData.dayId,
      missionNumber: msnBase + missions.length + 1,
      callsign,
      categoryId: 'cat-2',
      start, end, status,
      events,
      dmpiTotal,
      dmpiHit,
    });
  }

  // ── CAP (15) ──────────────────────────────────────────────────────────────
  for (let i = 0; i < 15; i++) {
    const callsign = capCallsign(i);
    const duration = rnd(120, 210);
    const startOffset = rnd(0, WINDOW - duration);
    const start = addMinutes(dayData.start, startOffset);
    const end = addMinutes(start, duration);
    const status = pickStatus();

    const events: MissionEvent[] = [];
    let totalOsMinutes = 0;

    // First on-station window
    const os1StartOff = rnd(15, Math.round(duration * 0.25));
    const os1Dur = rnd(40, Math.min(90, Math.round(duration * 0.45)));
    const os1Start = addMinutes(start, os1StartOff);
    const os1End = addMinutes(os1Start, os1Dur);
    events.push({ type: 'on-station', time: os1Start, endTime: os1End });
    totalOsMinutes += os1Dur;

    // Optional second on-station window (~55% of the time)
    if (Math.random() < 0.55) {
      const gap = rnd(15, 30);
      const os2StartOff = os1StartOff + os1Dur + gap;
      if (os2StartOff + 20 < duration) {
        const os2Dur = rnd(25, Math.min(70, duration - os2StartOff - 10));
        const os2Start = addMinutes(start, os2StartOff);
        const os2End = addMinutes(os2Start, os2Dur);
        events.push({ type: 'on-station', time: os2Start, endTime: os2End });
        totalOsMinutes += os2Dur;
      }
    }

    const threatContacts = rnd(0, 7);
    const interceptsCompleted = rnd(0, threatContacts);

    missions.push({
      assignmentId: `assignment-${String(idBase + missions.length + 1).padStart(4, '0')}`,
      dayId: dayData.dayId,
      missionNumber: msnBase + missions.length + 1,
      callsign,
      categoryId: 'cat-3',
      start, end, status,
      events,
      onStationMinutes: totalOsMinutes,
      threatContacts,
      interceptsCompleted,
    });
  }

  // ── REFUEL PAIRING ────────────────────────────────────────────────────────
  // Tankers don't refuel tankers. Strike + CAP receive fuel from tankers.
  const tankers = missions.filter(m => m.categoryId === 'cat-1');
  const receivers = missions.filter(m => m.categoryId !== 'cat-1');

  // Shuffle receivers for random pairing order
  for (let i = receivers.length - 1; i > 0; i--) {
    const j = rnd(0, i);
    [receivers[i], receivers[j]] = [receivers[j], receivers[i]];
  }

  for (const receiver of receivers) {
    // ~55% of strike/CAP get refueled
    if (Math.random() > 0.55) continue;

    // Find tankers with temporal overlap and remaining fuel
    const compatible = tankers.filter(t => {
      const overlap = t.end > receiver.start && t.start < receiver.end;
      if (!overlap) return false;
      return (t.remainingFuelLbs ?? 0) > 25000;
    });

    if (compatible.length === 0) continue;

    // Pick a random compatible tanker
    const tanker = compatible[rnd(0, compatible.length - 1)];

    // Calculate refuel time within overlap window
    const overlapStartMs = Math.max(new Date(tanker.start).getTime(), new Date(receiver.start).getTime());
    const overlapEndMs = Math.min(new Date(tanker.end).getTime(), new Date(receiver.end).getTime());
    const overlapMinutes = (overlapEndMs - overlapStartMs) / 60000;
    if (overlapMinutes < 15) continue;

    const refuelOffMin = rnd(5, Math.max(6, overlapMinutes - 5));
    const refuelTime = new Date(overlapStartMs + refuelOffMin * 60000).toISOString();

    const maxFuel = Math.min(35000, (tanker.remainingFuelLbs ?? 0) - 15000);
    if (maxFuel < 8000) continue;
    const fuelLbs = rnd(12000, maxFuel);

    // Add paired events
    tanker.events.push({
      type: 'refuel-tanker',
      time: refuelTime,
      fuelLbs,
      linkedAssignmentId: receiver.assignmentId,
    });
    receiver.events.push({
      type: 'refuel-receiver',
      time: refuelTime,
      fuelLbs,
      linkedAssignmentId: tanker.assignmentId,
    });

    tanker.remainingFuelLbs = (tanker.remainingFuelLbs ?? 0) - fuelLbs;
  }

  // Sort events within each mission by time
  for (const m of missions) {
    m.events.sort((a, b) => a.time.localeCompare(b.time));
  }

  missions.sort((a, b) => a.start.localeCompare(b.start));
  return missions;
}

function generateMockData(): MockData {
  const days: Day[] = [
    {
      dayId: 'day-1',
      label: 'Monday, Jan 15',
      start: '2024-01-15T06:00:00-05:00',
      end: '2024-01-15T18:00:00-05:00',
    },
    {
      dayId: 'day-2',
      label: 'Tuesday, Jan 16',
      start: '2024-01-16T06:00:00-05:00',
      end: '2024-01-16T18:00:00-05:00',
    },
  ];

  const categories: Category[] = [
    { categoryId: 'cat-1', name: 'Tanker' },
    { categoryId: 'cat-2', name: 'Strike' },
    { categoryId: 'cat-3', name: 'CAP' },
  ];

  const day1 = generateMissions(days[0], 1000, 0);
  const day2 = generateMissions(days[1], 2000, 50);

  return { days, categories, assignments: [...day1, ...day2] };
}

const mockData = generateMockData();
const outputPath = path.join(__dirname, 'mockData.json');
fs.writeFileSync(outputPath, JSON.stringify(mockData, null, 2), 'utf-8');

console.log(`Generated ${mockData.assignments.length} missions`);
const tankers = mockData.assignments.filter(a => a.categoryId === 'cat-1');
const strikes = mockData.assignments.filter(a => a.categoryId === 'cat-2');
const caps = mockData.assignments.filter(a => a.categoryId === 'cat-3');
const refuelPairs = tankers.reduce((n, t) => n + t.events.filter(e => e.type === 'refuel-tanker').length, 0);
console.log(`Tankers: ${tankers.length}, Strikes: ${strikes.length}, CAPs: ${caps.length}`);
console.log(`Refuel pairs: ${refuelPairs}`);
