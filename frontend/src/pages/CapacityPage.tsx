import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';
import {
  fetchCapacityOverview,
  fetchCapacityAlerts,
  fetchCapacityCalendar,
  fetchTeams,
} from '@/api/capacity.api';
import {
  AllocationType,
  type CapacityOverviewEntry,
  type CapacityCalendarEntry,
} from '@/types/capacity';

const ALL_TEAMS = 'all';

function currentPeriod(): string {
  const now = new Date();
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function allocationStatus(pct: number): { variant: BadgeVariant; label: string } {
  if (pct > 100) {
    return { variant: 'danger', label: 'Sobrealocado' };
  }
  if (pct === 0) {
    return { variant: 'neutral', label: 'Disponível' };
  }
  if (pct < 80) {
    return { variant: 'warning', label: 'Sub-alocado' };
  }
  return { variant: 'success', label: 'Normal' };
}

export function CapacityPage(): React.JSX.Element {
  const roles = useAuthStore((state) => state.user?.roles ?? []);
  const isManagerOrAdmin = roles.some((role) => ['admin', 'manager'].includes(role));

  const [period, setPeriod] = React.useState(currentPeriod());
  const [teamId, setTeamId] = React.useState(ALL_TEAMS);

  const filterParams = {
    period,
    teamId: teamId === ALL_TEAMS ? undefined : teamId,
  };

  const { data: teams } = useQuery({
    queryKey: ['capacity-teams'],
    queryFn: () => fetchTeams(),
    enabled: isManagerOrAdmin,
  });

  const { data: overview, isLoading: overviewLoading } = useQuery({
    queryKey: ['capacity-overview', period, teamId],
    queryFn: () => fetchCapacityOverview(filterParams),
    enabled: isManagerOrAdmin,
  });

  const { data: alerts, isLoading: alertsLoading } = useQuery({
    queryKey: ['capacity-alerts', period, teamId],
    queryFn: () => fetchCapacityAlerts(filterParams),
    enabled: isManagerOrAdmin,
  });

  const { data: calendar, isLoading: calendarLoading } = useQuery({
    queryKey: ['capacity-calendar', period, teamId],
    queryFn: () => fetchCapacityCalendar(filterParams),
    enabled: isManagerOrAdmin,
  });

  if (!isManagerOrAdmin) {
    return <Navigate to="/" replace />;
  }

  const overviewColumns: Column<CapacityOverviewEntry>[] = [
    { key: 'employeeName', header: 'Colaborador', cell: (row) => row.employeeName },
    {
      key: 'allocationPercentage',
      header: 'Alocação Planeada',
      cell: (row) => `${row.allocationPercentage.toFixed(0)}%`,
    },
    {
      key: 'absenceDays',
      header: 'Dias de Ausência',
      cell: (row) => String(row.absenceDays),
    },
    {
      key: 'adjustedAllocationPercentage',
      header: 'Alocação Ajustada',
      cell: (row) => `${row.adjustedAllocationPercentage.toFixed(0)}%`,
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row): React.JSX.Element => {
        const status = allocationStatus(row.adjustedAllocationPercentage);
        return <StatusBadge label={status.label} variant={status.variant} />;
      },
    },
  ];

  return (
    <div>
      <PageHeader
        title="Capacidade & Alocação"
        description="Ocupação de recursos, alertas de sobre/sub-alocação e calendário de alocações"
      />

      <div className="mb-6 flex flex-wrap gap-4">
        <div className="w-[200px]">
          <Input
            type="month"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
            }}
            aria-label="Período"
          />
        </div>
        <div className="w-[240px]">
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Equipa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TEAMS}>Todas as equipas</SelectItem>
              {(teams ?? []).map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="alerts">Alertas</TabsTrigger>
          <TabsTrigger value="calendar">Calendário</TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Taxa de Ocupação por Colaborador</CardTitle>
            </CardHeader>
            <CardContent>
              {overviewLoading ? (
                <LoadingSpinner />
              ) : (overview ?? []).length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Nenhum colaborador encontrado para os filtros selecionados.
                </p>
              ) : (
                <DataTable
                  data={overview ?? []}
                  columns={overviewColumns}
                  keyExtractor={(row) => row.employeeId}
                  pageSize={15}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="alerts">
          {alertsLoading ? (
            <LoadingSpinner />
          ) : (
            <div className="grid gap-6 lg:grid-cols-3">
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Sobrealocados ({(alerts?.overallocations ?? []).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(alerts?.overallocations ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      Nenhum colaborador sobrealocado.
                    </p>
                  ) : (
                    <ul className="space-y-2">
                      {(alerts?.overallocations ?? []).map((entry) => (
                        <li
                          key={entry.employeeId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{entry.employeeName}</span>
                          <StatusBadge
                            label={`${entry.adjustedAllocationPercentage.toFixed(0)}%`}
                            variant="danger"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Sub-alocados ({(alerts?.underallocations ?? []).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(alerts?.underallocations ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum colaborador sub-alocado.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(alerts?.underallocations ?? []).map((entry) => (
                        <li
                          key={entry.employeeId}
                          className="flex items-center justify-between text-sm"
                        >
                          <span>{entry.employeeName}</span>
                          <StatusBadge
                            label={`${entry.adjustedAllocationPercentage.toFixed(0)}%`}
                            variant="warning"
                          />
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-base">
                    Disponíveis ({(alerts?.available ?? []).length})
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {(alerts?.available ?? []).length === 0 ? (
                    <p className="text-sm text-muted-foreground">Nenhum colaborador disponível.</p>
                  ) : (
                    <ul className="space-y-2">
                      {(alerts?.available ?? []).map((entry) => (
                        <li key={entry.employeeId} className="text-sm">
                          {entry.employeeName}
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="calendar">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Calendário de Ocupação</CardTitle>
            </CardHeader>
            <CardContent>
              {calendarLoading ? (
                <LoadingSpinner />
              ) : (calendar ?? []).length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">
                  Nenhuma alocação encontrada para os filtros selecionados.
                </p>
              ) : (
                <CapacityTimeline period={period} entries={calendar ?? []} />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface TimelineRow {
  employeeId: string;
  employeeName: string;
  bars: {
    key: string;
    leftPercent: number;
    widthPercent: number;
    label: string;
    title: string;
  }[];
}

function CapacityTimeline({
  period,
  entries,
}: {
  period: string;
  entries: CapacityCalendarEntry[];
}): React.JSX.Element {
  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);
  const daysInMonth = new Date(year, month, 0).getDate();
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month - 1, daysInMonth);

  const dayOfMonth = (isoDate: string): number => {
    const date = new Date(isoDate);
    const clamped = date < monthStart ? monthStart : date > monthEnd ? monthEnd : date;
    return clamped.getDate();
  };

  const rowsByEmployee = new Map<string, TimelineRow>();
  for (const entry of entries) {
    const startDay = dayOfMonth(entry.startDate);
    const endDay = entry.endDate ? dayOfMonth(entry.endDate) : daysInMonth;
    const leftPercent = ((startDay - 1) / daysInMonth) * 100;
    const widthPercent = Math.max(((endDay - startDay + 1) / daysInMonth) * 100, 2);

    const row = rowsByEmployee.get(entry.employeeId) ?? {
      employeeId: entry.employeeId,
      employeeName: entry.employeeName,
      bars: [],
    };
    row.bars.push({
      key: `${entry.projectId}-${entry.startDate}`,
      leftPercent,
      widthPercent,
      label: entry.projectName,
      title: `${entry.projectName} · ${entry.startDate} a ${entry.endDate ?? 'sem fim'} · ${entry.allocationType === AllocationType.HOURS ? `${String(entry.allocationValue)}h` : `${String(entry.allocationValue)}%`}`,
    });
    rowsByEmployee.set(entry.employeeId, row);
  }

  const rows = Array.from(rowsByEmployee.values());
  const dayTicks = [1, 8, 15, 22, daysInMonth];

  return (
    <div className="overflow-x-auto">
      <div className="min-w-[700px]">
        <div className="relative mb-2 h-5 border-b text-xs text-muted-foreground">
          {dayTicks.map((day) => (
            <span
              key={day}
              className="absolute -translate-x-1/2"
              style={{ left: `${String(((day - 1) / daysInMonth) * 100)}%` }}
            >
              {day}
            </span>
          ))}
        </div>
        <div className="space-y-3">
          {rows.map((row) => (
            <div key={row.employeeId} className="flex items-center gap-3">
              <div className="w-40 shrink-0 truncate text-sm font-medium">{row.employeeName}</div>
              <div className="relative h-7 flex-1 rounded bg-muted">
                {row.bars.map((bar) => (
                  <div
                    key={bar.key}
                    title={bar.title}
                    className="absolute top-0.5 h-6 overflow-hidden truncate rounded bg-brand-800 px-1.5 text-xs leading-6 text-white"
                    style={{
                      left: `${String(bar.leftPercent)}%`,
                      width: `${String(bar.widthPercent)}%`,
                    }}
                  >
                    {bar.label}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
