import React, { useMemo } from 'react';
import Box from '@mui/material/Box';
import Grid from '@mui/material/Grid';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import WaterDropIcon from '@mui/icons-material/WaterDrop';
import MetricCard from './MetricCard';
import CrowdWidget from './CrowdWidget';

const METRIC_TYPES = ['food', 'steps', 'water', 'sleep'];

/**
 * Dashboard screen: four metric cards showing today's totals with mini trends,
 * plus quick-add shortcuts.
 */
export default function Dashboard({ entries, onQuickAdd, onQuickWater, onOpenCrowd }) {
  // Today's date string for filtering
  const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD

  // Compute today's totals and trend data for each type
  const metrics = useMemo(() => {
    return METRIC_TYPES.map((type) => {
      const typeEntries = entries.filter((e) => e.type === type);

      // Today's total
      const todayEntries = typeEntries.filter(
        (e) => new Date(e.timestamp).toLocaleDateString('en-CA') === todayStr
      );
      const todayTotal = todayEntries.reduce((sum, e) => sum + e.value, 0);

      // Aggregate by day for trend (last 14 days)
      const byDay = {};
      typeEntries.forEach((e) => {
        const day = new Date(e.timestamp).toLocaleDateString('en-CA');
        byDay[day] = (byDay[day] || 0) + e.value;
      });

      // Build trend data for last 14 days (fill gaps with 0)
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
    <Box sx={{ maxWidth: 900, mx: 'auto', px: 2, py: 3 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h5" sx={{ fontSize: '1.2rem' }}>
          Today
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<WaterDropIcon />}
          onClick={onQuickWater}
          id="quick-water-button"
          sx={{ fontSize: '0.75rem' }}
        >
          +250 ml
        </Button>
      </Box>

      {/* Gym crowd widget — tap to open full forecast */}
      <CrowdWidget onOpen={onOpenCrowd} />

      {/* Metric cards in a 2×2 grid */}
      <Grid container spacing={2}>
        {metrics.map((m) => (
          <Grid size={{ xs: 6, sm: 6, md: 3 }} key={m.type}>
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
