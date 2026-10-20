export interface ElevationDatum {
  date: string;
  value: number;
  meta?: string;
}
export interface MatrixCell extends ElevationDatum {
  week: number;
  day: number;
  level: number;
  index: number;
}
export const DAY = 86_400_000;
export const LEVEL_LABELS = [
  "No activity",
  "Low",
  "Moderate",
  "High",
  "Exceptional",
];

export function parseDate(date: string): number {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date))
    throw new Error(`Invalid date: ${date}. Use YYYY-MM-DD.`);
  const time = Date.parse(`${date}T00:00:00Z`);
  if (
    !Number.isFinite(time) ||
    new Date(time).toISOString().slice(0, 10) !== date
  )
    throw new Error(`Invalid date: ${date}`);
  return time;
}

/** Stable sample: exactly 365 UTC dates, with recurring quiet days and activity bursts. */
export function generateElevationData(
  endDate = "2026-10-18",
): ElevationDatum[] {
  const end = parseDate(endDate);
  let seed = 48721;
  const random = () => {
    seed = (seed * 16807) % 2147483647;
    return (seed - 1) / 2147483646;
  };
  return Array.from({ length: 365 }, (_, i) => {
    const time = end - (364 - i) * DAY;
    const weekend = [0, 6].includes(new Date(time).getUTCDay());
    const wave = (Math.sin(i / 15) + 1) * 9;
    const value =
      random() < (weekend ? 0.38 : 0.1)
        ? 0
        : Math.round(
            (5 + random() * 23 + wave + (random() > 0.93 ? 42 : 0)) *
              (weekend ? 0.55 : 1),
          );
    return {
      date: new Date(time).toISOString().slice(0, 10),
      value,
      meta: value > 55 ? "An extraordinary day" : undefined,
    };
  });
}

/** Last 365 days ending on the latest input date; missing dates are zero-filled. */
export function buildMatrix(data: ElevationDatum[]) {
  const values = new Map<string, ElevationDatum>();
  let end = -Infinity;
  for (const entry of data) {
    const time = parseDate(entry.date);
    if (!Number.isFinite(entry.value) || entry.value < 0)
      throw new Error(
        `Invalid value for ${entry.date}: use a finite number ≥ 0.`,
      );
    if (values.has(entry.date))
      throw new Error(`Duplicate date: ${entry.date}`);
    values.set(entry.date, entry);
    end = Math.max(end, time);
  }
  if (!data.length)
    return {
      cells: [] as MatrixCell[],
      weeks: 53,
      total: 0,
      streak: 0,
      record: undefined as MatrixCell | undefined,
      max: 0,
    };
  const start = end - 364 * DAY;
  const offset = (new Date(start).getUTCDay() + 6) % 7;
  const inWindow = [...values.values()].filter(
    (d) => parseDate(d.date) >= start,
  );
  const max = Math.max(0, ...inWindow.map((d) => d.value));
  const cells: MatrixCell[] = Array.from({ length: 365 }, (_, index) => {
    const date = new Date(start + index * DAY).toISOString().slice(0, 10);
    const entry = values.get(date) ?? { date, value: 0 };
    return {
      ...entry,
      index,
      week: Math.floor((index + offset) / 7),
      day: (index + offset) % 7,
      level:
        entry.value === 0 ? 0 : Math.min(4, Math.ceil((entry.value / max) * 4)),
    };
  });
  let streak = 0;
  for (let i = cells.length - 1; i >= 0 && cells[i].value > 0; i--) streak++;
  return {
    cells,
    weeks: Math.ceil((365 + offset) / 7),
    max,
    total: cells.reduce((s, c) => s + c.value, 0),
    streak,
    record:
      max > 0 ? cells.reduce((a, b) => (b.value > a.value ? b : a)) : undefined,
  };
}
