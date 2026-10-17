import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import useGymCrowd from '../hooks/useGymCrowd';

/**
 * CrowdWidget — the hero element on the dashboard.
 *
 * Shows the current traffic level (Low/Medium/High) and best time to go.
 * Tapping opens the full CrowdForecast view.
 *
 * All crowd levels are simulated for demonstration purposes.
 */
export default function CrowdWidget({ onOpen }) {
  const crowd = useGymCrowd();
  const {
    facilityOpen,
    operatingHours,
    nextOpening,
    liveTier,
    bestTime,
    dataOnline,
  } = crowd;

  const statusText = useMemo(() => {
    if (!facilityOpen) {
      if (nextOpening) {
        const dayLabel = nextOpening.toLocaleDateString('en-US', { weekday: 'short' });
        const timeLabel = nextOpening.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
        const isToday = new Date().getDate() === nextOpening.getDate() &&
          new Date().getMonth() === nextOpening.getMonth();
        return isToday
          ? `Opens at ${timeLabel}`
          : `Opens ${dayLabel} at ${timeLabel}`;
      }
      return 'Check back during operating hours';
    }
    if (!dataOnline) return 'Forecast unavailable — tap for details';
    if (bestTime) return `Best time today: ${bestTime.label}`;
    return 'Tap for full forecast';
  }, [facilityOpen, dataOnline, bestTime, nextOpening]);

  const tierColor = liveTier?.color || '#8E8EA0';
  const tierBg = liveTier?.bg || 'rgba(142,142,160,0.08)';
  const tierBorder = liveTier?.border || 'rgba(142,142,160,0.20)';

  return (
    <Card
      id="crowd-widget"
      sx={{
        position: 'relative',
        overflow: 'hidden',
        border: `1px solid ${tierBorder}`,
        '&:hover': { borderColor: tierColor },
      }}
    >
      <CardActionArea
        onClick={onOpen}
        aria-label={`Gym crowd: ${facilityOpen ? (liveTier?.label || 'unknown') : 'closed'}. Tap for full forecast.`}
        sx={{ '&:hover': { backgroundColor: 'transparent' } }}
      >
        <Box sx={{ px: 3, py: 2.5 }}>
          {/* Header row */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <FitnessCenterIcon sx={{ color: 'primary.light', fontSize: 20 }} />
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
                Tait McKenzie Centre
              </Typography>
            </Box>
            <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 22 }} />
          </Box>

          {/* --- Closed state --- */}
          {!facilityOpen ? (
            <Box>
              <Typography
                sx={{
                  fontSize: '1.5rem',
                  fontWeight: 700,
                  color: 'text.secondary',
                  lineHeight: 1.2,
                }}
              >
                Closed
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>
                {statusText}
              </Typography>
            </Box>
          ) : !dataOnline ? (
            /* --- Missing data state --- */
            <Box>
              <Typography
                sx={{
                  fontSize: '1.1rem',
                  fontWeight: 600,
                  color: 'text.secondary',
                  lineHeight: 1.3,
                }}
              >
                Forecast unavailable
              </Typography>
              <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mt: 0.5 }}>
                {statusText}
              </Typography>
            </Box>
          ) : (
            /* --- Open with data: hero row --- */
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
              }}
            >
              {/* Tier badge */}
              <Box
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1.25,
                  px: 2,
                  py: 1,
                  borderRadius: 2,
                  backgroundColor: tierBg,
                  border: `1px solid ${tierBorder}`,
                  flexShrink: 0,
                }}
              >
                <Box
                  sx={{
                    width: 14,
                    height: 14,
                    borderRadius: '50%',
                    backgroundColor: tierColor,
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 700,
                    fontSize: '1.3rem',
                    color: tierColor,
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                    lineHeight: 1,
                  }}
                >
                  {liveTier?.label || '—'}
                </Typography>
              </Box>

              {/* Status text */}
              <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 0 } }}>
                <Typography
                  sx={{
                    fontSize: '1rem',
                    color: 'text.primary',
                    fontWeight: 500,
                    lineHeight: 1.3,
                  }}
                >
                  Current crowd level
                </Typography>
                <Typography
                  sx={{
                    fontSize: '0.82rem',
                    color: 'text.secondary',
                    mt: 0.5,
                    lineHeight: 1.4,
                  }}
                >
                  {statusText}
                </Typography>
              </Box>
            </Box>
          )}

          {/* Simulated data notice */}
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              gap: 0.5,
              mt: 2,
              pt: 1.5,
              borderTop: '1px solid',
              borderColor: 'divider',
            }}
          >
            <InfoOutlinedIcon sx={{ fontSize: 14, color: 'text.secondary', opacity: 0.6 }} />
            <Typography sx={{ fontSize: '0.68rem', color: 'text.secondary', opacity: 0.7 }}>
              Simulated demo data — not live occupancy
            </Typography>
          </Box>
        </Box>
      </CardActionArea>
    </Card>
  );
}
