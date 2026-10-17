/**
 * Gym capacity data model and forecasting engine.
 *
 * This is a prototype/MVP — all crowd levels are simulated for demonstration
 * purposes and do not reflect live or real-time occupancy data.
 *
 * Forecasting approach:
 *   1. Distinct weekday and weekend baseline curves based on historical
 *      patterns. Weekday: morning rush, lunch bump, evening peak.
 *      Weekend: gentler midday peak.
 *   2. Occupancy → traffic tier: Low < 40%, Medium 40–75%, High > 75%.
 *      Only the qualitative tier (Low/Medium/High) is shown to users.
 *   3. Forecasts are only generated within operating hours.
 */

// --- Facility parameters --------------------------------------------------
// 0 = Sunday … 6 = Saturday
export const OPERATING_HOURS = {
  weekday:   { open: 7,  close: 22 },  // Mon–Fri: 7:00 AM – 10:00 PM
  saturday:  { open: 9,  close: 21 },  // Saturday: 9:00 AM – 9:00 PM
  sunday:    { open: 9,  close: 16 },  // Sunday: 9:00 AM – 4:00 PM
};

export function getOperatingHours(dayOfWeek) {
  if (dayOfWeek === 0) return OPERATING_HOURS.sunday;
  if (dayOfWeek === 6) return OPERATING_HOURS.saturday;
  return OPERATING_HOURS.weekday;
}

export function isFacilityOpen(date) {
  const day = date.getDay();
  const hour = date.getHours() + date.getMinutes() / 60;
  const hrs = getOperatingHours(day);
  return hour >= hrs.open && hour < hrs.close;
}

/**
 * Given a date when the facility is closed, find the next opening time.
 * Returns a Date object for the next opening, or null if none found within
 * a reasonable window (scans up to 7 days).
 */
export function getNextOpeningTime(fromDate) {
  for (let i = 0; i < 7; i++) {
    const d = new Date(fromDate);
    d.setDate(d.getDate() + i);
    d.setHours(0, 0, 0, 0);

    const day = d.getDay();
    const hrs = getOperatingHours(day);
    const openingDate = new Date(d);
    openingDate.setHours(hrs.open, 0, 0, 0);

    // If today and opening time has already passed, skip
    if (i === 0 && openingDate <= fromDate) continue;

    return openingDate;
  }
  return null;
}

// --- Historical baseline curves -------------------------------------------
// Internal occupancy percentage (0–100) by hour.
// Only the qualitative tier is shown to users.

function buildWeekdayCurve() {
  const c = new Array(24).fill(0);
  for (let h = 0; h < 24; h++) {
    if (h < 7 || h >= 22) { c[h] = 0; continue; }
    const morning = Math.exp(-Math.pow(h - 8, 2) / 2) * 45;
    const lunch = Math.exp(-Math.pow(h - 13, 2) / 2.5) * 50;
    const peak = Math.exp(-Math.pow(h - 18, 2) / 3) * 85;
    const base = 20;
    c[h] = Math.min(95, Math.round(morning + lunch + peak + base));
  }
  return c;
}

function buildSaturdayCurve() {
  const c = new Array(24).fill(0);
  for (let h = 0; h < 24; h++) {
    if (h < 9 || h >= 21) { c[h] = 0; continue; }
    const midday = Math.exp(-Math.pow(h - 13, 2) / 4) * 60;
    const evening = Math.exp(-Math.pow(h - 18, 2) / 3) * 45;
    const base = 18;
    c[h] = Math.min(80, Math.round(midday + evening + base));
  }
  return c;
}

function buildSundayCurve() {
  const c = new Array(24).fill(0);
  for (let h = 0; h < 24; h++) {
    if (h < 9 || h >= 16) { c[h] = 0; continue; }
    const midday = Math.exp(-Math.pow(h - 12, 2) / 3) * 50;
    const base = 15;
    c[h] = Math.min(70, Math.round(midday + base));
  }
  return c;
}

const WEEKDAY_CURVE = buildWeekdayCurve();
const SATURDAY_CURVE = buildSaturdayCurve();
const SUNDAY_CURVE = buildSundayCurve();

