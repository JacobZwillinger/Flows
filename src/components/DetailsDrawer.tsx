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
import FlightTakeoffIcon from '@mui/icons-material/FlightTakeoff';
import FlightLandIcon from '@mui/icons-material/FlightLand';
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

interface SubwayStop {
  time: Date;
  label: string;
  detail?: string;
  type: 'takeoff' | 'landing' | 'on-station' | 'off-station' | 'refuel' | 'strike';
}

function stopPriority(stop: SubwayStop): number {
  switch (stop.type) {
    case 'takeoff': return 0;
    case 'on-station': return 1;
    case 'refuel': return 2;
    case 'strike': return 3;
    case 'off-station': return 4;
    case 'landing': return 5;
    default: return 10;
  }
}

function buildSubwayStops(assignment: Assignment, allAssignments: Assignment[]): SubwayStop[] {
  const stops: SubwayStop[] = [
    {
      time: new Date(assignment.start),
      label: 'Takeoff',
      type: 'takeoff',
    },
    {
      time: new Date(assignment.end),
      label: 'Landing',
      type: 'landing',
    },
  ];

  for (const ev of assignment.events) {
    if (ev.type === 'on-station') {
      stops.push({
        time: new Date(ev.time),
        label: 'On Station',
        type: 'on-station',
      });
      if (ev.endTime) {
        stops.push({
          time: new Date(ev.endTime),
          label: 'Off Station',
          type: 'off-station',
        });
      }
      continue;
    }

    if (ev.type === 'refuel-tanker' || ev.type === 'refuel-receiver') {
      const linked = ev.linkedAssignmentId
        ? allAssignments.find((a) => a.assignmentId === ev.linkedAssignmentId)
        : null;
      const isTanker = ev.type === 'refuel-tanker';
      stops.push({
        time: new Date(ev.time),
        label: isTanker ? 'Fuel Offload' : 'Fuel Receive',
        detail: `${linked?.callsign ?? 'UNKNOWN'} • ${formatFuelLbs(ev.fuelLbs ?? 0)} lbs`,
        type: 'refuel',
      });
      continue;
    }

    stops.push({
      time: new Date(ev.time),
      label: 'Strike',
      detail: `${ev.dmpiCount ?? 1} DMPIs`,
      type: 'strike',
    });
  }

  return stops.sort((a, b) => {
    const timeDiff = a.time.getTime() - b.time.getTime();
    if (timeDiff !== 0) return timeDiff;
    return stopPriority(a) - stopPriority(b);
  });
}

function SubwayStopIcon({ type }: { type: SubwayStop['type'] }) {
  if (type === 'takeoff') return <FlightTakeoffIcon sx={{ fontSize: 15, color: EVENT_ICON_COLOR }} />;
  if (type === 'landing') return <FlightLandIcon sx={{ fontSize: 15, color: EVENT_ICON_COLOR }} />;
  if (type === 'refuel') return <LocalGasStationIcon sx={{ fontSize: 14, color: EVENT_ICON_COLOR }} />;
  if (type === 'strike') return <CrisisAlertIcon sx={{ fontSize: 14, color: EVENT_ICON_COLOR }} />;
  return <span style={{ width: 14, display: 'inline-block', color: '#777' }}>•</span>;
}

function MissionSubwayMap({ stops }: { stops: SubwayStop[] }) {
  return (
    <Box sx={{ position: 'relative', pl: 1.5 }}>
      <Box
        sx={{
          position: 'absolute',
          left: 16,
          top: 10,
          bottom: 10,
          width: 2,
          backgroundColor: '#374151',
        }}
      />
      {stops.map((stop, idx) => (
        <Box key={`${stop.label}-${stop.time.toISOString()}-${idx}`} sx={{ display: 'flex', gap: 1.5, mb: 1.2, position: 'relative' }}>
          <Box
            sx={{
              width: 18,
              height: 18,
              borderRadius: '50%',
              border: '1px solid #4b5563',
              backgroundColor: '#111827',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              mt: 0.15,
            }}
          >
            <SubwayStopIcon type={stop.type} />
          </Box>
          <Box sx={{ minWidth: 0 }}>
            <Typography variant="body2" sx={{ color: '#d1d5db', fontWeight: 700, lineHeight: 1.2 }}>
              {stop.label}
            </Typography>
            <Typography variant="caption" sx={{ color: '#9ca3af', fontFamily: 'monospace' }}>
              {formatHHMMSS(stop.time)}Z
            </Typography>
            {stop.detail && (
              <Typography variant="caption" sx={{ display: 'block', color: '#93c5fd', lineHeight: 1.15 }}>
                {stop.detail}
              </Typography>
            )}
          </Box>
        </Box>
      ))}
    </Box>
  );
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
  const subwayStops = buildSubwayStops(assignment, allAssignments);

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
        <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Mission Subway</Typography>
        <MissionSubwayMap stops={subwayStops} />

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
