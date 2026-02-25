import { Day, Category } from '../types';
import { Select, MenuItem, TextField, InputLabel, FormControl, Box, Button } from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import GridViewIcon from '@mui/icons-material/GridView';

export type ViewMode = 'default' | 'preview' | 'cell';

interface TopBarProps {
  days: Day[];
  categories: Category[];
  selectedDayId: string;
  selectedCategoryId: string | null;
  searchQuery: string;
  onDayChange: (dayId: string) => void;
  onCategoryChange: (categoryId: string | null) => void;
  onSearchChange: (query: string) => void;
  viewMode: ViewMode;
  onSetViewMode: (mode: ViewMode) => void;
}

export function TopBar({
  days,
  categories,
  selectedDayId,
  selectedCategoryId,
  searchQuery,
  onDayChange,
  onCategoryChange,
  onSearchChange,
  viewMode,
  onSetViewMode,
}: TopBarProps) {
  return (
    <Box sx={{ display: 'flex', gap: 2, p: 2, alignItems: 'center' }}>
      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Day</InputLabel>
        <Select
          value={selectedDayId}
          label="Day"
          onChange={(e) => onDayChange(e.target.value)}
        >
          {days.map((day) => (
            <MenuItem key={day.dayId} value={day.dayId}>
              {day.label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <FormControl size="small" sx={{ minWidth: 120 }}>
        <InputLabel>Type</InputLabel>
        <Select
          value={selectedCategoryId ?? 'all'}
          label="Type"
          onChange={(e) => onCategoryChange(e.target.value === 'all' ? null : e.target.value)}
        >
          <MenuItem value="all">All</MenuItem>
          {categories.map((category) => (
            <MenuItem key={category.categoryId} value={category.categoryId}>
              {category.name}
            </MenuItem>
          ))}
        </Select>
      </FormControl>

      <TextField
        size="small"
        label="Search"
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        sx={{ minWidth: 200 }}
      />

      <Box sx={{ display: 'flex', gap: 1 }}>
        <Button
          size="small"
          variant={viewMode === 'default' ? 'contained' : 'outlined'}
          onClick={() => onSetViewMode('default')}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Default View
        </Button>
        <Button
          size="small"
          variant={viewMode === 'preview' ? 'contained' : 'outlined'}
          startIcon={<VisibilityIcon />}
          onClick={() => onSetViewMode('preview')}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Day Overview
        </Button>
        <Button
          size="small"
          variant={viewMode === 'cell' ? 'contained' : 'outlined'}
          startIcon={<GridViewIcon />}
          onClick={() => onSetViewMode('cell')}
          sx={{ whiteSpace: 'nowrap' }}
        >
          Cell Overview
        </Button>
      </Box>
    </Box>
  );
}
