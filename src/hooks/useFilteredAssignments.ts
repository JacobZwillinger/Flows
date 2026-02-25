import { useMemo } from 'react';
import { Assignment } from '../types';
import { shortCallsign } from '../utils/missionUtils';

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

      // Filter by search query — matches callsign or mission number
      if (trimmedQuery) {
        const matchesCallsign = assignment.callsign.toLowerCase().includes(trimmedQuery);
        const matchesShortCallsign = shortCallsign(assignment.callsign).toLowerCase().includes(trimmedQuery);
        const matchesMissionNumber = String(assignment.missionNumber).includes(trimmedQuery);
        if (!matchesCallsign && !matchesShortCallsign && !matchesMissionNumber) return false;
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
