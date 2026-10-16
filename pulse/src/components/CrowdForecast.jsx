import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
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
      border: `1px solid ${d.tier ? d.tier.border : tokens.borderViolet}`,
      borderRadius: 1,
      px: 1.5, py: 1,
      color: '#F5F5FA',
      fontSize: 13,
    }}>
      <Box sx={{ fontWeight: 600, mb: 0.25, color: d.tier?.color || '#F5F5FA' }}>{d.label}</Box>
      <Box sx={{ color: 'text.secondary', fontSize: 12 }}>
        {d.occupancy}% — {d.tier ? d.tier.label : 'N/A'}
      </Box>
    </Box>
  );
}

// --- Traffic badge --------------------------------------------------------
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
        <Typography sx={{ fontWeight: 600, color: '#A0A0B0' }}>Data unavailable</Typography>
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
        backgroundColor: tier.bg,
        border: `1px solid ${tier.border}`,
        transition: 'all 0.3s ease',
      }}
    >
      <Box
        sx={{
          width: 12, height: 12, borderRadius: '50%',
          backgroundColor: tier.color,
          flexShrink: 0,
        }}
      />
      <Typography
        component="span"
        sx={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontWeight: 700,
          fontSize: '1.15rem',
          color: tier.color,
          letterSpacing: '0.06em',
          textTransform: 'uppercase',
        }}
      >
        {tier.label}
      </Typography>
      <Typography
        component="span"
        sx={{ color: 'text.primary', fontSize: '0.9rem', fontWeight: 500 }}
      >
        {occupancyPct}% · ~{people} of {maxCapacity}
      </Typography>
    </Box>
  );
}

// --- Occupancy bar --------------------------------------------------------
function OccupancyBar({ occupancyPct, tier }) {
  return (
    <Box sx={{ mt: 1.5 }}>
      <Box sx={{
        height: 6, borderRadius: 3,
        backgroundColor: 'rgba(255,255,255,0.06)',
        overflow: 'hidden',
      }}>
        <Box sx={{
          height: '100%',
          width: `${occupancyPct}%`,
          backgroundColor: tier ? tier.color : '#8E8EA0',
          borderRadius: 3,
          transition: 'width 0.5s ease, background-color 0.3s ease',
        }} />
      </Box>
    </Box>
  );
}

