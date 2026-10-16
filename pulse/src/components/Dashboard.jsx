import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import MetricCard from './MetricCard';
import CrowdWidget from './CrowdWidget';

const METRIC_TYPES = ['food', 'steps', 'water', 'sleep'];

/**
 * Dashboard screen.
 *
 * Visual hierarchy is designed around the PRD's test goal: does the crowd
 * forecasting feature drive gym attendance?  So the gym crowd widget leads,
 * and health tracking is a clean secondary section below it.
 */
export default function Dashboard({ entries, onQuickAdd, onQuickWater, onOpenCrowd }) {
  const todayStr = new Date().toLocaleDateString('en-CA');

  const metrics = useMemo(() => {
    return METRIC_TYPES.map((type) => {
      const typeEntries = entries.filter((e) => e.type === type);
      const todayEntries = typeEntries.filter(
        (e) => new Date(e.timestamp).toLocaleDateString('en-CA') === todayStr
      );
      const todayTotal = todayEntries.reduce((sum, e) => sum + e.value, 0);

      const byDay = {};
      typeEntries.forEach((e) => {
        const day = new Date(e.timestamp).toLocaleDateString('en-CA');
        byDay[day] = (byDay[day] || 0) + e.value;
      });

      const trendData = [];
      for (let i = 13; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayStr = d.toLocaleDateString('en-CA');
        const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        trendData.push({
          date: label,
          value: byDay[dayStr] ? Math.round(byDay[dayStr] * 10) / 10 : 0,
        });
      }

      return {
        type,
        todayTotal: Math.round(todayTotal * 10) / 10,
        trendData,
      };
    });
  }, [entries, todayStr]);

  return (
    <Box sx={{ maxWidth: 720, mx: 'auto', px: 2, py: 3 }}>
      {/* Page heading */}
      <Typography
        sx={{
          fontFamily: '"Space Grotesk", sans-serif',
          fontSize: { xs: '1.1rem', sm: '1.25rem' },
          fontWeight: 700,
          color: 'text.primary',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          mb: 0.5,
        }}
      >
        Today
      </Typography>
      <Typography sx={{ fontSize: '0.82rem', color: 'text.secondary', mb: 3 }}>
        {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}
      </Typography>

      {/* Gym crowd — the primary feature being tested */}
      <CrowdWidget onOpen={onOpenCrowd} />

      {/* Health tracking — secondary section */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2, mt: 4 }}>
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
          Health Tracking
        </Typography>
        <Button
          variant="text"
          size="small"
          onClick={onQuickWater}
          id="quick-water-button"
          sx={{
            fontSize: '0.72rem',
            color: 'text.secondary',
            textTransform: 'none',
            minWidth: 'auto',
            '&:hover': { color: 'primary.light', backgroundColor: 'transparent' },
          }}
        >
          + Log water
        </Button>
      </Box>

      {/* Metric cards in a 2×2 grid */}
      <Grid container spacing={2}>
        {metrics.map((m) => (
          <Grid size={{ xs: 6, sm: 6, md: 6 }} key={m.type}>
            <MetricCard
              type={m.type}
              todayTotal={m.todayTotal}
              trendData={m.trendData}
              onQuickAdd={() => onQuickAdd(m.type)}
            />
          </Grid>
        ))}
      </Grid>
    </Box>
  );
}
