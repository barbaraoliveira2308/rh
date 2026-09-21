import React, { Suspense } from 'react';
import { QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ErrorBoundary } from '@/components/ErrorBoundary';
import { useAuthStore } from '@/stores/auth.store';
import { queryClient } from '@/lib/queryClient';

const LoginPage = React.lazy(() =>
  import('@/pages/LoginPage').then((m) => ({ default: m.LoginPage })),
);
const ResetPasswordPage = React.lazy(() =>
  import('@/pages/ResetPasswordPage').then((m) => ({ default: m.ResetPasswordPage })),
);
const ResetPasswordConfirmPage = React.lazy(() =>
  import('@/pages/ResetPasswordConfirmPage').then((m) => ({
    default: m.ResetPasswordConfirmPage,
  })),
);
const DashboardPage = React.lazy(() =>
  import('@/pages/DashboardPage').then((m) => ({ default: m.DashboardPage })),
);
const UsersListPage = React.lazy(() =>
  import('@/pages/UsersListPage').then((m) => ({ default: m.UsersListPage })),
);
const UserDetailPage = React.lazy(() =>
  import('@/pages/UserDetailPage').then((m) => ({ default: m.UserDetailPage })),
);
const UserNewPage = React.lazy(() =>
  import('@/pages/UserNewPage').then((m) => ({ default: m.UserNewPage })),
);
const OrgChartPage = React.lazy(() =>
  import('@/pages/OrgChartPage').then((m) => ({ default: m.OrgChartPage })),
);
const ProjectsListPage = React.lazy(() =>
  import('@/pages/ProjectsListPage').then((m) => ({ default: m.ProjectsListPage })),
);
const ProjectDetailPage = React.lazy(() =>
  import('@/pages/ProjectDetailPage').then((m) => ({ default: m.ProjectDetailPage })),
);
const ProjectAllocationsPage = React.lazy(() =>
  import('@/pages/ProjectAllocationsPage').then((m) => ({ default: m.ProjectAllocationsPage })),
);
const TimesheetsListPage = React.lazy(() =>
  import('@/pages/TimesheetsListPage').then((m) => ({ default: m.TimesheetsListPage })),
);
const TimesheetDetailPage = React.lazy(() =>
  import('@/pages/TimesheetDetailPage').then((m) => ({ default: m.TimesheetDetailPage })),
);
const AbsencesListPage = React.lazy(() =>
  import('@/pages/AbsencesListPage').then((m) => ({ default: m.AbsencesListPage })),
);
const AbsenceNewPage = React.lazy(() =>
  import('@/pages/AbsenceNewPage').then((m) => ({ default: m.AbsenceNewPage })),
);
const AbsenceDetailPage = React.lazy(() =>
  import('@/pages/AbsenceDetailPage').then((m) => ({ default: m.AbsenceDetailPage })),
);
const AbsencesTeamPage = React.lazy(() =>
  import('@/pages/AbsencesTeamPage').then((m) => ({ default: m.AbsencesTeamPage })),
);
const WorkflowInboxPage = React.lazy(() =>
  import('@/pages/WorkflowInboxPage').then((m) => ({ default: m.WorkflowInboxPage })),
);
const FinancialDashboardPage = React.lazy(() =>
  import('@/pages/FinancialDashboardPage').then((m) => ({ default: m.FinancialDashboardPage })),
);
const ExpensesListPage = React.lazy(() =>
  import('@/pages/ExpensesListPage').then((m) => ({ default: m.ExpensesListPage })),
);
const ExpenseNewPage = React.lazy(() =>
  import('@/pages/ExpenseNewPage').then((m) => ({ default: m.ExpenseNewPage })),
);
const ExpenseDetailPage = React.lazy(() =>
  import('@/pages/ExpenseDetailPage').then((m) => ({ default: m.ExpenseDetailPage })),
);
const AdminSettingsPage = React.lazy(() =>
  import('@/pages/AdminSettingsPage').then((m) => ({ default: m.AdminSettingsPage })),
);
const CapacityPage = React.lazy(() =>
  import('@/pages/CapacityPage').then((m) => ({ default: m.CapacityPage })),
);
const HelpdeskListPage = React.lazy(() =>
  import('@/pages/HelpdeskListPage').then((m) => ({ default: m.HelpdeskListPage })),
);
const CalendarPage = React.lazy(() =>
  import('@/pages/CalendarPage').then((m) => ({ default: m.CalendarPage })),
);
const PoliciesListPage = React.lazy(() =>
  import('@/pages/PoliciesListPage').then((m) => ({ default: m.PoliciesListPage })),
);
const PolicyDetailPage = React.lazy(() =>
  import('@/pages/PolicyDetailPage').then((m) => ({ default: m.PolicyDetailPage })),
);
const TrainingPage = React.lazy(() =>
  import('@/pages/TrainingPage').then((m) => ({ default: m.TrainingPage })),
);
const ReportsPage = React.lazy(() =>
  import('@/pages/ReportsPage').then((m) => ({ default: m.ReportsPage })),
);
const GdprPage = React.lazy(() =>
  import('@/pages/GdprPage').then((m) => ({ default: m.GdprPage })),
);
const NotificationsPage = React.lazy(() =>
  import('@/pages/NotificationsPage').then((m) => ({ default: m.NotificationsPage })),
);
const TicketDetailPage = React.lazy(() =>
  import('@/pages/TicketDetailPage').then((m) => ({ default: m.TicketDetailPage })),
);
const SecuritySettingsPage = React.lazy(() =>
  import('@/pages/SecuritySettingsPage').then((m) => ({ default: m.SecuritySettingsPage })),
);
const NotFoundPage = React.lazy(() =>
  import('@/pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })),
);
const AppLayout = React.lazy(() =>
  import('@/layouts/AppLayout').then((m) => ({ default: m.AppLayout })),
);
const AuthLayout = React.lazy(() =>
  import('@/layouts/AuthLayout').then((m) => ({ default: m.AuthLayout })),
);

const SECURITY_SETTINGS_PATH = '/settings/security';

function ProtectedRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const mfaSetupRequired = useAuthStore((state) => state.mfaSetupRequired);
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  // O backend recusa (403) tudo exceto a configuração do MFA; sem este redirecionamento o
  // admin ficaria preso numa aplicação em que todas as páginas falham.
  if (mfaSetupRequired && location.pathname !== SECURITY_SETTINGS_PATH) {
    return <Navigate to={SECURITY_SETTINGS_PATH} replace />;
  }
  return <>{children}</>;
}

