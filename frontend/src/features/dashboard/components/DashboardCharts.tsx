import * as React from 'react';
import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import CircularProgress from '@mui/material/CircularProgress';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import {
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { CapacityForecast } from '@/types/analytics';
import type { DepartmentDistribution } from '../dashboardData';

const departmentColors = ['#12345B', '#087E8B', '#41B3A3', '#5C6BC0', '#8493A8', '#D99B32'];

function LoadingPanel(): React.JSX.Element {
  return (
    <Box sx={{ height: 190, display: 'grid', placeItems: 'center' }}>
      <CircularProgress size={24} />
    </Box>
  );
}

export function DashboardCharts({
  forecast,
  distribution,
  forecastLoading,
  forecastError,
  distributionLoading,
  distributionUnavailable,
}: {
  forecast: CapacityForecast[];
  distribution: DepartmentDistribution[];
  forecastLoading: boolean;
  forecastError: boolean;
  distributionLoading: boolean;
  distributionUnavailable: boolean;
}): React.JSX.Element {
  const occupancy = forecast.map((point) => {
    const totalCapacity = point.totalCapacity;
    return {
      month: point.month,
      utilization: totalCapacity > 0 ? (point.allocatedCapacity / totalCapacity) * 100 : 0,
      capacity: totalCapacity > 0 ? (point.availableCapacity / totalCapacity) * 100 : 0,
    };
  });

  return (
    <Box
      sx={{
        display: 'grid',
        gridTemplateColumns: { xs: '1fr', lg: 'repeat(12, minmax(0, 1fr))' },
        gap: 2,
      }}
    >
      <Card
        variant="outlined"
        sx={{ gridColumn: { lg: 'span 8' }, minHeight: 220, borderRadius: 1.5, boxShadow: 'none' }}
      >
        <CardHeader
          title="Ocupação da equipa"
          subheader="Utilização média e capacidade disponível"
          titleTypographyProps={{ variant: 'subtitle2', fontWeight: 700 }}
          subheaderTypographyProps={{ variant: 'caption' }}
          sx={{ p: 1.5, pb: 0.5 }}
        />
        <CardContent sx={{ p: 1.5, pt: 0, '&:last-child': { pb: 1.5 } }}>
          {forecastLoading ? (
            <LoadingPanel />
          ) : forecastError ? (
            <Typography color="error" sx={{ py: 8, textAlign: 'center' }} variant="body2">
              Não foi possível carregar a capacidade.
            </Typography>
          ) : occupancy.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }} variant="body2">
              Sem dados de capacidade para este período.
            </Typography>
          ) : (
            <Box role="img" aria-label="Gráfico mensal de utilização e capacidade livre">
              <ResponsiveContainer width="100%" height={175}>
                <LineChart data={occupancy} margin={{ top: 8, right: 12, bottom: 0, left: -16 }}>
                  <CartesianGrid stroke="#E4E9EF" vertical={false} />
                  <XAxis dataKey="month" tickLine={false} axisLine={false} fontSize={11} />
                  <YAxis
                    domain={[0, 100]}
                    tickLine={false}
                    axisLine={false}
                    fontSize={11}
                    tickFormatter={(value: number) => `${String(value)}%`}
                  />
                  <Tooltip
                    formatter={(value) =>
                      `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(Number(String(value ?? 0)))}%`
                    }
                  />
                  <Line
                    dataKey="utilization"
                    name="Utilização"
                    stroke="#1455A0"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    type="monotone"
                  />
                  <Line
                    dataKey="capacity"
                    name="Capacidade"
                    stroke="#16A6A1"
                    strokeWidth={2}
                    dot={{ r: 2 }}
                    type="monotone"
                  />
                </LineChart>
              </ResponsiveContainer>
            </Box>
          )}
        </CardContent>
      </Card>

      <Card
        variant="outlined"
        sx={{ gridColumn: { lg: 'span 4' }, minHeight: 220, borderRadius: 1.5, boxShadow: 'none' }}
      >
        <CardHeader
          title="Distribuição por departamento"
          subheader={
            distributionUnavailable ? 'Acesso restrito a Admin/Gestor' : 'Colaboradores ativos'
          }
          titleTypographyProps={{ variant: 'subtitle2', fontWeight: 700 }}
          subheaderTypographyProps={{ variant: 'caption' }}
          sx={{ p: 1.5, pb: 0.5 }}
        />
        <CardContent sx={{ p: 1.5, pt: 0, '&:last-child': { pb: 1.5 } }}>
          {distributionLoading ? (
            <LoadingPanel />
          ) : distributionUnavailable ? (
            <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }} variant="body2">
              Sem permissão para consultar a distribuição.
            </Typography>
          ) : distribution.length === 0 ? (
            <Typography color="text.secondary" sx={{ py: 8, textAlign: 'center' }} variant="body2">
              Sem colaboradores ativos.
            </Typography>
          ) : (
            <Stack
              direction={{ xs: 'column', sm: 'row' }}
              spacing={1}
              sx={{ alignItems: 'center' }}
            >
              <Box
                role="img"
                aria-label="Gráfico de distribuição dos colaboradores por departamento"
                sx={{
                  position: 'relative',
                  width: '100%',
                  maxWidth: 220,
                  height: 150,
                  flex: '0 0 auto',
                }}
              >
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={distribution}
                      dataKey="count"
                      nameKey="department"
                      innerRadius={45}
                      outerRadius={68}
                      paddingAngle={2}
                    >
                      {distribution.map((item, index) => (
                        // Recharts ainda exige Cell para colorir cada segmento individualmente.
                        // eslint-disable-next-line @typescript-eslint/no-deprecated
                        <Cell
                          key={item.department}
                          fill={departmentColors[index % departmentColors.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip formatter={(value) => String(value ?? 0)} />
                  </PieChart>
                </ResponsiveContainer>
                <Stack
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    alignItems: 'center',
                    justifyContent: 'center',
                    pointerEvents: 'none',
                  }}
                >
                  <Typography variant="h6" sx={{ fontWeight: 800, lineHeight: 1 }}>
                    {distribution.reduce((total, item) => total + item.count, 0)}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    colaboradores
                  </Typography>
                </Stack>
              </Box>
              <Stack spacing={0.25} sx={{ width: '100%', minWidth: 0 }}>
                {distribution.map((item, index) => (
                  <Stack
                    key={item.department}
                    direction="row"
                    spacing={1}
                    sx={{ alignItems: 'center', justifyContent: 'space-between' }}
                  >
                    <Stack direction="row" spacing={1} sx={{ alignItems: 'center', minWidth: 0 }}>
                      <Box
                        aria-hidden="true"
                        sx={{
                          width: 7,
                          height: 7,
                          flex: '0 0 auto',
                          borderRadius: '50%',
                          bgcolor: departmentColors[index % departmentColors.length],
                        }}
                      />
                      <Typography noWrap variant="caption">
                        {item.department}
                      </Typography>
                    </Stack>
                    <Typography color="text.secondary" variant="caption">
                      {String(item.count)} ·{' '}
                      {new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(
                        item.percentage,
                      )}
                      %
                    </Typography>
                  </Stack>
                ))}
              </Stack>
            </Stack>
          )}
        </CardContent>
      </Card>
    </Box>
  );
}
