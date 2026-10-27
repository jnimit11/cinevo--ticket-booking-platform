export function formatDuration(minutes) {
  if (!Number.isFinite(minutes) || minutes <= 0) return "";

  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return hours ? `${hours}h ${remainingMinutes}m` : `${minutes} min`;
}
