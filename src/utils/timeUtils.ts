export function formatHHMMSS(date: Date): string {
  const h = String(date.getHours()).padStart(2, '0');
  const m = String(date.getMinutes()).padStart(2, '0');
  const s = String(date.getSeconds()).padStart(2, '0');
  return `${h}${m}${s}`;
}

export function generateHourMarks(start: Date, end: Date): Date[] {
  const marks: Date[] = [];
  const current = new Date(start);
  // Round up to next hour if not already on the hour
  if (current.getMinutes() !== 0 || current.getSeconds() !== 0) {
    current.setHours(current.getHours() + 1, 0, 0, 0);
  }
  while (current <= end) {
    marks.push(new Date(current));
    current.setHours(current.getHours() + 1);
  }
  return marks;
}

export function formatDuration(startISO: string, endISO: string): string {
  const ms = new Date(endISO).getTime() - new Date(startISO).getTime();
  const totalMinutes = Math.round(ms / 60000);
  const hours = Math.floor(totalMinutes / 60);
  const minutes = totalMinutes % 60;
  if (hours === 0) return `${minutes}m`;
  if (minutes === 0) return `${hours}h`;
  return `${hours}h ${minutes}m`;
}
