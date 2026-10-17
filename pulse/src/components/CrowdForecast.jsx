import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Alert from '@mui/material/Alert';
import Fade from '@mui/material/Fade';
import {
  BarChart,
  Bar,
  XAxis,
  Cell,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import ScheduleIcon from '@mui/icons-material/Schedule';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import { tokens } from '../theme';
import useGymCrowd, { TEST_STATES } from '../hooks/useGymCrowd';
import { TIERS } from '../data/gymCapacity';

// --- Custom tooltip -------------------------------------------------------
function ChartTooltip({ active, payload }) {
  if (!active || !payload || !payload.length) return null;
  const d = payload[0].payload;
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
        {d.tier ? d.tier.label : 'N/A'}
      </Box>
    </Box>
  );
}

// --- Traffic badge (tier only, no numbers) --------------------------------
function TrafficBadge({ tier }) {
  if (!tier) {
    return (
      <Box sx={{
        display: 'inline-flex', alignItems: 'center', gap: 1,
        px: 2, py: 1, borderRadius: 2,
        backgroundColor: 'rgba(142,142,160,0.12)',
        border: '1px solid rgba(142,142,160,0.3)',
      }}>
        <CancelIcon sx={{ color: '#A0A0B0' }} />
        <Typography sx={{ fontWeight: 600, color: '#A0A0B0' }}>Data unavailable</Typography>
      </Box>
    );
  }

  return (
    <Box
      role="status"
      aria-label={`Current crowd level: ${tier.label}`}
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
      <Box sx={{ width: 12, height: 12, borderRadius: '50%', backgroundColor: tier.color, flexShrink: 0 }} />
      <Typography
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
            {bestTime.label} — {bestTime.tier.label}
          </Typography>
        </Box>
      </Box>
    </Fade>
  );
}

// --- Tier legend (labels only, no percentages) ----------------------------
function TierLegend() {
  return (
    <Box sx={{ display: 'flex', gap: 2.5, flexWrap: 'wrap' }}>
      {Object.values(TIERS).map((t) => (
        <Box key={t.key} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
          <Box sx={{ width: 10, height: 10, borderRadius: '50%', backgroundColor: t.color }} />
          <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
            {t.label}
          </Typography>
        </Box>
      ))}
    </Box>
  );
}

// --- Simulated data notice ------------------------------------------------
function SimDataNotice({ sx }) {
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        gap: 1,
        px: 2,
        py: 1.5,
        borderRadius: 2,
        backgroundColor: 'rgba(142,142,160,0.06)',
        border: '1px solid rgba(142,142,160,0.12)',
        ...sx,
      }}
    >
      <InfoOutlinedIcon sx={{ fontSize: 16, color: 'text.secondary', mt: 0.1, opacity: 0.7 }} />
      <Typography sx={{ fontSize: '0.75rem', color: 'text.secondary', lineHeight: 1.5 }}>
        This is a preview of our crowd forecasting feature. Crowd levels are
        simulated for demonstration purposes and do not reflect live occupancy.
      </Typography>
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
    nextOpening,
    liveTier,
    forecast,
    bestTime,
    recommendationMuted,
    dataOnline,
  } = crowd;

  const chartData = useMemo(() => forecast || [], [forecast]);

  const muteReason = useMemo(() => {
    if (!facilityOpen) return 'The Fitness Centre is closed.';
    if (!dataOnline) return 'Forecast information is currently unavailable. Please try again later.';
    if (bestTime === null) return 'No suitable time slot found in the remaining open hours.';
    return '';
  }, [facilityOpen, dataOnline, bestTime]);

  const formatHour = (d) => d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
  const formatDate = (d) => d.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });

  const dayOfWeek = simDate.getDay();
  const dayLabel = dayOfWeek === 0 ? 'Sunday' : dayOfWeek === 6 ? 'Saturday' : 'Weekday';

  // Next opening time label for closed state
  const nextOpeningLabel = useMemo(() => {
    if (!nextOpening) return null;
    const dayLabel = nextOpening.toLocaleDateString('en-US', { weekday: 'long' });
    const timeLabel = nextOpening.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
    const isToday = new Date().getDate() === nextOpening.getDate() &&
      new Date().getMonth() === nextOpening.getMonth();
    return isToday ? `Opens today at ${timeLabel}` : `Opens ${dayLabel} at ${timeLabel}`;
  }, [nextOpening]);

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

      {/* --- Missing data state --- */}
      {facilityOpen && !dataOnline ? (
        <Card id="missing-data-card" sx={{ mb: 2 }}>
          <CardContent sx={{ py: 4, px: 3, textAlign: 'center' }}>
            <WarningAmberIcon sx={{ fontSize: 40, color: '#A0A0B0', mb: 2 }} />
            <Typography sx={{ fontSize: '1rem', fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
              Forecast unavailable
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
              Forecast information is currently unavailable. Please try again later.
            </Typography>
          </CardContent>
        </Card>
      ) : !facilityOpen ? (
        /* --- Closed state --- */
        <Card id="facility-closed-card" sx={{ mb: 2 }}>
          <CardContent sx={{ py: 4, px: 3, textAlign: 'center' }}>
            <CancelIcon sx={{ fontSize: 40, color: '#8E8EA0', mb: 2 }} />
            <Typography sx={{ fontSize: '1.05rem', fontWeight: 600, mb: 0.5, color: 'text.primary' }}>
              The Fitness Centre is closed
            </Typography>
            <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 1 }}>
              {dayLabel} hours: {operatingHours.open}:00 AM – {operatingHours.close}:00 PM
            </Typography>
            {nextOpeningLabel && (
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                {nextOpeningLabel}
              </Typography>
            )}
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

              <TrafficBadge tier={liveTier} />
            </CardContent>
          </Card>

          {/* --- Forecast chart card --- */}
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
                  {dayLabel} Forecast
                </Typography>
                <ScheduleIcon sx={{ color: 'text.secondary', fontSize: 18 }} />
              </Box>

              {chartData.length > 0 ? (
                <Box sx={{ width: '100%', height: 180 }}>
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 8, right: 8, left: -8, bottom: 0 }} barGap={4}>
                      <XAxis
                        dataKey="label"
                        stroke="#8E8EA0"
                        fontSize={11}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<ChartTooltip />} cursor={{ fill: 'rgba(255,255,255,0.04)' }} />
                      <Bar dataKey="level" radius={[5, 5, 0, 0]} maxBarSize={44}>
                        {chartData.map((entry, i) => (
                          <Cell
                            key={`cell-${i}`}
                            fill={entry.tier?.color || 'rgba(142,142,160,0.12)'}
                          />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </Box>
              ) : (
                <Box sx={{ py: 3, textAlign: 'center' }}>
                  <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary' }}>
                    No remaining open hours today.
                  </Typography>
                </Box>
              )}

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

      {/* --- Simulated data notice --- */}
      <SimDataNotice sx={{ mb: 3 }} />

      {/* --- Operating hours info --- */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
        <ScheduleIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
        <Typography sx={{ fontSize: '0.78rem', color: 'text.secondary' }}>
          Mon–Fri: 7:00 AM – 10:00 PM · Sat: 9:00 AM – 9:00 PM · Sun: 9:00 AM – 4:00 PM
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
