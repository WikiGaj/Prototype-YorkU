import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import LinearProgress from '@mui/material/LinearProgress';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Fade from '@mui/material/Fade';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
  ReferenceLine,
} from 'recharts';
import PeopleIcon from '@mui/icons-material/People';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import SchoolIcon from '@mui/icons-material/School';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { tokens } from '../theme';
import useGymCrowd, { TEST_STATES } from '../hooks/useGymCrowd';
import { TIERS } from '../data/gymCapacity';

// --- Custom tooltip for the bar chart -------------------------------------
function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
  if (!d.isWithinHours) {
    return (
      <Box sx={{
        backgroundColor: tokens.surfaceRaised,
        border: `1px solid ${tokens.borderViolet}`,
        borderRadius: 1,
        px: 1.5, py: 1,
        fontSize: 13,
        color: '#8E8EA0',
      }}>
        {d.label} — Closed
      </Box>
    );
  }
  return (
    <Box sx={{
      backgroundColor: tokens.surfaceRaised,
      border: `1px solid ${d.tier ? d.tier.color : tokens.borderViolet}`,
      borderRadius: 1,
      px: 1.5, py: 1,
      color: '#F5F5FA',
      fontSize: 13,
    }}>
      <Box sx={{ fontWeight: 600, mb: 0.25 }}>{d.label}</Box>
      <Box sx={{ color: 'text.secondary', fontSize: 12 }}>
        {d.occupancy}% — {d.tier ? d.tier.label : 'N/A'}
      </Box>
    </Box>
  );
}

// --- Traffic badge (the big Green/Yellow/Red indicator) -------------------
function TrafficBadge({ tier, occupancyPct, people, maxCapacity }) {
  if (!tier) {
    return (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 1,
        px: 2, py: 1, borderRadius: 2,
        backgroundColor: 'rgba(142,142,160,0.12)',
        border: '1px solid rgba(142,142,160,0.3)',
      }}>
        <CancelIcon sx={{ color: '#8E8EA0' }} />
        <Typography sx={{ fontWeight: 600, color: '#8E8EA0' }}>Data unavailable</Typography>
      </Box>
    );
  }

  return (
    <Box
      role="status"
      aria-label={`Current crowd level: ${tier.label}, ${occupancyPct}% capacity, approximately ${people} of ${maxCapacity} people`}
      sx={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 1.5,
        px: 2.5,
        py: 1.25,
        borderRadius: 2,
        backgroundColor: `${tier.color}1A`,
        border: `2px solid ${tier.color}`,
        transition: 'all 0.3s ease',
      }}
    >
      <Box
        sx={{
          width: 14, height: 14, borderRadius: '50%',
          backgroundColor: tier.color,
          boxShadow: `0 0 12px ${tier.color}`,
          flexShrink: 0,
        }}
      />
      <Box>
        <Typography
          component="span"
          sx={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontWeight: 700,
            fontSize: '1.1rem',
            color: tier.color,
            letterSpacing: '0.06em',
            textTransform: 'uppercase',
          }}
        >
          {tier.label}
        </Typography>
        <Typography
          component="span"
          sx={{ color: 'text.secondary', fontSize: '0.85rem', ml: 1 }}
        >
          {occupancyPct}% · ~{people} of {maxCapacity}
        </Typography>
      </Box>
    </Box>
  );
}

// --- Occupancy bar (visual fill under the badge) --------------------------
function OccupancyBar({ occupancyPct, tier }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{
        height: 8, borderRadius: 4,
        backgroundColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <Box sx={{
          height: '100%',
          width: `${occupancyPct}%`,
          backgroundColor: tier ? tier.color : '#8E8EA0',
          borderRadius: 4,
          transition: 'width 0.5s ease, background-color 0.3s ease',
        }} />
      </Box>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 0.5 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>Capacity</Typography>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontSize: '0.7rem' }}>{occupancyPct}%</Typography>
      </Box>
    </Box>
  );
}

