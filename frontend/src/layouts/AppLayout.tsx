import { Link, Outlet, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  LogOut,
  Menu,
  LayoutDashboard,
  Users,
  FolderKanban,
  Clock,
  CalendarDays,
  Network,
  Bell,
  Inbox,
  Wallet,
  BarChart3,
  Settings,
  Gauge,
  LifeBuoy,
  Calendar,
  BookOpen,
  GraduationCap,
  FileBarChart,
  ShieldCheck,
  KeyRound,
  Megaphone,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { useIdleLogout } from '@/lib/useIdleLogout';
import { fetchWorkflowInboxCount } from '@/api/workflow.api';
import { fetchUnreadCount } from '@/api/notifications.api';
import { PolicyAcceptanceGate } from '@/components/PolicyAcceptanceGate';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard className="h-4 w-4" /> },
  { label: 'Colaboradores', href: '/users', icon: <Users className="h-4 w-4" /> },
  { label: 'Organograma', href: '/org-chart', icon: <Network className="h-4 w-4" /> },
  { label: 'Projetos', href: '/projects', icon: <FolderKanban className="h-4 w-4" /> },
  { label: 'Timesheets', href: '/timesheets', icon: <Clock className="h-4 w-4" /> },
  { label: 'Ausências', href: '/absences', icon: <CalendarDays className="h-4 w-4" /> },
  { label: 'Calendário', href: '/calendar', icon: <Calendar className="h-4 w-4" /> },
  { label: 'Caixa de Entrada', href: '/workflow/inbox', icon: <Inbox className="h-4 w-4" /> },
  { label: 'Despesas', href: '/expenses', icon: <Wallet className="h-4 w-4" /> },
  { label: 'Financeiro', href: '/analytics/financials', icon: <BarChart3 className="h-4 w-4" /> },
  { label: 'Capacidade', href: '/capacity', icon: <Gauge className="h-4 w-4" /> },
  { label: 'Helpdesk', href: '/helpdesk', icon: <LifeBuoy className="h-4 w-4" /> },
  { label: 'Políticas', href: '/policies', icon: <BookOpen className="h-4 w-4" /> },
  { label: 'Formação', href: '/training', icon: <GraduationCap className="h-4 w-4" /> },
  { label: 'Relatórios', href: '/reports', icon: <FileBarChart className="h-4 w-4" /> },
  { label: 'Privacidade', href: '/gdpr', icon: <ShieldCheck className="h-4 w-4" /> },
  { label: 'Notificações', href: '/notifications', icon: <Bell className="h-4 w-4" /> },
  { label: 'Comunicados', href: '/announcements', icon: <Megaphone className="h-4 w-4" /> },
  { label: 'Administração', href: '/admin/settings', icon: <Settings className="h-4 w-4" /> },
  { label: 'Segurança', href: '/settings/security', icon: <KeyRound className="h-4 w-4" /> },
];

const adminOnlyRoutes = ['/analytics/financials', '/admin/settings'];
const managerOrAdminRoutes = ['/users', '/capacity', '/reports'];

export function AppLayout(): React.JSX.Element {
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const { logout, user, permissions, mfaSetupRequired, sessionTimeoutMinutes } = useAuthStore();
  const navigate = useNavigate();

  useIdleLogout(sessionTimeoutMinutes, () => {
    void logout().then(() => navigate('/login?reason=idle', { replace: true }));
  });

  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));
  const isManagerOrAdmin = isAdmin || permissions.includes('manager');

  const { data: inboxCount } = useQuery({
    queryKey: ['workflow-count'],
    queryFn: () => fetchWorkflowInboxCount(),
    refetchInterval: 60000,
    enabled: !mfaSetupRequired,
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => fetchUnreadCount(),
    refetchInterval: 60000,
    enabled: !mfaSetupRequired,
  });

  const handleLogout = async (): Promise<void> => {
    await logout();
    void navigate('/login');
  };

  return (
    <div className="flex min-h-screen bg-background">
      <aside
        className={cn(
          'fixed left-0 top-0 z-40 h-screen w-64 transform border-r bg-card transition-transform duration-200 ease-in-out md:relative md:translate-x-0',
          !sidebarOpen && '-translate-x-full md:hidden',
        )}
      >
        <div className="flex h-16 items-center border-b px-6">
          <Link to="/" className="text-xl font-bold text-brand-800">
            HR Suite
          </Link>
        </div>
        <nav className="space-y-1 p-4">
          {navItems
            .filter((item) => !mfaSetupRequired || item.href === '/settings/security')
            .filter((item) => !adminOnlyRoutes.includes(item.href) || isAdmin)
            .filter((item) => !managerOrAdminRoutes.includes(item.href) || isManagerOrAdmin)
            .map((item) => (
              <Link
                key={item.href}
                to={item.href}
                className="flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                {item.icon}
                {item.label}
                {item.href === '/workflow/inbox' && (inboxCount?.count ?? 0) > 0 && (
                  <span className="ml-auto flex h-5 w-5 items-center justify-center rounded-full bg-brand-800 text-xs text-white">
                    {String(inboxCount?.count ?? 0)}
                  </span>
                )}
              </Link>
            ))}
        </nav>
      </aside>

      <div className="flex flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-card px-4 shadow-sm">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="icon" onClick={toggleSidebar} className="md:hidden">
              <Menu className="h-5 w-5" />
            </Button>
            <span className="text-sm text-muted-foreground">
              Bem-vindo, {user?.username ?? 'Utilizador'}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              className="relative"
              onClick={() => {
                void navigate('/notifications');
              }}
            >
              <Bell className="h-5 w-5" />
              {(unreadCount?.count ?? 0) > 0 && (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-brand-800 text-[10px] text-white">
                  {(unreadCount?.count ?? 0) > 9 ? '9+' : String(unreadCount?.count ?? 0)}
                </span>
              )}
            </Button>
            <Button variant="ghost" size="icon" onClick={() => void handleLogout()}>
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </header>

        <main className="flex-1 overflow-auto p-4 sm:p-6">
          <div className="w-full">
            <PolicyAcceptanceGate>
              <Outlet />
            </PolicyAcceptanceGate>
          </div>
        </main>
      </div>
    </div>
  );
}
