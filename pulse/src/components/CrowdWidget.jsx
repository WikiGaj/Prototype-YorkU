import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardActionArea from '@mui/material/CardActionArea';
import Typography from '@mui/material/Typography';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import { tokens } from '../theme';
import useGymCrowd from '../hooks/useGymCrowd';
import { TIERS } from '../data/gymCapacity';

/**
 * CrowdWidget — a clean, minimal card for the dashboard that gives a
 * one-glance summary of current gym crowd. Tapping it opens the full
 * CrowdForecast view.
 *
 * Design principles:
 *   - One headline number (occupancy %) with a traffic-tier pill
 *   - One supporting line (best time or status)
 *   - No charts, no sparklines, no hour labels — save that for the detail page
 *   - WCAG AA contrast on all text and indicators
 *   - Visually distinct from health metric cards (full-width, accent left border)
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

  // Determine the status text shown under the headline
  const statusText = useMemo(() => {
    if (!facilityOpen) return `Closed · Opens at ${operatingHours.open}:00`;
    if (!dataOnline) return 'Historical estimates only';
    if (bestTime) return `Best time to go: ${bestTime.label}`;
    return 'Tap for 8-hour forecast';
  }, [facilityOpen, dataOnline, bestTime, operatingHours]);

  const tierColor = liveTier?.color || '#8E8EA0';
  const tierBg = liveTier?.bg || 'rgba(142,142,160,0.10)';
  const tierBorder = liveTier?.border || 'rgba(142,142,160,0.25)';

  return (
    <Card
      id="crowd-widget"
      sx={{
        mb: 3,
        position: 'relative',
        overflow: 'hidden',
        '&::before': {
          content: '""',
          position: 'absolute',
          left: 0, top: 0, bottom: 0,
          width: 4,
          backgroundColor: facilityOpen && dataOnline ? tierColor : '#8E8EA0',
        },
      }}
    >
      <CardActionArea
        onClick={onOpen}
        aria-label={`Gym crowd: ${facilityOpen ? `${liveTier?.label || 'unknown'}, ${liveOccupancyPct}% capacity` : 'closed'}. Tap for full forecast.`}
        sx={{ px: 2.5, py: 2, '&:hover': { backgroundColor: 'transparent' } }}
      >
        {/* Top row: icon + label, chevron */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FitnessCenterIcon sx={{ color: 'primary.light', fontSize: 18 }} />
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
              Gym Crowd
            </Typography>
          </Box>
          <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
        </Box>

        {/* Main content row */}
        {facilityOpen ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            {/* Tier pill */}
            <Box
              sx={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: 0.75,
                px: 1.5,
                py: 0.5,
                borderRadius: 6,
                backgroundColor: tierBg,
                border: `1px solid ${tierBorder}`,
                flexShrink: 0,
              }}
            >
              <Box sx={{ width: 8, height: 8, borderRadius: '50%', backgroundColor: tierColor }} />
              <Typography
                sx={{
                  fontFamily: '"Space Grotesk", sans-serif',
                  fontWeight: 700,
                  fontSize: '0.8rem',
                  color: tierColor,
                  letterSpacing: '0.04em',
                  textTransform: 'uppercase',
                }}
              >
                {liveTier?.label || '—'}
              </Typography>
            </Box>

            {/* Occupancy number */}
            {dataOnline && liveOccupancyPct != null ? (
              <Typography
                sx={{
                  fontSize: '0.85rem',
                  color: 'text.primary',
                  fontWeight: 500,
                }}
              >
                {liveOccupancyPct}% full · ~{liveOccupancyPeople} people
              </Typography>
            ) : (
              <Typography sx={{ fontSize: '0.85rem', color: 'text.secondary' }}>
                Estimates from recent trends
              </Typography>
            )}
          </Box>
        ) : (
          <Typography
            sx={{
              fontSize: '0.9rem',
              color: 'text.secondary',
              fontWeight: 500,
            }}
          >
            The Fitness Centre is closed
          </Typography>
        )}

        {/* Status line */}
        <Typography
          sx={{
            mt: 1,
            fontSize: '0.78rem',
            color: 'text.secondary',
            lineHeight: 1.4,
          }}
        >
          {statusText}
        </Typography>
      </CardActionArea>
    </Card>
  );
}
