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
import { Assignment, Category } from '../types';
import { formatHHMMSS, formatDuration } from '../utils/timeUtils';

interface DetailsDrawerProps {
  open: boolean;
  assignment: Assignment | null;
  categories: Category[];
  onClose: () => void;
}

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
    case 'CAP':    return '#4CAF7D';
    default:       return '#9E9E9E';
  }
}

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
  open,
  assignment,
  categories,
  onClose,
}) => {
  if (!assignment) return null;

  const category = categories.find(c => c.categoryId === assignment.categoryId);
  const catName = category?.name ?? 'Unknown';
  const startFormatted = formatHHMMSS(new Date(assignment.start));
  const endFormatted = formatHHMMSS(new Date(assignment.end));
  const duration = formatDuration(assignment.start, assignment.end);
  const statusColor = getStatusColor(assignment.status);
  const typeColor = getTypeColor(catName);

  return (
    <Drawer
      anchor="right"
      variant="persistent"
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { position: 'absolute' } }}
    >
      <Box sx={{ width: 340, p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 2 }}>
          <Box>
            <Typography variant="h4" sx={{ fontWeight: 800, lineHeight: 1, fontVariantNumeric: 'tabular-nums' }}>
              {assignment.missionNumber}
            </Typography>
            <Typography
              variant="h6"
              sx={{ fontFamily: 'monospace', color: '#bbb', mt: 0.5, letterSpacing: '0.05em' }}
            >
              {assignment.callsign}
            </Typography>
          </Box>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Type + Status chips */}
        <Box sx={{ display: 'flex', gap: 1, mb: 3 }}>
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

        {/* Time details */}
        <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mb: 2 }}>
          <Box>
            <Typography variant="body2" color="text.secondary">On Station</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{startFormatted}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Off Station</Typography>
            <Typography variant="body1" sx={{ fontFamily: 'monospace' }}>{endFormatted}</Typography>
          </Box>
          <Box>
            <Typography variant="body2" color="text.secondary">Duration</Typography>
            <Typography variant="body1">{duration}</Typography>
          </Box>
        </Box>

        {/* Events */}
        {assignment.events.length > 0 && (
          <>
            <Divider sx={{ my: 2 }} />
            <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>Events</Typography>
            {assignment.events.map((ev, i) => {
              const evColor =
                ev.type === 'on-station' ? '#FFD700' :
                ev.type === 'refuel-tanker' ? '#4ADE80' :
                ev.type === 'refuel-receiver' ? '#FACC15' :
                '#EF4444';
              const evLabel =
                ev.type === 'on-station' ? 'On Station' :
                ev.type === 'refuel-tanker' ? 'Refuel (Tanker)' :
                ev.type === 'refuel-receiver' ? 'Refuel (Receiver)' :
                'Strike';
              return (
                <Box key={i} sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 0.75 }}>
                  <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: evColor, flexShrink: 0 }} />
                  <Typography variant="body2" sx={{ color: evColor, fontWeight: 600, minWidth: 120 }}>
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
