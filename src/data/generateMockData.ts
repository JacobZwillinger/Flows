import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

interface Day {
  dayId: string;
  label: string;
  start: string;
  end: string;
}

interface Category {
  categoryId: string;
  name: string;
}

interface Assignment {
  assignmentId: string;
  dayId: string;
  workerId: string;
  workerDisplay: string;
  title: string;
  categoryId: string;
  start: string;
  end: string;
  status: string;
  location: string;
  drawer: {
    workOrder: string;
    supervisor: string;
    notes: string;
    risk: string;
  };
}

interface MockData {
  days: Day[];
  categories: Category[];
  assignments: Assignment[];
}

// Name pools
const firstNames = [
  'James', 'John', 'Robert', 'Michael', 'William', 'David', 'Richard', 'Joseph',
  'Thomas', 'Christopher', 'Daniel', 'Matthew', 'Anthony', 'Mark', 'Donald',
  'Steven', 'Andrew', 'Kenneth', 'Joshua', 'Kevin', 'Brian', 'George', 'Timothy',
  'Ronald', 'Edward', 'Jason', 'Jeffrey', 'Ryan', 'Jacob', 'Gary', 'Nicholas',
  'Eric', 'Jonathan', 'Stephen', 'Larry', 'Justin', 'Scott', 'Brandon', 'Benjamin',
  'Samuel', 'Raymond', 'Gregory', 'Frank', 'Alexander', 'Patrick', 'Jack', 'Dennis',
  'Jerry', 'Tyler', 'Aaron', 'Jose', 'Adam', 'Nathan', 'Douglas', 'Zachary',
  'Peter', 'Kyle', 'Walter', 'Ethan', 'Jeremy', 'Harold', 'Keith', 'Christian',
  'Roger', 'Noah', 'Gerald', 'Carl', 'Terry', 'Sean', 'Austin', 'Arthur',
  'Lawrence', 'Jesse', 'Dylan', 'Bryan', 'Joe', 'Jordan', 'Billy', 'Bruce',
  'Albert', 'Willie', 'Gabriel', 'Logan', 'Alan', 'Juan', 'Wayne', 'Elijah',
  'Randy', 'Roy', 'Vincent', 'Ralph', 'Eugene', 'Russell', 'Bobby', 'Mason',
  'Philip', 'Louis'
];

const lastNames = [
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis',
  'Rodriguez', 'Martinez', 'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson',
  'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin', 'Lee', 'Perez', 'Thompson',
  'White', 'Harris', 'Sanchez', 'Clark', 'Ramirez', 'Lewis', 'Robinson', 'Walker',
  'Young', 'Allen', 'King', 'Wright', 'Scott', 'Torres', 'Nguyen', 'Hill',
  'Flores', 'Green', 'Adams', 'Nelson', 'Baker', 'Hall', 'Rivera', 'Campbell',
  'Mitchell', 'Carter', 'Roberts', 'Gomez', 'Phillips', 'Evans', 'Turner',
  'Diaz', 'Parker', 'Cruz', 'Edwards', 'Collins', 'Reyes', 'Stewart', 'Morris',
  'Morales', 'Murphy', 'Cook', 'Rogers', 'Gutierrez', 'Ortiz', 'Morgan', 'Cooper',
  'Peterson', 'Bailey', 'Reed', 'Kelly', 'Howard', 'Ramos', 'Kim', 'Cox',
  'Ward', 'Richardson', 'Watson', 'Brooks', 'Chavez', 'Wood', 'James', 'Bennett',
  'Gray', 'Mendoza', 'Ruiz', 'Hughes', 'Price', 'Alvarez', 'Castillo', 'Sanders',
  'Patel', 'Myers', 'Long', 'Ross'
];

const supervisors = [
  'Sarah Mitchell',
  'Tom Bradley',
  'Linda Chen',
  'Mike Patterson',
  'Jennifer Walsh',
  'Robert Kim',
  'Patricia Rivera',
  'David Thompson',
  'Michelle Anderson',
  'Carlos Martinez'
];

const statuses = ['Scheduled', 'In Progress', 'Completed', 'On Hold'];
const risks = ['Low', 'Medium', 'High'];
const buildings = ['A', 'B', 'C', 'D', 'E', 'F'];

// Equipment/systems by category
const equipmentByCategory: Record<string, string[]> = {
  Maintenance: [
    'HVAC System', 'Elevator', 'Generator', 'Boiler', 'Chiller', 'Air Handler',
    'Cooling Tower', 'Pump Station', 'Ventilation System', 'Water Heater',
    'Fire Suppression System', 'Emergency Lighting', 'Backup Power System'
  ],
  Installation: [
    'Security Camera', 'Access Control Panel', 'Network Switch', 'Lighting Fixture',
    'Sensor Array', 'Control Panel', 'Monitoring System', 'Safety Equipment',
    'Communication System', 'Power Distribution Unit', 'Fire Alarm Panel'
  ],
  Inspection: [
    'Fire Extinguisher', 'Safety Equipment', 'Electrical Panel', 'Plumbing System',
    'Structural Components', 'Roof System', 'Foundation', 'Exit Signs',
    'Emergency Systems', 'Gas Lines', 'Sprinkler System', 'Smoke Detectors'
  ],
  Repair: [
    'Circuit Breaker', 'Door Lock', 'Window Seal', 'Pipe Joint', 'Control Valve',
    'Motor Assembly', 'Belt Drive', 'Bearing Assembly', 'Thermostat',
    'Pressure Switch', 'Flow Sensor', 'Actuator', 'Damper'
  ],
  Calibration: [
    'Temperature Sensor', 'Pressure Gauge', 'Flow Meter', 'Control System',
    'Monitoring Device', 'Detection System', 'Measurement Instrument',
    'Analytical Equipment', 'Testing Device', 'Alarm System'
  ]
};

