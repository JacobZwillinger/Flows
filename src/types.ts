export interface Day {
  dayId: string;
  label: string;
  start: string;
  end: string;
}

export interface Category {
  categoryId: string;
  name: string;
}

export interface AssignmentDrawer {
  workOrder: string;
  supervisor: string;
  notes: string;
  risk: string;
}

export interface Assignment {
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
  drawer: AssignmentDrawer;
}

export interface MockData {
  days: Day[];
  categories: Category[];
  assignments: Assignment[];
}
