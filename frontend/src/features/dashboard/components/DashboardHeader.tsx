import * as React from 'react';
import Add from '@mui/icons-material/Add';
import CalendarMonth from '@mui/icons-material/CalendarMonth';
import Button from '@mui/material/Button';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { DateTextField } from '@/components/DateTextField';

export type DashboardPeriod = 'month' | 'last30' | 'quarter' | 'custom';

interface DashboardHeaderProps {
  name: string;
  period: DashboardPeriod;
  onPeriodChange: (period: DashboardPeriod) => void;
  customStart: string;
  customEnd: string;
  onCustomRangeChange: (start: string, end: string) => void;
  onAddEmployee: () => void;
  canAddEmployee: boolean;
}

export function DashboardHeader({
  name,
  period,
  onPeriodChange,
  customStart,
  customEnd,
  onCustomRangeChange,
  onAddEmployee,
  canAddEmployee,
}: DashboardHeaderProps): React.JSX.Element {
  const rawGreetingName = name.trim().split(/[.\s]+/)[0] ?? 'utilizador';
  const greetingName =
    rawGreetingName.charAt(0).toLocaleUpperCase('pt-PT') + rawGreetingName.slice(1);

  return (
    <Stack
      direction={{ xs: 'column', md: 'row' }}
      spacing={2}
      sx={{ mb: 2.5, justifyContent: 'space-between' }}
    >
      <Stack spacing={0.5}>
        <Typography component="h1" variant="h5" sx={{ fontWeight: 800 }}>
          Olá, {greetingName}
        </Typography>
        <Typography color="text.secondary" variant="body2">
          Aqui está o resumo da sua operação hoje.
        </Typography>
      </Stack>
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1}
        sx={{ alignItems: { sm: 'center' } }}
      >
        <TextField
          select
          size="small"
          label="Período"
          value={period}
          onChange={(event) => {
            onPeriodChange(event.target.value as DashboardPeriod);
          }}
          sx={{ minWidth: 180 }}
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <CalendarMonth color="action" sx={{ fontSize: 18 }} />
                </InputAdornment>
              ),
            },
          }}
        >
          <MenuItem value="month">Este mês</MenuItem>
          <MenuItem value="last30">Últimos 30 dias</MenuItem>
          <MenuItem value="quarter">Este trimestre</MenuItem>
          <MenuItem value="custom">Intervalo personalizado</MenuItem>
        </TextField>
        {period === 'custom' && (
          <Stack direction="row" spacing={1}>
            <DateTextField
              label="De"
              value={customStart}
              onChange={(date) => {
                onCustomRangeChange(date, customEnd);
              }}
              sx={{ width: 150 }}
            />
            <DateTextField
              label="Até"
              value={customEnd}
              onChange={(date) => {
                onCustomRangeChange(customStart, date);
              }}
              sx={{ width: 150 }}
            />
          </Stack>
        )}
        {canAddEmployee && (
          <Button onClick={onAddEmployee} startIcon={<Add />} variant="contained">
            Adicionar colaborador
          </Button>
        )}
      </Stack>
    </Stack>
  );
}
