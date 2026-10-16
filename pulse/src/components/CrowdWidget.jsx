import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import useGymCrowd from '../hooks/useGymCrowd';

/**
 * CrowdWidget — the hero element on the dashboard.
 *
 * Gives a one-glance summary of current gym crowd and the best time to go.
 * Tapping it opens the full CrowdForecast view with the 8-hour chart.
 *
 * The visual is designed to be the first thing a student sees, since the
 * PRD's success metric is whether this feature drives gym attendance.
 */
export default function CrowdWidget({ onOpen }) {
  const crowd = useGymCrowd();
  const {
    facilityOpen,
    operatingHours,
    liveOccupancyPct,
    liveOccupancyPeople,
    liveTier,
    bestTime,
    dataOnline,
  } = crowd;

  const statusText = useMemo(() => {
    if (!facilityOpen) return `Opens at ${operatingHours.open}:00`;
    if (!dataOnline) return 'Historical estimates — tap for details';
    if (bestTime) return `Best time today: ${bestTime.label}`;
    return 'Tap for 8-hour forecast';
  }, [facilityOpen, dataOnline, bestTime, operatingHours]);

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
        '&:hover': {
          borderColor: tierColor,
        },
      }}
    >
      <CardActionArea
        onClick={onOpen}
        aria-label={`Gym crowd: ${facilityOpen ? `${liveTier?.label || 'unknown'}, ${liveOccupancyPct}% capacity` : 'closed'}. Tap for full forecast.`}
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
          ) : (
            /* --- Open: hero row --- */
            <Box
              sx={{
                display: 'flex',
                alignItems: 'center',
                gap: 3,
                flexWrap: { xs: 'wrap', sm: 'nowrap' },
              }}
            >
              {/* Tier badge — the big visual */}
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

              {/* Occupancy stats */}
              <Box sx={{ flex: 1, minWidth: { xs: '100%', sm: 0 } }}>
                {dataOnline && liveOccupancyPct != null ? (
                  <Typography
                    sx={{
                      fontSize: '1.1rem',
                      fontWeight: 600,
                      color: 'text.primary',
                      lineHeight: 1.3,
                    }}
                  >
                    {liveOccupancyPct}% full
                    <Typography
                      component="span"
                      sx={{ fontSize: '0.85rem', color: 'text.secondary', fontWeight: 400, ml: 1 }}
                    >
                      ~{liveOccupancyPeople} people
                    </Typography>
                  </Typography>
                ) : (
                  <Typography sx={{ fontSize: '1rem', color: 'text.secondary', fontWeight: 500 }}>
                    Estimates from recent trends
                  </Typography>
                )}
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
        </Box>
      </CardActionArea>
    </Card>
  );
}
