import { useMemo } from 'react';
import { Assignment } from '../types';

export function useFilteredAssignments(
  assignments: Assignment[],
  selectedDayId: string,
  selectedCategoryId: string | null,
  searchQuery: string
): Assignment[] {
  return useMemo(() => {
    const trimmedQuery = searchQuery.trim().toLowerCase();

    const filtered = assignments.filter((assignment) => {
      // Filter by dayId
      if (assignment.dayId !== selectedDayId) {
        return false;
      }

      // Filter by categoryId (skip if null = ALL)
      if (selectedCategoryId !== null && assignment.categoryId !== selectedCategoryId) {
        return false;
      }

      // Filter by search query (case-insensitive)
      if (trimmedQuery) {
        const matchesWorkerDisplay = assignment.workerDisplay.toLowerCase().includes(trimmedQuery);
        const matchesWorkerId = assignment.workerId.toLowerCase().includes(trimmedQuery);
        const matchesTitle = assignment.title.toLowerCase().includes(trimmedQuery);
        const matchesWorkOrder = assignment.drawer.workOrder.toLowerCase().includes(trimmedQuery);

        if (!matchesWorkerDisplay && !matchesWorkerId && !matchesTitle && !matchesWorkOrder) {
          return false;
        }
      }

      return true;
    });

    // Sort by start time ascending, tiebreak by assignmentId
    filtered.sort((a, b) => {
      const startCompare = a.start.localeCompare(b.start);
      if (startCompare !== 0) {
        return startCompare;
      }
      return a.assignmentId.localeCompare(b.assignmentId);
    });

    return filtered;
  }, [assignments, selectedDayId, selectedCategoryId, searchQuery]);
}
