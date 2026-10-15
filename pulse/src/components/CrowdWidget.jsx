import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import FitnessCenterIcon from '@mui/icons-material/FitnessCenter';
import CancelIcon from '@mui/icons-material/Cancel';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import { tokens } from '../theme';
import useGymCrowd from '../hooks/useGymCrowd';
import { TIERS, occupancyToPeople } from '../data/gymCapacity';

/**
 * CrowdWidget — a compact, tappable card for the dashboard that gives a
 * one-glance summary of current gym crowd and the next best time to go.
 * Tapping it navigates to the full CrowdForecast view.
 */
export default function CrowdWidget({ onOpen }) {
  const crowd = useGymCrowd();
  const {
    simDate,
    facilityOpen,
    operatingHours,
    liveOccupancyPct,
    liveOccupancyPeople,
    liveTier,
    forecast,
    bestTime,
    dataOnline,
  } = crowd;

  // Mini sparkline bars for the next 8 hours
  const miniBars = useMemo(() => {
    if (!facilityOpen || forecast.length === 0) return [];
    return forecast.map((f) => ({
      label: f.label,
      pct: f.occupancy,
      color: f.isWithinHours ? f.tier?.color : 'rgba(142,142,160,0.15)',
    }));
  }, [forecast, facilityOpen]);

  const handleClick = () => {
    if (onOpen) onOpen();
  };

  return (
    <Card
      id="crowd-widget"
      onClick={handleClick}
      role="button"
      tabIndex={0}
      aria-label="Gym crowd forecast — tap to see full details"
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleClick();
        }
      }}
      sx={{
        mb: 2,
        cursor: 'pointer',
        '&:hover': {
          transform: 'translateY(-2px)',
        },
        transition: 'transform 0.2s ease, box-shadow 0.3s ease',
      }}
    >
      <CardContent sx={{ py: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
        {/* Header row */}
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <FitnessCenterIcon sx={{ color: 'primary.light', fontSize: 18 }} />
            <Typography
              variant="subtitle1"
              sx={{ fontSize: '0.75rem', color: 'text.secondary', textTransform: 'uppercase', letterSpacing: '0.10em' }}
            >
              Gym Crowd
            </Typography>
          </Box>
          <ChevronRightIcon sx={{ color: 'text.secondary', fontSize: 20 }} />
        </Box>

        {/* --- Closed state --- */}
        {!facilityOpen ? (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
            <CancelIcon sx={{ color: '#8E8EA0', fontSize: 18 }} />
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: 'text.secondary' }}>
                Closed
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                Hours: {operatingHours.open}:00 – {operatingHours.close}:00
              </Typography>
            </Box>
          </Box>
        ) : !dataOnline ? (
          /* --- Offline state --- */
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, py: 0.5 }}>
            <WarningAmberIcon sx={{ color: '#FACC15', fontSize: 18 }} />
            <Box>
              <Typography sx={{ fontWeight: 600, fontSize: '0.9rem', color: '#FACC15' }}>
                Estimates only
              </Typography>
              <Typography sx={{ fontSize: '0.72rem', color: 'text.secondary' }}>
                Live data offline — tap for details
              </Typography>
            </Box>
          </Box>
        ) : (
          /* --- Normal live state --- */
          <>
            {/* Current crowd summary row */}
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1.5 }}>
              {/* Traffic dot + tier label */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexShrink: 0 }}>
                <Box
                  sx={{
                    width: 12, height: 12, borderRadius: '50%',
                    backgroundColor: liveTier?.color || '#8E8EA0',
                    boxShadow: `0 0 10px ${liveTier?.color || '#8E8EA0'}`,
                    flexShrink: 0,
                  }}
                />
                <Typography
                  sx={{
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 700,
                    fontSize: '0.95rem',
                    color: liveTier?.color || 'text.secondary',
                    letterSpacing: '0.04em',
                    textTransform: 'uppercase',
                  }}
                >
                  {liveTier?.label || '—'}
                </Typography>
              </Box>

              {/* People count */}
              <Typography sx={{ fontSize: '0.8rem', color: 'text.secondary' }}>
                ~{liveOccupancyPeople} people · {liveOccupancyPct}%
              </Typography>

              {/* Best-time hint */}
              {bestTime && (
                <Chip
                  label={`Best: ${bestTime.label}`}
                  size="small"
                  sx={{
                    ml: 'auto',
                    fontSize: '0.68rem',
                    height: 22,
                    fontFamily: '"Space Grotesk", sans-serif',
                    fontWeight: 600,
                    color: TIERS.low.color,
                    borderColor: `${TIERS.low.color}55`,
                    border: '1px solid',
                    backgroundColor: `${TIERS.low.color}10`,
                    '& .MuiChip-icon': { color: TIERS.low.color },
                  }}
                />
              )}
            </Box>

            {/* Mini 8-bar sparkline */}
            <Box
              sx={{
                display: 'flex',
                alignItems: 'flex-end',
                gap: 0.5,
                height: 32,
                width: '100%',
              }}
              aria-hidden="true"
            >
              {miniBars.map((bar, i) => (
                <Box
                  key={i}
                  sx={{
                    flex: 1,
                    height: `${Math.max(4, bar.pct)}%`,
                    backgroundColor: bar.color,
                    borderRadius: '2px 2px 0 0',
                    minWidth: 6,
                    transition: 'height 0.4s ease, background-color 0.3s ease',
                  }}
                />
              ))}
            </Box>

            {/* Hour labels under bars */}
            <Box sx={{ display: 'flex', gap: 0.5, mt: 0.25 }}>
              {miniBars.map((bar, i) => (
                <Box
                  key={i}
                  sx={{
                    flex: 1,
                    textAlign: 'center',
                    minWidth: 6,
                  }}
                >
                  <Typography
                    sx={{
                      fontSize: '0.58rem',
                      color: 'text.secondary',
                      lineHeight: 1,
                    }}
                  >
                    {i === 0 ? 'now' : bar.label.replace(':00', '').replace(' ', '')}
                  </Typography>
                </Box>
              ))}
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  );
}
