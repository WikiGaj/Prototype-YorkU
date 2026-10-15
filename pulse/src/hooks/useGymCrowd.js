import { useState, useEffect, useCallback, useRef } from 'react';
import {
  FACILITY_MAX_CAPACITY,
  getOperatingHours,
  isFacilityOpen,
  getBaseline,
  applyTrendWeighting,
  occupancyToTier,
  occupancyToPeople,
  forecastHours,
  findBestTime,
  getActiveClassBlock,
  isDuringClass,
  TIERS,
} from '../data/gymCapacity';

/**
 * useGymCrowd — hook that simulates live check-in data streaming from the
 * Tait McKenzie database and runs the forecasting engine.
 *
 * Exposes 6 test states that cover the eval criteria:
 *   1. happyPath       — standard open hours, live data streaming
 *   2. offHours        — facility closed at 11:30 PM
 *   3. surgeSpike      — sudden surge, tier flips to High within 60 s
 *   4. weekend         — Saturday morning, weekend model applied
 *   5. offlineData     — DB connection drops, historical-only banner
 *   6. guardrailConflict — recommendation muted during class / after hours
 */

// --- Test state definitions ------------------------------------------------
export const TEST_STATES = [
  {
    key: 'happyPath',
    label: 'Happy Path',
    description: 'Live occupancy and 8-hour projection during open hours.',
    simulatedTime: null,         // use real time
    dataOnline: true,
    liveOverride: null,          // derive from baseline
    trendBias: 2,
    surge: false,
  },
  {
    key: 'offHours',
    label: 'Off-Hours / Closed',
    description: 'Facility closed at 11:30 PM — no forecast shown.',
    simulatedTime: { hour: 23, minute: 30, day: 2 }, // Tuesday 11:30 PM
    dataOnline: true,
    liveOverride: 0,
    trendBias: 0,
    surge: false,
  },
  {
    key: 'surgeSpike',
    label: 'Surge Spike',
    description: 'Sudden surge of check-ins — tier adjusts to High within 60 s.',
    simulatedTime: { hour: 16, minute: 0, day: 2 }, // Tuesday 4:00 PM
    dataOnline: true,
    liveOverride: 88, // immediately High
    trendBias: 0,
    surge: true,
  },
  {
    key: 'weekend',
    label: 'Weekend Curve',
    description: 'Saturday morning — historical weekend models applied.',
    simulatedTime: { hour: 9, minute: 0, day: 6 }, // Saturday 9:00 AM
    dataOnline: true,
    liveOverride: null,
    trendBias: 0,
    surge: false,
  },
  {
    key: 'offlineData',
    label: 'Offline / Missing Data',
    description: 'Database connection drops — historical estimates only.',
    simulatedTime: null,
    dataOnline: false,
    liveOverride: null,
    trendBias: 1,
    surge: false,
  },
  {
    key: 'guardrailConflict',
    label: 'Guardrail Conflict',
    description: 'Recommendation muted during a scheduled class block.',
    simulatedTime: { hour: 11, minute: 0, day: 1 }, // Monday 11:00 AM (class block)
    dataOnline: true,
    liveOverride: 35,
    trendBias: 0,
    surge: false,
  },
];

function getSimulatedDate(simulatedTime) {
  if (!simulatedTime) return new Date();
  const d = new Date();
  d.setHours(simulatedTime.hour, simulatedTime.minute, 0, 0);
  // Set the day of week if provided
  if (simulatedTime.day != null) {
    const currentDay = d.getDay();
    const diff = (simulatedTime.day - currentDay + 7) % 7;
    d.setDate(d.getDate() + diff);
  }
  return d;
}

export default function useGymCrowd() {
  const [stateKey, setStateKey] = useState('happyPath');
  const [now, setNow] = useState(new Date());
  const [surgeProgress, setSurgeProgress] = useState(0);
  const timerRef = useRef(null);

  const state = TEST_STATES.find((s) => s.key === stateKey) ?? TEST_STATES[0];
  const simDate = getSimulatedDate(state.simulatedTime);
  const facilityOpen = isFacilityOpen(simDate);
  const operatingHours = getOperatingHours(simDate.getDay());
  const activeClass = getActiveClassBlock(simDate);
  const dataOnline = state.dataOnline;

  // --- Live occupancy simulation -------------------------------------------
  // For real-time mode (happyPath), derive live occupancy from baseline +
  // small random walk. For surge, ramp up over 60 s. For offline, return null.
  const liveOccupancyPct = (() => {
    if (!dataOnline) return null;
    if (!facilityOpen) return 0;

    if (state.surge) {
      // surgeProgress goes 0→1 over 60 s; occupancy ramps from baseline to override
      const baseline = getBaseline(simDate.getDay(), simDate.getHours() + simDate.getMinutes() / 60);
      const target = state.liveOverride ?? 88;
      return Math.round(baseline + (target - baseline) * surgeProgress);
    }

    if (state.liveOverride != null) return state.liveOverride;

    const baseline = getBaseline(simDate.getDay(), simDate.getHours() + simDate.getMinutes() / 60);
    const trended = applyTrendWeighting(baseline, state.trendBias);
    // Small random fluctuation ±5 %
    const noise = (Math.random() - 0.5) * 10;
    return Math.max(0, Math.min(100, Math.round(trended + noise)));
  })();

  // --- Forecast ------------------------------------------------------------
  const forecast = facilityOpen
    ? forecastHours(simDate, liveOccupancyPct, state.trendBias, dataOnline)
    : [];

  const bestTime = facilityOpen
    ? findBestTime(simDate, forecast)
    : null;

  // --- Recommendation with guardrails --------------------------------------
  // Muted if: facility closed, data offline, during active class, or no valid slot.
  const recommendationMuted =
    !facilityOpen ||
    !dataOnline ||
    activeClass !== null ||
    bestTime === null;

  // --- Tick: update `now` every 10 s for real-time states, and surge ramp ---
  useEffect(() => {
    setSurgeProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (state.simulatedTime === null) {
        setNow(new Date());
      }
      if (state.surge) {
        setSurgeProgress((p) => Math.min(1, p + 10 / 60)); // reach 1 in 60 s
      }
    }, 10000);

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [stateKey, state.simulatedTime, state.surge]);

  const changeState = useCallback((key) => {
    setStateKey(key);
  }, []);

  return {
    stateKey,
    state,
    changeState,
    now: state.simulatedTime ? simDate : now,
    simDate,
    facilityOpen,
    operatingHours,
    liveOccupancyPct,
    liveOccupancyPeople: liveOccupancyPct != null ? occupancyToPeople(liveOccupancyPct) : null,
    liveTier: liveOccupancyPct != null ? occupancyToTier(liveOccupancyPct) : null,
    forecast,
    bestTime,
    activeClass,
    recommendationMuted,
    dataOnline,
    maxCapacity: FACILITY_MAX_CAPACITY,
    TIERS,
  };
}
