export function formatReleaseDate(releaseDate) {
  if (!releaseDate) return "";

  const date = new Date(releaseDate);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "long",
    day: "numeric",
    timeZone: "UTC",
  });
}

export function getReleaseYear(releaseDate) {
  if (!releaseDate) return "";

  const year = new Date(releaseDate).getUTCFullYear();
  return Number.isNaN(year) ? "" : String(year);
}

export function formatShowtimeDateTime(startsAt) {
  if (!startsAt) return "";

  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleString(undefined, {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export function formatShowtimeTime(startsAt) {
  if (!startsAt) return "";

  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleTimeString(undefined, {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });
}

export function getShowtimeDateKey(startsAt) {
  if (!startsAt) return "";

  const date = new Date(startsAt);
  if (Number.isNaN(date.getTime())) return "";

  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatShowtimeDateParts(dateKey) {
  if (!dateKey) return { relativeLabel: "", dayName: "", dayMonth: "" };

  const [year, month, day] = dateKey.split("-").map(Number);
  const date = new Date(year, month - 1, day);
  if (Number.isNaN(date.getTime())) return { relativeLabel: "", dayName: "", dayMonth: "" };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const compareDate = new Date(year, month - 1, day);
  compareDate.setHours(0, 0, 0, 0);

  const diffDays = Math.round(
    (compareDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24),
  );
  let relativeLabel;
  if (diffDays === 0) {
    relativeLabel = "Today";
  } else if (diffDays === 1) {
    relativeLabel = "Tomorrow";
  } else if (diffDays > 1 && diffDays < 7) {
    const dayOfWeek = date.getDay();
    relativeLabel = dayOfWeek === 0 || dayOfWeek === 6 ? "Weekend" : "Weekday";
  } else {
    relativeLabel = "Screening";
  }

  const dayName = date
    .toLocaleDateString(undefined, { weekday: "long" })
    .toUpperCase();
  const dayMonth = `${day} ${date
    .toLocaleDateString(undefined, { month: "short" })
    .toUpperCase()}`;

  return { relativeLabel, dayName, dayMonth };
}
