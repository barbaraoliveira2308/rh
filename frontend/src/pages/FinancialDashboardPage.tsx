import React from 'react';
import { useQuery } from '@tanstack/react-query';
import { Navigate } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LineChart,
  Line,
} from 'recharts';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useAuthStore } from '@/stores/auth.store';
import { fetchConsultantMargins, fetchMonthlyRevenue, fetchTopProjects } from '@/api/analytics.api';
import type { ConsultantMargin, MonthlyRevenue } from '@/types/analytics';

export function FinancialDashboardPage(): React.JSX.Element {
  const permissions = useAuthStore((state) => state.permissions);
  const [period, setPeriod] = React.useState(new Date().getFullYear().toString());

  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));

  const { data: margins, isLoading: marginsLoading } = useQuery({
    queryKey: ['consultant-margins', period],
    queryFn: () => fetchConsultantMargins({ period }),
    enabled: isAdmin,
  });

  const { data: revenue, isLoading: revenueLoading } = useQuery({
    queryKey: ['monthly-revenue', period],
    queryFn: () => fetchMonthlyRevenue({ year: Number(period) }),
    enabled: isAdmin,
  });

  const { data: topProjects, isLoading: topLoading } = useQuery({
    queryKey: ['top-projects'],
    queryFn: () => fetchTopProjects(10),
    enabled: isAdmin,
  });

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  const revenueChartData = aggregateRevenueByMonth(revenue ?? []);
  const profitabilityData = (topProjects ?? []).slice(0, 10).reverse();

  return (
    <div>
      <PageHeader
        title="Dashboard Financeiro"
        description="Margens, rentabilidade e evolução de receita"
      />

      <div className="mb-4">
        <Select value={period} onValueChange={setPeriod}>
          <SelectTrigger className="w-[200px]">
            <SelectValue placeholder="Selecionar período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2026">2026</SelectItem>
            <SelectItem value="2025">2025</SelectItem>
            <SelectItem value="2024">2024</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="mb-6 grid gap-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Margem por Consultor</CardTitle>
          </CardHeader>
          <CardContent>
            {marginsLoading ? (
              <LoadingSpinner />
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="pb-2 pr-4 font-medium">Consultor</th>
                      <th className="pb-2 pr-4 font-medium">Taxa Hora</th>
                      <th className="pb-2 pr-4 font-medium">Custo Hora</th>
                      <th className="pb-2 pr-4 font-medium">Horas</th>
                      <th className="pb-2 font-medium">Margem</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(margins ?? []).length === 0 ? (
                      <tr>
                        <td colSpan={5} className="py-8 text-center text-muted-foreground">
                          Nenhum dado disponível para o período selecionado.
                        </td>
                      </tr>
                    ) : (
                      (margins ?? []).map((m: ConsultantMargin) => (
                        <tr key={m.employeeId} className="border-b last:border-0">
                          <td className="py-2 pr-4 font-medium">{m.employeeName}</td>
                          <td className="py-2 pr-4">
                            {m.hourlyRate !== null ? `${String(m.hourlyRate)} €` : '-'}
                          </td>
                          <td className="py-2 pr-4">
                            {m.hourlyCost !== null ? `${String(m.hourlyCost)} €` : '-'}
                          </td>
                          <td className="py-2 pr-4">{String(m.hoursWorked)}</td>
                          <td className="py-2">
                            {m.margin !== null ? `${m.margin.toFixed(2)} €` : '-'}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>

        <div className="grid gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Rentabilidade por Projeto</CardTitle>
            </CardHeader>
            <CardContent>
              {topLoading ? (
                <LoadingSpinner />
              ) : profitabilityData.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Nenhum projeto disponível.</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <BarChart data={profitabilityData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" />
                    <YAxis type="category" dataKey="projectName" width={150} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="margin" fill="#3D7DB9" name="Margem" />
                    <Bar dataKey="revenue" fill="#77A5D0" name="Receita" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução Mensal de Receita</CardTitle>
            </CardHeader>
            <CardContent>
              {revenueLoading ? (
                <LoadingSpinner />
              ) : revenueChartData.length === 0 ? (
                <p className="py-8 text-center text-muted-foreground">Nenhum dado disponível.</p>
              ) : (
                <ResponsiveContainer width="100%" height={350}>
                  <LineChart data={revenueChartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="receita"
                      stroke="#3D7DB9"
                      strokeWidth={2}
                      name="Receita"
                    />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function aggregateRevenueByMonth(data: MonthlyRevenue[]): { month: string; receita: number }[] {
  const monthNames = [
    'Jan',
    'Fev',
    'Mar',
    'Abr',
    'Mai',
    'Jun',
    'Jul',
    'Ago',
    'Set',
    'Out',
    'Nov',
    'Dez',
  ];
  const grouped: Record<string, number> = {};
  for (const item of data) {
    const monthNum = item.month ? new Date(item.month + '-01').getMonth() : 0;
    const label = monthNames[monthNum] ?? item.month;
    grouped[label] = (grouped[label] ?? 0) + item.revenue;
  }
  return monthNames.map((m) => ({ month: m, receita: grouped[m] ?? 0 }));
}
