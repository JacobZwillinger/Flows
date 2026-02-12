import { Day, Category } from '../types';
import { Select, MenuItem, TextField, InputLabel, FormControl, Box } from '@mui/material';

interface TopBarProps {
  days: Day[];
  categories: Category[];
  selectedDayId: string;
  selectedCategoryId: string | null;
  searchQuery: string;
  onDayChange: (dayId: string) => void;
  onCategoryChange: (categoryId: string | null) => void;
  onSearchChange: (query: string) => void;
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

      <FormControl size="small" sx={{ minWidth: 150 }}>
        <InputLabel>Category</InputLabel>
        <Select
          value={selectedCategoryId ?? 'all'}
          label="Category"
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
    </Box>
  );
}