export function getBaseline(dayOfWeek, hour) {
  let curve;
  if (dayOfWeek === 0) curve = SUNDAY_CURVE;
  else if (dayOfWeek === 6) curve = SATURDAY_CURVE;
  else curve = WEEKDAY_CURVE;
  return curve[Math.round(hour) % 24] || 0;
}

// --- Trend weighting -------------------------------------------------------
const WEEK_WEIGHTS = [0.4, 0.3, 0.2, 0.1];

export function applyTrendWeighting(baseline, trendBias = 0) {
  const adjustment = WEEK_WEIGHTS.reduce(
    (sum, w, i) => sum + w * trendBias * (4 - i),
    0
  );
  return Math.max(0, Math.min(100, Math.round(baseline + adjustment)));
}

// --- Traffic tier mapping --------------------------------------------------
export const TIERS = {
  low: { key: 'low', label: 'Low', color: '#4ADE80', bg: 'rgba(74,222,128,0.12)', border: 'rgba(74,222,128,0.35)' },
  medium: { key: 'medium', label: 'Medium', color: '#FBBF24', bg: 'rgba(251,191,36,0.12)', border: 'rgba(251,191,36,0.35)' },
  high: { key: 'high', label: 'High', color: '#F87171', bg: 'rgba(248,113,113,0.12)', border: 'rgba(248,113,113,0.35)' },
};

export function occupancyToTier(pct) {
  if (pct < 40) return TIERS.low;
  if (pct <= 75) return TIERS.medium;
  return TIERS.high;
}

// --- Forecasting engine ----------------------------------------------------

/**
 * Generate a forward forecast from `nowDate` covering remaining operating
 * hours. Only hours within operating hours are included — closed hours
 * are excluded entirely (not shown as zero bars).
 *
 * @param {Date} nowDate     — the current moment
 * @param {number} livePct   — current occupancy % (internal, or null)
 * @param {number} trendBias — per-week trend delta
 * @param {boolean} dataOnline — whether data is available
 * @returns {Array<{ hour, label, tier, isWithinHours, offset }> | null}
 *   Returns null if dataOnline is false (missing data).
 *   Returns [] if no operating hours remain today.
 */
export function forecastHours(nowDate, livePct, trendBias = 0, dataOnline = true) {
  if (!dataOnline) return null;

  const day = nowDate.getDay();
  const currentHour = nowDate.getHours() + nowDate.getMinutes() / 60;
  const currentBaseline = getBaseline(day, currentHour);
  const liveDeviation = livePct != null
    ? livePct - currentBaseline
    : 0;

  const hours = [];
  for (let i = 0; i < 13; i++) {
    const targetDate = new Date(nowDate);
    targetDate.setHours(nowDate.getHours() + i, nowDate.getMinutes(), 0, 0);
    const targetDay = targetDate.getDay();
    const targetHour = targetDate.getHours() + nowDate.getMinutes() / 60;
    const hrs = getOperatingHours(targetDay);

    const isWithinHours = targetHour >= hrs.open && targetHour < hrs.close;
    if (!isWithinHours) continue;

    const baseline = getBaseline(targetDay, targetHour);
    const decay = Math.pow(0.7, i);
    const occupancy = Math.max(0, Math.min(100, Math.round(baseline + liveDeviation * decay)));

    const tier = occupancyToTier(occupancy);
    const tierLevel = { low: 0, medium: 1, high: 2 };

    hours.push({
      hour: targetDate.getHours(),
      label: targetDate.toLocaleTimeString('en-US', { hour: 'numeric' }),
      tier,
      level: tierLevel[tier.key],
      isWithinHours: true,
      offset: i,
    });
  }
  return hours;
}

/**
 * Find the best time to go — the hour with the lowest predicted traffic
 * that is within operating hours.
 * Returns null if no valid slot exists.
 */
export function findBestTime(nowDate, forecast) {
  if (!forecast || forecast.length === 0) return null;

  const candidates = forecast;

  if (candidates.length === 0) return null;

  // Priority: Low > Medium > High
  const tierOrder = { low: 0, medium: 1, high: 2 };
  let best = candidates[0];
  for (const c of candidates) {
    if (tierOrder[c.tier.key] < tierOrder[best.tier.key]) best = c;
  }
  return best;
}
