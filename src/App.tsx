import { useState, useEffect } from 'react';
import { MockData } from './types';
import { TopBar, ViewMode } from './components/TopBar';
import ScheduleViewer from './components/ScheduleViewer';
import { DetailsDrawer } from './components/DetailsDrawer';
import { useFilteredAssignments } from './hooks/useFilteredAssignments';
import TankerDashboard from './components/TankerDashboard';
import C2MockPanel from './components/C2MockPanel';

export default function App() {
  const [data, setData] = useState<MockData | null>(null);
  const [selectedDayId, setSelectedDayId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAssignmentId, setSelectedAssignmentId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>('default');

  useEffect(() => {
    import('./data/mockData.json').then((mod) => {
      const mockData = mod.default as MockData;
      setData(mockData);
      if (mockData.days.length > 0) {
        setSelectedDayId(mockData.days[0].dayId);
      }
    });
  }, []);

  const filteredAssignments = useFilteredAssignments(
    data?.assignments ?? [],
    selectedDayId,
    selectedCategoryId,
    searchQuery
  );

  // Clear selection if selected assignment is no longer visible
  useEffect(() => {
    if (selectedAssignmentId && !filteredAssignments.find((a) => a.assignmentId === selectedAssignmentId)) {
      setSelectedAssignmentId(null);
    }
  }, [filteredAssignments, selectedAssignmentId]);

  // Esc key to clear selection
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setSelectedAssignmentId(null);
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  if (!data) return null;

  const selectedDay = data.days.find((d) => d.dayId === selectedDayId);
  const selectedDayAssignments = data.assignments.filter((a) => a.dayId === selectedDayId);
  const selectedAssignment = selectedAssignmentId
    ? data.assignments.find((a) => a.assignmentId === selectedAssignmentId) ?? null
    : null;

  const handleSetViewMode = (mode: ViewMode) => {
    setViewMode(mode);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', backgroundColor: '#121212', color: '#fff' }}>
      <TopBar
        days={data.days}
        categories={data.categories}
        selectedDayId={selectedDayId}
        selectedCategoryId={selectedCategoryId}
        searchQuery={searchQuery}
        onDayChange={(dayId) => {
          setSelectedDayId(dayId);
          setSelectedAssignmentId(null);
        }}
        onCategoryChange={setSelectedCategoryId}
        onSearchChange={setSearchQuery}
        viewMode={viewMode}
        onSetViewMode={handleSetViewMode}
      />

      <div style={{ flex: 1, overflow: 'hidden' }}>
        {selectedDay ? (
          viewMode === 'mock' ? (
            <C2MockPanel />
          ) : viewMode === 'dashboard' ? (
            <TankerDashboard
              day={selectedDay}
              assignments={data.assignments}
              categories={data.categories}
              allAssignments={data.assignments}
              searchQuery={searchQuery}
              onSelectAssignment={setSelectedAssignmentId}
            />
          ) : (
            <ScheduleViewer
              day={selectedDay}
              assignments={filteredAssignments}
              allAssignments={data.assignments}
              categories={data.categories}
              selectedAssignmentId={selectedAssignmentId}
              onSelectAssignment={setSelectedAssignmentId}
              cellOverview={viewMode === 'cell'}
            />
          )
        ) : (
          <div style={{ padding: 24, color: '#999' }}>Select a day to view the schedule.</div>
        )}
      </div>

      <DetailsDrawer
        open={selectedAssignment !== null}
        assignment={selectedAssignment}
        categories={data.categories}
        day={selectedDay ?? null}
        dayAssignments={selectedDayAssignments}
        allAssignments={data.assignments}
        onClose={() => setSelectedAssignmentId(null)}
      />
    </div>
  );
}