function PublicRoute({ children }: { children: React.ReactNode }): React.JSX.Element {
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  return !isAuthenticated ? <>{children}</> : <Navigate to="/" replace />;
}

function PageLoader(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center">
      <LoadingSpinner size={40} />
    </div>
  );
}

export function App(): React.JSX.Element {
  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <BrowserRouter>
          <Suspense fallback={<PageLoader />}>
            <Routes>
              <Route
                element={
                  <PublicRoute>
                    <AuthLayout />
                  </PublicRoute>
                }
              >
                <Route path="/login" element={<LoginPage />} />
                <Route path="/auth/reset-password" element={<ResetPasswordPage />} />
                <Route path="/auth/reset-password/confirm" element={<ResetPasswordConfirmPage />} />
              </Route>

              <Route
                element={
                  <ProtectedRoute>
                    <AppLayout />
                  </ProtectedRoute>
                }
              >
                <Route path="/" element={<DashboardPage />} />
                <Route path="/users" element={<UsersListPage />} />
                <Route path="/users/new" element={<UserNewPage />} />
                <Route path="/users/:id" element={<UserDetailPage />} />
                <Route path="/org-chart" element={<OrgChartPage />} />
                <Route path="/projects" element={<ProjectsListPage />} />
                <Route path="/projects/:id" element={<ProjectDetailPage />} />
                <Route path="/projects/:id/allocations" element={<ProjectAllocationsPage />} />
                <Route path="/timesheets" element={<TimesheetsListPage />} />
                <Route path="/timesheets/:id" element={<TimesheetDetailPage />} />
                <Route path="/absences" element={<AbsencesListPage />} />
                <Route path="/absences/new" element={<AbsenceNewPage />} />
                <Route path="/absences/team" element={<AbsencesTeamPage />} />
                <Route path="/absences/:id" element={<AbsenceDetailPage />} />
                <Route path="/workflow/inbox" element={<WorkflowInboxPage />} />
                <Route path="/analytics/financials" element={<FinancialDashboardPage />} />
                <Route path="/expenses" element={<ExpensesListPage />} />
                <Route path="/expenses/new" element={<ExpenseNewPage />} />
                <Route path="/expenses/:id" element={<ExpenseDetailPage />} />
                <Route path="/admin/settings" element={<AdminSettingsPage />} />
                <Route path="/capacity" element={<CapacityPage />} />
                <Route path="/helpdesk" element={<HelpdeskListPage />} />
                <Route path="/helpdesk/:id" element={<TicketDetailPage />} />
                <Route path="/calendar" element={<CalendarPage />} />
                <Route path="/policies" element={<PoliciesListPage />} />
                <Route path="/policies/:id" element={<PolicyDetailPage />} />
                <Route path="/training" element={<TrainingPage />} />
                <Route path="/reports" element={<ReportsPage />} />
                <Route path="/gdpr" element={<GdprPage />} />
                <Route path="/notifications" element={<NotificationsPage />} />
                <Route path={SECURITY_SETTINGS_PATH} element={<SecuritySettingsPage />} />
              </Route>

              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </Suspense>
        </BrowserRouter>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}
