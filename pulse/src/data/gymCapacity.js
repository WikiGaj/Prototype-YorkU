/**
 * Gym capacity data model and forecasting engine.
 *
 * Simulates read-only hourly queries against the Tait McKenzie check-in
 * database. No new data sources or hardware — this module stands in for
 * the real database with realistic historical baselines and live check-in
 * patterns so the feature is fully demonstrable.
 *
 * Forecasting approach:
 *   1. Historical hourly baselines per day-of-week × hour, derived from a
 *      weighted 4-week average (most recent week weighted highest).
 *   2. Live deviation: the delta between current actual occupancy and the
 *      baseline for the current hour, propagated forward with exponential
 *      decay so a live surge influences near-term predictions.
 *   3. Occupancy % → traffic tier: Low < 40 %, Medium 40–75 %, High > 75 %.
 */

// --- Facility parameters --------------------------------------------------
export const FACILITY_MAX_CAPACITY = 300;

export const OPERATING_HOURS = {
  // 0 = Sunday … 6 = Saturday
  weekday: { open: 6, close: 23 },  // 6:00 AM – 11:00 PM
  weekend: { open: 8, close: 21 },  // 8:00 AM –  9:00 PM
};

export function getOperatingHours(dayOfWeek) {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  return isWeekend ? OPERATING_HOURS.weekend : OPERATING_HOURS.weekday;
}

export function isFacilityOpen(date) {
  const day = date.getDay();
  const hour = date.getHours() + date.getMinutes() / 60;
  const hrs = getOperatingHours(day);
  return hour >= hrs.open && hour < hrs.close;
}

// --- Sample class timetable (guardrail) -----------------------------------
// day: 1 = Monday … 5 = Friday.  Times are 24 h strings "HH:MM".
export const SAMPLE_CLASS_SCHEDULE = [
  { day: 1, start: '10:30', end: '12:00', name: 'Introduction to Psychology' },
  { day: 1, start: '13:00', end: '14:30', name: 'Calculus I' },
  { day: 2, start: '09:00', end: '10:30', name: 'English Composition' },
  { day: 2, start: '14:00', end: '15:30', name: 'Biology Lab' },
  { day: 3, start: '10:30', end: '12:00', name: 'Introduction to Psychology' },
  { day: 3, start: '13:00', end: '14:30', name: 'Calculus I' },
  { day: 4, start: '09:00', end: '10:30', name: 'English Composition' },
  { day: 4, start: '14:00', end: '15:30', name: 'Biology Lab' },
  { day: 5, start: '10:30', end: '12:00', name: 'Introduction to Psychology' },
];

function parseTimeStr(s) {
  const [h, m] = s.split(':').map(Number);
  return h + m / 60;
}

/**
 * Returns the active class block for the given date, or null.
 */
export function getActiveClassBlock(date) {
  const day = date.getDay();
  const hour = date.getHours() + date.getMinutes() / 60;
  return (
    SAMPLE_CLASS_SCHEDULE.find((c) => {
      if (c.day !== day) return false;
      return hour >= parseTimeStr(c.start) && hour < parseTimeStr(c.end);
    }) || null
  );
}

/**
 * Returns true if the given hour falls inside a scheduled class block.
 */
export function isDuringClass(date) {
  return getActiveClassBlock(date) !== null;
}

// --- Historical baseline curves -------------------------------------------
// Occupancy percentage (0–100) by day-of-week × hour.
// Weekday curve: morning rush (7–9), lunch bump (12–14), after-class peak
// (16–19).  Weekend curve: gentler, midday peak (10–14).

function buildWeekdayCurve() {
  const c = new Array(24).fill(0);
  for (let h = 0; h < 24; h++) {
    if (h < 6 || h >= 23) { c[h] = 0; continue; }
    // Morning rush 7–9
    const morning = Math.exp(-Math.pow(h - 8, 2) / 2) * 45;
    // Lunch bump 12–14
    const lunch = Math.exp(-Math.pow(h - 13, 2) / 2.5) * 50;
    // After-class peak 16–19
    const peak = Math.exp(-Math.pow(h - 17.5, 2) / 3) * 85;
    // Base ambient
    const base = 20;
    c[h] = Math.min(95, Math.round(morning + lunch + peak + base));
  }
  return c;
}

function buildWeekendCurve() {
  const c = new Array(24).fill(0);
  for (let h = 0; h < 24; h++) {
    if (h < 8 || h >= 21) { c[h] = 0; continue; }
    // Midday peak 10–14
    const midday = Math.exp(-Math.pow(h - 12, 2) / 4) * 60;
    const base = 15;
    c[h] = Math.min(80, Math.round(midday + base));
  }
  return c;
}

