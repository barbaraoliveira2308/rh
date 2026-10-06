import * as React from 'react';
import ArrowDownward from '@mui/icons-material/ArrowDownward';
import ArrowUpward from '@mui/icons-material/ArrowUpward';
import Remove from '@mui/icons-material/Remove';
import MoreVert from '@mui/icons-material/MoreVert';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import IconButton from '@mui/material/IconButton';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';

export interface KpiTrend {
  label: string;
  direction: 'up' | 'down' | 'neutral';
  goodWhenDown?: boolean;
}

interface KpiCardProps {
  title: string;
  value: string | number | null;
  detail: string;
  icon: React.ReactNode;
  trend?: KpiTrend;
  loading?: boolean;
  error?: boolean;
  unavailable?: boolean;
}

export function KpiCard({
  title,
  value,
  detail,
  icon,
  trend,
  loading = false,
  error = false,
  unavailable = false,
}: KpiCardProps): React.JSX.Element {
  const trendColor =
    trend?.direction === 'neutral'
      ? 'text.secondary'
      : trend?.direction === 'down'
        ? trend.goodWhenDown
          ? 'success.main'
          : 'error.main'
        : 'success.main';
  const TrendIcon =
    trend?.direction === 'up' ? ArrowUpward : trend?.direction === 'down' ? ArrowDownward : Remove;

  return (
    <Card variant="outlined" sx={{ minHeight: 100, borderRadius: 1.5, boxShadow: 'none' }}>
      <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
        <Stack
          direction="row"
          sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1 }}
        >
          <Typography color="text.secondary" variant="body2" sx={{ fontWeight: 600 }}>
            {title}
          </Typography>
          <Box
            aria-hidden="true"
            sx={{
              display: 'grid',
              width: 36,
              height: 36,
              flex: '0 0 auto',
              placeItems: 'center',
              borderRadius: 1.5,
              bgcolor: 'action.hover',
              color: 'primary.main',
            }}
          >
            {icon}
          </Box>
          <IconButton
            aria-label={`Mais opções para ${title}`}
            size="small"
            sx={{ display: { xs: 'none', md: 'inline-flex' }, p: 0.5 }}
          >
            <MoreVert fontSize="small" />
          </IconButton>
        </Stack>
        {loading ? (
          <Skeleton variant="text" width="52%" height={42} />
        ) : (
          <Typography component="p" variant="h5" sx={{ mt: 1, fontWeight: 800 }}>
            {error ? '—' : unavailable ? 'Sem acesso' : (value ?? '—')}
          </Typography>
        )}
        <Stack direction="row" spacing={0.5} sx={{ mt: 0.5, alignItems: 'center', minHeight: 20 }}>
          {trend && !loading && !error && !unavailable && (
            <>
              <TrendIcon aria-hidden="true" sx={{ color: trendColor, fontSize: 16 }} />
              <Typography variant="caption" sx={{ color: trendColor, fontWeight: 700 }}>
                {trend.label}
              </Typography>
            </>
          )}
          <Typography color="text.secondary" variant="caption">
            {detail}
          </Typography>
        </Stack>
      </CardContent>
    </Card>
  );
}
