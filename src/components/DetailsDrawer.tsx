import React from 'react';
import {
  Drawer,
  Box,
  Typography,
  Divider,
  IconButton,
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

export const DetailsDrawer: React.FC<DetailsDrawerProps> = ({
  open,
  assignment,
  categories,
  onClose,
}) => {
  if (!assignment) {
    return null;
  }

  const category = categories.find(c => c.categoryId === assignment.categoryId);
  const startFormatted = formatHHMMSS(new Date(assignment.start));
  const endFormatted = formatHHMMSS(new Date(assignment.end));
  const duration = formatDuration(assignment.start, assignment.end);

  const getRiskColor = (risk: string): string => {
    const lowerRisk = risk.toLowerCase();
    if (lowerRisk.includes('high')) return '#d32f2f';
    if (lowerRisk.includes('medium')) return '#f57c00';
    if (lowerRisk.includes('low')) return '#388e3c';
    return 'inherit';
  };

  return (
    <Drawer
      anchor="right"
      variant="persistent"
      open={open}
      onClose={onClose}
      sx={{ '& .MuiDrawer-paper': { position: 'absolute' } }}
    >
      <Box sx={{ width: 400, p: 3 }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 3 }}>
          <Typography variant="h5" sx={{ fontWeight: 'bold', flex: 1 }}>
            {assignment.title}
          </Typography>
          <IconButton onClick={onClose} edge="end">
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Assignment Details */}
        <Box sx={{ mb: 2 }}>
          <Typography variant="body2" color="text.secondary">
            Worker
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {assignment.workerDisplay}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Category
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {category?.name || 'Unknown'}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Start
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {startFormatted}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            End
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {endFormatted}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Duration
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {duration}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Status
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {assignment.status}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Location
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {assignment.location}
          </Typography>
        </Box>

        <Divider sx={{ my: 3 }} />

        {/* Drawer Details */}
        <Box>
          <Typography variant="body2" color="text.secondary">
            Work Order
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {assignment.drawer.workOrder}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Supervisor
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {assignment.drawer.supervisor}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Notes
          </Typography>
          <Typography variant="body1" sx={{ mb: 2 }}>
            {assignment.drawer.notes}
          </Typography>

          <Typography variant="body2" color="text.secondary">
            Risk
          </Typography>
          <Typography
            variant="body1"
            sx={{
              color: getRiskColor(assignment.drawer.risk),
              fontWeight: 'medium',
            }}
          >
            {assignment.drawer.risk}
          </Typography>
        </Box>
      </Box>
    </Drawer>
  );
};