// --- Best-time recommendation ---------------------------------------------
function Recommendation({ bestTime, muted, reason }) {
  if (muted) {
    return (
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1.5, borderRadius: 2,
        backgroundColor: 'rgba(142,142,160,0.06)',
        border: '1px solid rgba(142,142,160,0.15)',
      }}>
        <CancelIcon sx={{ color: '#A0A0B0', fontSize: 20 }} />
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: 'text.secondary' }}>
            No recommendation right now
          </Typography>
          {reason && (
            <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary', mt: 0.25 }}>
              {reason}
            </Typography>
          )}
        </Box>
      </Box>
    );
  }

  return (
    <Fade in={true} timeout={400}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1.5,
        px: 2, py: 1.5, borderRadius: 2,
        backgroundColor: TIERS.low.bg,
        border: `1px solid ${TIERS.low.border}`,
      }}>
        <CheckCircleIcon sx={{ color: TIERS.low.color, fontSize: 20 }} />
        <Box>
          <Typography sx={{ fontWeight: 600, fontSize: '0.85rem', color: TIERS.low.color }}>
            Best time to go
          </Typography>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.primary', mt: 0.25 }}>
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
    <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
      {Object.values(TIERS).map((t) => (
        <Box key={t.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: t.color }} />
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            {t.label} ({t.threshold[0]}–{t.threshold[1]}%)
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

/**
 * CrowdForecast — the full crowd-forecasting view.
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

  const chartData = useMemo(() => forecast, [forecast]);

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
    <Box sx={{ maxWidth: 640, mx: 'auto', px: 2, py: 3 }}>
      {/* Page heading */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
        <FitnessCenterIcon sx={{ color: 'primary.light', fontSize: 22 }} />
        <Typography variant="h5" sx={{ fontSize: '1.15rem' }}>
          Tait McKenzie Centre
        </Typography>
      </Box>
      <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary', mb: 3 }}>
        {formatDate(simDate)} · {formatHour(simDate)}
      </Typography>

      {/* --- Offline banner (eval state 5) --- */}
      {!dataOnline && facilityOpen && (
        <Alert
          severity="warning"
          icon={<WarningAmberIcon />}
          sx={{
            mb: 2,
            backgroundColor: TIERS.medium.bg,
            border: `1px solid ${TIERS.medium.border}`,
            '& .MuiAlert-icon': { color: TIERS.medium.color },
            '& .MuiAlert-message': { color: 'text.primary' },
          }}
          id="offline-banner"
        >
          <AlertTitle sx={{ fontSize: '0.82rem', color: TIERS.medium.color }}>
            Historical estimates only — live data offline
          </AlertTitle>
          <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
            Showing projections from recent trends. Live check-in data will return shortly.
          </Typography>
        </Alert>
      )}

      {/* --- Closed state (eval state 2) --- */}
      {!facilityOpen ? (
        <Card id="facility-closed-card">
          <CardContent sx={{ py: 5, px: 3, textAlign: 'center' }}>
            <CancelIcon sx={{ fontSize: 44, color: '#8E8EA0', mb: 2 }} />
            <Typography sx={{ fontSize: '1.05rem', fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
              The Fitness Centre is closed
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 2 }}>
              Hours today: {operatingHours.open}:00 – {operatingHours.close}:00
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
              Come back during operating hours for live crowd levels and forecasts.
            </Typography>
          </CardContent>
        </Card>
      ) : (
        <>
          {/* --- Current crowd card --- */}
          <Card id="current-crowd-card" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 3, px: 3 }}>
              <Typography
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  mb: 2,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                }}
              >
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
                  border: '1px solid rgba(227,24,55,0.20)',
                }}>
                  <SchoolIcon sx={{ color: '#E31837', fontSize: 18 }} />
                  <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
                    In class now: <strong style={{ color: 'text.primary' }}>{activeClass.name}</strong> ({activeClass.start}–{activeClass.end})
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>

          {/* --- 8-hour forecast chart card --- */}
          <Card id="forecast-card" sx={{ mb: 2 }}>
            <CardContent sx={{ py: 3, px: 3 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography
                  sx={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontSize: '0.72rem',
                    fontWeight: 600,
                    color: 'text.secondary',
                    textTransform: 'uppercase',
                    letterSpacing: '0.10em',
                  }}
                >
                  Next 8 Hours
                </Typography>
                <ScheduleIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              </Box>

              <Box sx={{ width: '100%', height: 180 }}>
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
                    <ReferenceLine y={40} stroke="rgba(255,255,255,0.10)" strokeDasharray="3 3" />
                    <ReferenceLine y={75} stroke="rgba(255,255,255,0.10)" strokeDasharray="3 3" />
                    <Bar dataKey="occupancy" radius={[5, 5, 0, 0]} maxBarSize={44}>
                      {chartData.map((entry, i) => (
                        <Cell
                          key={`cell-${i}`}
                          fill={entry.isWithinHours ? entry.tier?.color : 'rgba(142,142,160,0.12)'}
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
              <Typography
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  mb: 1.5,
                  color: 'text.secondary',
                  textTransform: 'uppercase',
                  letterSpacing: '0.10em',
                }}
              >
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
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
          Hours: {operatingHours.open}:00 – {operatingHours.close}:00 · Max capacity: {maxCapacity}
        </Typography>
      </Box>

      {/* --- Test-state switcher --- */}
      <Box sx={{ mt: 3, pt: 3, borderTop: 1, borderColor: 'divider' }}>
        <Typography
          sx={{
            fontFamily: '"Space Grotesk", sans-serif',
            fontSize: '0.72rem',
            fontWeight: 600,
            color: 'text.secondary',
            mb: 1.5,
            textTransform: 'uppercase',
            letterSpacing: '0.10em',
          }}
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

        <Typography sx={{ mt: 1.5, fontSize: '0.76rem', color: 'text.secondary', lineHeight: 1.5 }}>
          {state.description}
        </Typography>
      </Box>
    </Box>
  );
}
