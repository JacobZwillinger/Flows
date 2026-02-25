import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Divider,
  IconButton,
  Chip,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import LocalGasStationIcon from '@mui/icons-material/LocalGasStation';
import CrisisAlertIcon from '@mui/icons-material/CrisisAlert';
import { Assignment, Category, Day, MissionEvent } from '../types';
import { formatHHMMSS, formatDuration } from '../utils/timeUtils';
import { formatFuelLbs } from '../utils/missionUtils';
import { getFlightStatus, getFlightStatusColor, getScenarioReferenceTime } from '../utils/flightStatus';

interface DetailsDrawerProps {
  open: boolean;
  assignment: Assignment | null;
  categories: Category[];
  day: Day | null;
  dayAssignments: Assignment[];
  allAssignments: Assignment[];
  onClose: () => void;
}

const EVENT_ICON_COLOR = '#D1D5DB';

function getStatusColor(status: string): string {
  switch (status) {
    case 'OK': return '#4CAF50';
    case 'AT RISK': return '#FF9800';
    case 'DEGRADED': return '#F44336';
    default: return '#9E9E9E';
  }
}

function getTypeColor(catName: string): string {
  switch (catName) {
    case 'Tanker': return '#5B9BD5';
    case 'Strike': return '#E07B39';
    case 'CAP': return '#4CAF7D';
    default: return '#9E9E9E';
  }
}

function EventLabel({ ev }: { ev: MissionEvent }) {
  if (ev.type === 'refuel-tanker' || ev.type === 'refuel-receiver') {
    return <LocalGasStationIcon sx={{ fontSize: 14, color: EVENT_ICON_COLOR }} />;
  }
  if (ev.type === 'strike') {
    return <CrisisAlertIcon sx={{ fontSize: 14, color: EVENT_ICON_COLOR }} />;
  }
  return <span style={{ width: 14, display: 'inline-block', color: '#777' }}>•</span>;
}