const verbsByCategory: Record<string, string[]> = {
  Maintenance: ['Service', 'Clean', 'Lubricate', 'Replace filters on', 'Perform preventive maintenance on'],
  Installation: ['Install', 'Mount', 'Set up', 'Deploy', 'Configure'],
  Inspection: ['Inspect', 'Examine', 'Check', 'Review', 'Assess'],
  Repair: ['Repair', 'Fix', 'Replace', 'Troubleshoot', 'Restore'],
  Calibration: ['Calibrate', 'Adjust', 'Fine-tune', 'Verify', 'Recalibrate']
};

const notes = [
  'Standard procedure required',
  'Requires safety equipment',
  'Coordinate with facility manager',
  'Follow manufacturer guidelines',
  'Document all findings',
  'Update maintenance log',
  'Check warranty status',
  'Parts may be needed',
  'Verify system after completion',
  'Schedule follow-up if needed',
  'Notify operations upon completion',
  'Review previous work orders',
  'Ensure proper lockout/tagout',
  'Test after completion',
  'Contact vendor if issues arise'
];

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice<T>(array: T[]): T {
  return array[randomInt(0, array.length - 1)];
}

function generateWorkerName(): string {
  return `${randomChoice(firstNames)} ${randomChoice(lastNames)}`;
}

function generateLocation(): string {
  const building = randomChoice(buildings);
  const floor = randomInt(1, 8);
  return `Building ${building}, Floor ${floor}`;
}

function generateTitle(categoryName: string): string {
  const verb = randomChoice(verbsByCategory[categoryName]);
  const equipment = randomChoice(equipmentByCategory[categoryName]);
  return `${verb} ${equipment}`;
}

function addMinutes(dateStr: string, minutes: number): string {
  const date = new Date(dateStr);
  date.setMinutes(date.getMinutes() + minutes);
  return date.toISOString();
}

function generateAssignment(
  index: number,
  dayId: string,
  dayStart: string,
  categories: Category[]
): Assignment {
  const category = randomChoice(categories);
  const workerId = `worker-${String(index + 1).padStart(4, '0')}`;
  const workerDisplay = generateWorkerName();

  // Random start time between 06:00 and 16:00 (10 hours = 600 minutes)
  const minutesFromDayStart = randomInt(0, 600);
  const startTime = addMinutes(dayStart, minutesFromDayStart);

  // Random duration between 30 minutes and 4 hours (240 minutes)
  const duration = randomInt(30, 240);
  const endTime = addMinutes(startTime, duration);

  const workOrderNum = String(randomInt(1, 9999)).padStart(4, '0');

  return {
    assignmentId: `assignment-${String(index + 1).padStart(4, '0')}`,
    dayId,
    workerId,
    workerDisplay,
    title: generateTitle(category.name),
    categoryId: category.categoryId,
    start: startTime,
    end: endTime,
    status: randomChoice(statuses),
    location: generateLocation(),
    drawer: {
      workOrder: `WO-2024-${workOrderNum}`,
      supervisor: randomChoice(supervisors),
      notes: randomChoice(notes),
      risk: randomChoice(risks)
    }
  };
}

function generateMockData(): MockData {
  // Generate days
  const days: Day[] = [
    {
      dayId: 'day-1',
      label: 'Monday, Jan 15',
      start: '2024-01-15T06:00:00-05:00',
      end: '2024-01-15T18:00:00-05:00'
    },
    {
      dayId: 'day-2',
      label: 'Tuesday, Jan 16',
      start: '2024-01-16T06:00:00-05:00',
      end: '2024-01-16T18:00:00-05:00'
    }
  ];

  // Generate categories
  const categories: Category[] = [
    { categoryId: 'cat-1', name: 'Maintenance' },
    { categoryId: 'cat-2', name: 'Installation' },
    { categoryId: 'cat-3', name: 'Inspection' },
    { categoryId: 'cat-4', name: 'Repair' },
    { categoryId: 'cat-5', name: 'Calibration' }
  ];

  // Generate assignments
  const assignments: Assignment[] = [];

  // 500 assignments for day 1
  for (let i = 0; i < 500; i++) {
    assignments.push(generateAssignment(i, 'day-1', days[0].start, categories));
  }

  // 500 assignments for day 2
  for (let i = 500; i < 1000; i++) {
    assignments.push(generateAssignment(i, 'day-2', days[1].start, categories));
  }

  return {
    days,
    categories,
    assignments
  };
}

// Generate and write the data
const mockData = generateMockData();
const outputPath = path.join(__dirname, 'mockData.json');

fs.writeFileSync(outputPath, JSON.stringify(mockData, null, 2), 'utf-8');

console.log(`Mock data generated successfully!`);
console.log(`File: ${outputPath}`);
console.log(`Days: ${mockData.days.length}`);
console.log(`Categories: ${mockData.categories.length}`);
console.log(`Assignments: ${mockData.assignments.length}`);