// --- Best-time recommendation card ----------------------------------------
function Recommendation({ bestTime, muted, reason }) {
  if (muted) {
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1.5, borderRadius: 2,
        backgroundColor: 'rgba(142,142,160,0.08)',
        border: '1px solid rgba(142,142,160,0.2)',
      }}>
        <CancelIcon sx={{ color: '#8E8EA0', fontSize: 20 }} />
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.secondary' }}>
            No recommendation right now
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            {reason}
          </Typography>
        </Box>
      </Box>
    );
  }

  return (
    <Fade in={true} timeout={400}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1.5, borderRadius: 2,
        backgroundColor: `${TIERS.low.color}14`,
        border: `1px solid ${TIERS.low.color}44`,
      }}>
        <CheckCircleIcon sx={{ color: TIERS.low.color, fontSize: 20 }} />
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: TIERS.low.color }}>
            Best time to go
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            {bestTime.label} — {bestTime.occupancy}% capacity ({bestTime.tier.label})
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
}

// --- Tier legend ----------------------------------------------------------
function TierLegend() {
  return (
    <Box sx={{ display: 'flex', gap: 2, flexWrap: 'wrap' }}>
      {Object.values(TIERS).map((t) => (
        <Box key={t.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: t.color }} />
          <Typography variant="caption" sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            {t.label} ({t.threshold[0]}–{t.threshold[1]}%)
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/**
 * CrowdForecast — the main crowd-forecasting view.
 *
 * Shows current traffic badge, 8-hour forward bar chart, best-time
 * recommendation (with guardrails), and a test-state switcher covering
 * the 6 eval scenarios.
 */
export default function CrowdForecast() {
  const crowd = useGymCrowd();
  const {
    state,
    stateKey,
    changeState,
    simDate,
    facilityOpen,
    operatingHours,
    liveOccupancyPct,
    liveOccupancyPeople,
    liveTier,
    forecast,
    bestTime,
    activeClass,
    recommendationMuted,
    dataOnline,
    maxCapacity,
  } = crowd;

  // Chart data
  const chartData = useMemo(() => forecast, [forecast]);

  // Recommendation reason text
  const muteReason = useMemo(() => {
    if (!facilityOpen) return 'The Fitness Centre is closed.';
    if (!dataOnline) return 'Live data is offline — check back shortly.';
    if (activeClass) return `You have a class now: ${activeClass.name} (${activeClass.start}–${activeClass.end}).`;
    if (bestTime === null) return 'No suitable time slot found in the next 8 hours.';
    return '';
  }, [facilityOpen, dataOnline, activeClass, bestTime]);

  const formatHour = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: 2, py: 3 }}>
      {/* Page heading */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <FitnessCenterIcon sx={{ color: 'primary.light', fontSize: 24 }} />
        <Typography variant="h5" sx={{ fontSize: '1.2rem' }}>
          Tait McKenzie Centre
        </Typography>
      </Box>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>
        {formatDate(simDate)} · {formatHour(simDate)}
      </Typography>

      {/* --- Offline banner (eval state 5) --- */}
      {!dataOnline && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          sx={{ mb: 2, backgroundColor: 'rgba(250,204,21,0.08)', '& .MuiAlert-icon': { color: '#FACC15' } }}
          id="offline-banner"
        >
          <AlertTitle sx={{ fontSize: '0.85rem' }}>Historical estimates only — live data offline</AlertTitle>
          <Typography sx={{ fontSize: '0.8rem' }}>
            We're showing projections from recent trends. Live check-in data will return shortly.
          </Typography>
        </Alert>
      )}

      {/* --- Closed state (eval state 2) --- */}
      {!facilityOpen ? (
        <Card id="facility-closed-card">
          <CardContent sx={{ py: 5, px: 3, textAlign: 'center' }}>
            <CancelIcon sx={{ fontSize: 48, color: '#8E8EA0', mb: 2 }} />
            <Typography variant="h5" sx={{ fontSize: '1.1rem', mb: 1 }}>
              The Fitness Centre is closed
            </Typography>
            <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
              Hours today: {operatingHours.open}:00 – {operatingHours.close}:00
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Come back during operating hours for live crowd levels and forecasts.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* --- Current crowd card --- */}
          <Card id="current-crowd-card" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 3, px: 3 }}>
              <Typography variant="subtitle1" sx={{ fontSize: '0.75rem', mb: 2, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Right Now
              </Typography>

              <TrafficBadge
                tier={liveTier}
                occupancyPct={liveOccupancyPct}
                people={liveOccupancyPeople}
                maxCapacity={maxCapacity}
              />

              {liveOccupancyPct != null && (
                <OccupancyBar occupancyPct={liveOccupancyPct} tier={liveTier} />
              )}

              {/* Active class guardrail indicator */}
              {activeClass && (
                <Box sx={{
                  display: 'flex', alignItems: 'center', gap: 1,
                  mt: 2, px: 1.5, py: 1, borderRadius: 1.5,
                  backgroundColor: 'rgba(227,24,55,0.08)',
                  border: '1px solid rgba(227,24,55,0.25)',
                }}>
                  <SchoolIcon sx={{ color: '#E31837', fontSize: 18 }} />
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                    You're in class now: <strong style={{ color: 'text.primary' }}>{activeClass.name}</strong> ({activeClass.start}–{activeClass.end})
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* --- 8-hour forecast chart card --- */}
          <Card id="forecast-card" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 3, px: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="subtitle1" sx={{ fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                  Next 8 Hours
                </Typography>
                <ScheduleIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              </Box>

              <Box sx={{ width: '100%', height: 200 }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 8, right: 8, left: -16, bottom: 0 }} barGap={4}>
                    <XAxis
                      dataKey="label"
                      stroke="#8E8EA0"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="#8E8EA0"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                    <ReferenceLine y={40} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                    <ReferenceLine y={75} stroke="rgba(255,255,255,0.12)" strokeDasharray="3 3" />
                    <Bar dataKey="occupancy" radius={[6, 6, 0, 0]} maxBarSize={48}>
                      {chartData.map((entry, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={entry.isWithinHours ? entry.tier?.color : 'rgba(142,142,160,0.15)'}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>

              <Box sx={{ mt: 1.5 }}>
                <TierLegend />
              </Box>
            </CardContent>
          </Card>

          {/* --- Recommendation card --- */}
          <Card id="recommendation-card" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 2.5, px: 3 }}>
              <Typography variant="subtitle1" sx={{ fontSize: '0.75rem', mb: 1.5, color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.12em' }}>
                Recommendation
              </Typography>
              <Recommendation
                bestTime={bestTime}
                muted={recommendationMuted}
                reason={muteReason}
              />
            </CardContent>
          </Card>
        </>
      )}

      {/* --- Operating hours info --- */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3, color: 'text.secondary' }}>
        <ScheduleIcon sx={{ fontSize: 16 }} />
        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
          Hours: {operatingHours.open}:00 AM – {operatingHours.close}:00 PM · Max capacity: {maxCapacity}
        </Typography>
      </Box>

      {/* --- Test-state switcher --- */}
      <Box sx={{ mt: 2 }}>
        <Typography
          variant="subtitle1"
          sx={{ fontSize: '0.75rem', color: 'text.secondary', mb: 1.5, textTransform: 'uppercase', letterSpacing: '0.12em' }}
        >
          Test states
        </Typography>
        <ToggleButtonGroup
          value={stateKey}
          exclusive
          onChange={(_, v) => v && changeState(v)}
          aria-label="Crowd forecast test state"
          sx={{ flexWrap: 'wrap', gap: 1, '& .MuiToggleButton-root': { borderRadius: '10px !important', border: '1px solid', borderColor: 'divider', px: 1.5 } }}
        >
          {TEST_STATES.map((s) => (
            <ToggleButton key={s.key} value={s.key} id={`crowd-test-${s.key}`} sx={{ fontSize: '0.72rem' }}>
              {s.label}
            </ToggleButton>
          ))}
        </ToggleButtonGroup>

        {/* Active state description */}
        <Typography variant="body2" sx={{ mt: 1.5, fontSize: '0.78rem', color: 'text.secondary' }}>
          {state.description}
        </Typography>
      </Box>
    </Box>
  );
}
