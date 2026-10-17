import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  getOperatingHours,
  isFacilityOpen,
  getBaseline,
  applyTrendWeighting,
  occupancyToTier,
  forecastHours,
  findBestTime,
  getActiveClassBlock,
  getNextOpeningTime,
  TIERS,
} from '../data/gymCapacity';

/**
 * useGymCrowd — hook that simulates crowd data for the fitness centre.
 *
 * All data is simulated for demonstration purposes. This is a prototype
 * and is not connected to live or real-time occupancy data.
 *
 * Test states:
 *   1. happyPath       — standard open hours
 *   2. offHours        — facility closed, shows next opening
 *   3. surgeSpike      — sudden surge, tier flips to High
 *   4. weekend         — Saturday, weekend pattern
 *   5. offlineData     — data unavailable, friendly message
 *   6. guardrailConflict — recommendation muted during class
 */

// --- Test state definitions ------------------------------------------------
export const TEST_STATES = [
  {
    key: 'happyPath',
    label: 'Happy Path',
    description: 'Simulated crowd levels during open hours with forecast.',
    simulatedTime: null,
    dataOnline: true,
    liveOverride: null,
    trendBias: 2,
    surge: false,
  },
  {
    key: 'offHours',
    label: 'Off-Hours / Closed',
    description: 'Facility is closed — shows next opening time.',
    simulatedTime: { hour: 21, minute: 0, day: 2 }, // Tuesday 9:00 PM (after close)
    dataOnline: true,
    liveOverride: 0,
    trendBias: 0,
    surge: false,
  },
  {
    key: 'surgeSpike',
    label: 'Surge Spike',
    description: 'Sudden surge — traffic level shifts to High.',
    simulatedTime: { hour: 17, minute: 0, day: 2 }, // Tuesday 5:00 PM
    dataOnline: true,
    liveOverride: 88,
    trendBias: 0,
    surge: true,
  },
  {
    key: 'weekend',
    label: 'Weekend',
    description: 'Saturday morning — weekend forecast pattern applied.',
    simulatedTime: { hour: 10, minute: 0, day: 6 }, // Saturday 10:00 AM
    dataOnline: true,
    liveOverride: null,
    trendBias: 0,
    surge: false,
  },
  {
    key: 'offlineData',
    label: 'Missing Data',
    description: 'Forecast data is unavailable — friendly message shown.',
    simulatedTime: null,
    dataOnline: false,
    liveOverride: null,
    trendBias: 0,
    surge: false,
  },
  {
    key: 'guardrailConflict',
    label: 'Guardrail',
    description: 'Recommendation muted during a scheduled class block.',
    simulatedTime: { hour: 11, minute: 0, day: 1 }, // Monday 11:00 AM (class)
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

  // Next opening time when closed
  const nextOpening = useMemo(() => {
    if (facilityOpen) return null;
    return getNextOpeningTime(simDate);
  }, [facilityOpen, simDate]);

  // Internal occupancy percentage — only the tier is exposed to the UI
  const liveOccupancyPct = (() => {
    if (!dataOnline) return null;
    if (!facilityOpen) return 0;

    if (state.surge) {
      const baseline = getBaseline(simDate.getDay(), simDate.getHours() + simDate.getMinutes() / 60);
      const target = state.liveOverride ?? 88;
      return Math.round(baseline + (target - baseline) * surgeProgress);
    }

    if (state.liveOverride != null) return state.liveOverride;

    const baseline = getBaseline(simDate.getDay(), simDate.getHours() + simDate.getMinutes() / 60);
    const trended = applyTrendWeighting(baseline, state.trendBias);
    const noise = (Math.random() - 0.5) * 10;
    return Math.max(0, Math.min(100, Math.round(trended + noise)));
  })();

  // Forecast — returns null when data unavailable, [] when no open hours remain
  const forecast = useMemo(() => {
    if (!facilityOpen) return [];
    return forecastHours(simDate, liveOccupancyPct, state.trendBias, dataOnline);
  }, [simDate, liveOccupancyPct, state.trendBias, dataOnline, facilityOpen]);

  const bestTime = useMemo(() => {
    if (!facilityOpen || !dataOnline) return null;
    return findBestTime(simDate, forecast);
  }, [facilityOpen, dataOnline, simDate, forecast]);

  const recommendationMuted =
    !facilityOpen ||
    !dataOnline ||
    activeClass !== null ||
    bestTime === null;

  useEffect(() => {
    setSurgeProgress(0);
    if (timerRef.current) clearInterval(timerRef.current);

    timerRef.current = setInterval(() => {
      if (state.simulatedTime === null) {
        setNow(new Date());
      }
      if (state.surge) {
        setSurgeProgress((p) => Math.min(1, p + 10 / 60));
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
    nextOpening,
    liveTier: liveOccupancyPct != null ? occupancyToTier(liveOccupancyPct) : null,
    forecast,
    bestTime,
    activeClass,
    recommendationMuted,
    dataOnline,
    TIERS,
  };
}