const WEEKDAY_CURVE = buildWeekdayCurve();
const WEEKEND_CURVE = buildWeekendCurve();

/**
 * Historical baseline occupancy % for a given day-of-week and hour.
 */
export function getBaseline(dayOfWeek, hour) {
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;
  const curve = isWeekend ? WEEKEND_CURVE : WEEKDAY_CURVE;
  return curve[Math.round(hour) % 24] || 0;
}

// --- 4-week trend weighting ------------------------------------------------
// Weighted moving average: most recent week has the highest weight.
const WEEK_WEIGHTS = [0.4, 0.3, 0.2, 0.1];

/**
 * Simulates a 4-week weighted average around the baseline.
 * `trendBias` is a small per-week delta (e.g. +3 means the gym is getting
 * ~3 % busier each week).  The returned value nudges the baseline up or
 * down to reflect the recent trend.
 */
export function applyTrendWeighting(baseline, trendBias = 0) {
  const adjustment = WEEK_WEIGHTS.reduce(
    (sum, w, i) => sum + w * trendBias * (4 - i),
    0
  );
  return Math.max(0, Math.min(100, Math.round(baseline + adjustment)));
}

// --- Traffic tier mapping --------------------------------------------------
export const TIERS = {
  low: { key: 'low', label: 'Low', color: '#22C55E', threshold: [0, 40] },
  medium: { key: 'medium', label: 'Medium', color: '#FACC15', threshold: [40, 75] },
  high: { key: 'high', label: 'High', color: '#EF4444', threshold: [75, 100] },
};

export function occupancyToTier(pct) {
  if (pct < 40) return TIERS.low;
  if (pct <= 75) return TIERS.medium;
  return TIERS.high;
}

export function occupancyToPeople(pct) {
  return Math.round((pct / 100) * FACILITY_MAX_CAPACITY);
}

// --- Forecasting engine ----------------------------------------------------

/**
 * Generate an 8-hour forward forecast from `nowDate`.
 *
 * @param {Date} nowDate     — the current moment
 * @param {number} livePct   — current live occupancy % (or null if offline)
 * @param {number} trendBias — per-week trend delta (default 0)
 * @param {boolean} dataOnline — whether live data is streaming
 * @returns {Array<{ hour: number, label: string, occupancy: number, tier: object, isPast: boolean }>}
 */
export function forecastHours(nowDate, livePct, trendBias = 0, dataOnline = true) {
  const day = nowDate.getDay();
  const currentHour = nowDate.getHours() + nowDate.getMinutes() / 60;

  // Live deviation propagated forward with decay
  const currentBaseline = getBaseline(day, currentHour);
  const liveDeviation = dataOnline && livePct != null
    ? livePct - currentBaseline
    : 0;

  const hours = [];
  for (let i = 0; i < 8; i++) {
    const targetHour = currentHour + i;
    const targetDate = new Date(nowDate);
    targetDate.setHours(nowDate.getHours() + i, nowDate.getMinutes(), 0, 0);
    const targetDay = targetDate.getDay();
    const hrs = getOperatingHours(targetDay);

    const isWithinHours = targetHour >= hrs.open && targetHour < hrs.close;

    let occupancy;
    if (!isWithinHours) {
      occupancy = 0;
    } else {
      const baseline = getBaseline(targetDay, targetHour);
      const trended = applyTrendWeighting(baseline, trendBias);
      const decay = Math.pow(0.7, i); // deviation fades over hours
      occupancy = Math.max(0, Math.min(100, Math.round(trended + liveDeviation * decay)));
    }

    hours.push({
      hour: targetDate.getHours(),
      label: targetDate.toLocaleTimeString('en-US', { hour: 'numeric' }),
      occupancy,
      tier: isWithinHours ? occupancyToTier(occupancy) : null,
      isWithinHours,
      offset: i,
    });
  }
  return hours;
}

/**
 * Find the best time to go in the next 8 hours — the hour with the lowest
 * predicted occupancy that is within operating hours AND not during a
 * scheduled class block.  Returns null if no valid slot exists (guardrail).
 */
export function findBestTime(nowDate, forecast, classSchedule = SAMPLE_CLASS_SCHEDULE) {
  const candidates = forecast.filter((f) => {
    if (!f.isWithinHours) return false;
    const targetDate = new Date(nowDate);
    targetDate.setHours(nowDate.getHours() + f.offset, nowDate.getMinutes(), 0, 0);
    if (isDuringClass(targetDate)) return false;
    return true;
  });

  if (candidates.length === 0) return null;

  let best = candidates[0];
  for (const c of candidates) {
    if (c.occupancy < best.occupancy) best = c;
  }
  return best;
}