function CategoryDetails({ assignment, allAssignments }: { assignment: Assignment; allAssignments: Assignment[] }) {
  if (assignment.categoryId === 'cat-1') {
    const { totalFuelLbs = 0, remainingFuelLbs = 0 } = assignment;
    const pct = totalFuelLbs > 0 ? Math.round((remainingFuelLbs / totalFuelLbs) * 100) : 0;
    const receivers = assignment.events
      .filter((e) => e.type === 'refuel-tanker')
      .map((e) => e.linkedAssignmentId ? allAssignments.find((a) => a.assignmentId === e.linkedAssignmentId)?.callsign : null)
      .filter((v): v is string => Boolean(v));
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">Fuel Remaining</Typography>
          <Typography variant="body1">{formatFuelLbs(remainingFuelLbs)} lbs ({pct}%)</Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">Fuel Capacity</Typography>
          <Typography variant="body1">{formatFuelLbs(totalFuelLbs)} lbs</Typography>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography variant="body2" color="text.secondary">Receivers</Typography>
          <Typography variant="body1">{receivers.length > 0 ? receivers.join(', ') : 'None'}</Typography>
        </Box>
      </Box>
    );
  }

  if (assignment.categoryId === 'cat-2') {
    const { dmpiTotal = 0, dmpiHit = 0 } = assignment;
    const tankerEvent = assignment.events.find((e) => e.type === 'refuel-receiver');
    const tanker = tankerEvent?.linkedAssignmentId
      ? allAssignments.find((a) => a.assignmentId === tankerEvent.linkedAssignmentId)?.callsign
      : null;
    return (
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
        <Box>
          <Typography variant="body2" color="text.secondary">DMPIs Hit</Typography>
          <Typography variant="body1">{dmpiHit}/{dmpiTotal}</Typography>
        </Box>
        <Box>
          <Typography variant="body2" color="text.secondary">Missed</Typography>
          <Typography variant="body1">{Math.max(0, dmpiTotal - dmpiHit)}</Typography>
        </Box>
        <Box sx={{ gridColumn: '1 / -1' }}>
          <Typography variant="body2" color="text.secondary">AAR Tanker</Typography>
          <Typography variant="body1">{tanker ?? 'None'}</Typography>
        </Box>
      </Box>
    );
  }

  const { onStationMinutes = 0, threatContacts = 0, interceptsCompleted = 0 } = assignment;
  const tankerEvent = assignment.events.find((e) => e.type === 'refuel-receiver');
  const tanker = tankerEvent?.linkedAssignmentId
    ? allAssignments.find((a) => a.assignmentId === tankerEvent.linkedAssignmentId)?.callsign
    : null;

  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 1.5 }}>
      <Box>
        <Typography variant="body2" color="text.secondary">On-Station Time</Typography>
        <Typography variant="body1">{onStationMinutes} min</Typography>
      </Box>
      <Box>
        <Typography variant="body2" color="text.secondary">Intercepts</Typography>
        <Typography variant="body1">{interceptsCompleted}/{threatContacts}</Typography>
      </Box>
      <Box sx={{ gridColumn: '1 / -1' }}>
        <Typography variant="body2" color="text.secondary">AAR Tanker</Typography>
        <Typography variant="body1">{tanker ?? 'None'}</Typography>
      </Box>
    </Box>
  );
}

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
  open,
  assignment,
  categories,
  day,
  dayAssignments,
  allAssignments,
  onClose,
}) => {
  if (!assignment) return null;

  const category = categories.find((c) => c.categoryId === assignment.categoryId);
  const catName = category?.name ?? 'Unknown';
  const startFormatted = formatHHMMSS(new Date(assignment.start));
  const endFormatted = formatHHMMSS(new Date(assignment.end));
  const duration = formatDuration(assignment.start, assignment.end);
  const statusColor = getStatusColor(assignment.status);
  const typeColor = getTypeColor(catName);
  const scenarioReferenceTime = day
    ? getScenarioReferenceTime(day, dayAssignments)
    : new Date(assignment.start);
  const flightStatus = getFlightStatus(assignment, scenarioReferenceTime);
  const flightStatusColor = getFlightStatusColor(flightStatus);

  return (
    <Drawer
      anchor="right"
      variant="persistent"
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { position: 'absolute' } }}
    >
      <Box sx={{ width: 360, p: 3 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {assignment.missionNumber}
            </Typography>
            <Typography variant="h6" sx={{ fontFamily: 'monospace', color: '#bbb', mt: 0.5, letterSpacing: '0.05em' }}>
              {assignment.callsign}
            </Typography>
          </Box>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap', mb: 2 }}>
          <Chip
            label={catName.toUpperCase()}
            size="small"
            sx={{
              color: typeColor,
              border: `1px solid ${typeColor}`,
              backgroundColor: 'transparent',
              fontWeight: 700,
              fontSize: 11,
              letterSpacing: '0.06em',
            }}
          />
          <Chip
            label={flightStatus}
            size="small"
            sx={{
              color: flightStatusColor,
              border: `1px solid ${flightStatusColor}`,
              backgroundColor: 'transparent',
              fontWeight: 700,
              fontSize: 11,
            }}
          />
          <Chip
            label={assignment.status}
            size="small"
            sx={{
              color: statusColor,
              border: `1px solid ${statusColor}`,
              backgroundColor: 'transparent',
              fontWeight: 700,
              fontSize: 11,
            }}
          />
        </Box>

        <Divider sx={{ mb: 2 }} />

        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">Takeoff</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{startFormatted}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Land</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{endFormatted}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Duration</Typography>
            <Typography variant="body1">{duration}</Typography>
          </Box>
        </Box>

        <Divider sx={{ my: 2 }} />
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Mission Details</Typography>
        <CategoryDetails assignment={assignment} allAssignments={allAssignments} />

        {assignment.events.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Events</Typography>
            {assignment.events.map((ev, i) => {
              const evLabel =
                ev.type === 'on-station' ? 'On Station' :
                ev.type === 'refuel-tanker' ? 'Fuel Offload' :
                ev.type === 'refuel-receiver' ? 'Fuel Receive' :
                'Strike';
              return (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.25, mb: 0.75 }}>
                  <EventLabel ev={ev} />
                  <Typography variant="body2" sx={{ color: '#d1d5db', fontWeight: 600, minWidth: 120 }}>
                    {evLabel}
                  </Typography>
                  <Typography variant="body2" sx={{ fontFamily: 'monospace', color: '#aaa' }}>
                    {formatHHMMSS(new Date(ev.time))}
                  </Typography>
                </Box>
              );
            })}
          </>
        )}
      </Box>
    </Drawer>
  );
};

