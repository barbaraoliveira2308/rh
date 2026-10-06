import * as React from 'react';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Event from '@mui/icons-material/Event';
import EventAvailable from '@mui/icons-material/EventAvailable';
import Groups from '@mui/icons-material/Groups';
import BeachAccess from '@mui/icons-material/BeachAccess';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import List from '@mui/material/List';
import ListItem from '@mui/material/ListItem';
import ListItemAvatar from '@mui/material/ListItemAvatar';
import ListItemText from '@mui/material/ListItemText';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import type { CalendarEvent } from '@/types/calendar';

function responsibleLabel(value: unknown): string {
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return String(value);
  return 'Organização';
}

function eventKind(type: string): {
  label: string;
  icon: React.ReactNode;
  color: 'primary' | 'success' | 'warning' | 'default';
} {
  const normalized = type.toLowerCase();
  if (
    normalized.includes('absence') ||
    normalized.includes('holiday') ||
    normalized.includes('vacation')
  ) {
    return { label: 'Ausência', icon: <BeachAccess />, color: 'warning' };
  }
  if (normalized.includes('team') || normalized.includes('building')) {
    return { label: 'Equipa', icon: <Groups />, color: 'success' };
  }
  if (normalized.includes('birthday')) {
    return { label: 'Aniversário', icon: <EventAvailable />, color: 'primary' };
  }
  return { label: 'Evento', icon: <Event />, color: 'default' };
}

export function UpcomingEventsCard({
  events,
  loading,
  error,
  onOpenCalendar,
}: {
  events: CalendarEvent[];
  loading: boolean;
  error: boolean;
  onOpenCalendar: () => void;
}): React.JSX.Element {
  const upcoming = events
    .filter((event) => event.date.slice(0, 10) >= new Date().toISOString().slice(0, 10))
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(0, 5);

  return (
    <Card variant="outlined" sx={{ borderRadius: 1.5, boxShadow: 'none' }}>
      <CardHeader
        title="Próximos eventos"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        action={
          <Button size="small" endIcon={<ArrowForward />} onClick={onOpenCalendar}>
            Ver todos
          </Button>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {loading ? (
          <Box sx={{ py: 5, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={22} />
          </Box>
        ) : null}
        {error ? (
          <Typography color="error" variant="body2">
            Não foi possível carregar o calendário.
          </Typography>
        ) : null}
        {!loading && !error && upcoming.length === 0 ? (
          <Typography color="text.secondary" variant="body2" sx={{ py: 3 }}>
            Sem eventos próximos.
          </Typography>
        ) : null}
        {!loading && !error && upcoming.length > 0 && (
          <List disablePadding>
            {upcoming.map((event) => {
              const kind = eventKind(event.type);
              const date = new Date(`${event.date.slice(0, 10)}T00:00:00`);
              return (
                <ListItem
                  key={event.id}
                  disableGutters
                  divider
                  secondaryAction={
                    <Chip size="small" color={kind.color} label={kind.label} variant="outlined" />
                  }
                >
                  <ListItemAvatar>
                    <Box
                      sx={{
                        width: 42,
                        height: 42,
                        borderRadius: 1.5,
                        bgcolor: 'action.hover',
                        color: 'primary.main',
                        display: 'grid',
                        placeItems: 'center',
                      }}
                    >
                      <Stack spacing={0} sx={{ alignItems: 'center' }}>
                        <Typography variant="caption" sx={{ fontWeight: 800, lineHeight: 1 }}>
                          {new Intl.DateTimeFormat('pt-PT', { day: '2-digit' }).format(date)}
                        </Typography>
                        <Typography
                          variant="caption"
                          sx={{ fontSize: 10, textTransform: 'uppercase' }}
                        >
                          {new Intl.DateTimeFormat('pt-PT', { month: 'short' })
                            .format(date)
                            .replace('.', '')}
                        </Typography>
                      </Stack>
                    </Box>
                  </ListItemAvatar>
                  <ListItemText
                    primary={event.title}
                    secondary={responsibleLabel(event.metadata?.responsible)}
                    slotProps={{
                      primary: { variant: 'body2', sx: { fontWeight: 700 }, noWrap: true },
                      secondary: { variant: 'caption', noWrap: true },
                    }}
                  />
                </ListItem>
              );
            })}
          </List>
        )}
      </CardContent>
    </Card>
  );
}
