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
} from 'lucide-react';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import IconButton from '@mui/material/IconButton';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import { Button } from '@/components/ui/button';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { fetchWorkflowInboxCount } from '@/api/workflow.api';
import { fetchUnreadCount } from '@/api/notifications.api';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <LayoutDashboard size={18} /> },
  { label: 'Colaboradores', href: '/users', icon: <Users size={18} /> },
  { label: 'Organograma', href: '/org-chart', icon: <Network size={18} /> },
  { label: 'Projetos', href: '/projects', icon: <FolderKanban size={18} /> },
  { label: 'Timesheets', href: '/timesheets', icon: <Clock size={18} /> },
  { label: 'Ausências', href: '/absences', icon: <CalendarDays size={18} /> },
  { label: 'Calendário', href: '/calendar', icon: <Calendar size={18} /> },
  { label: 'Caixa de Entrada', href: '/workflow/inbox', icon: <Inbox size={18} /> },
  { label: 'Despesas', href: '/expenses', icon: <Wallet size={18} /> },
  { label: 'Financeiro', href: '/analytics/financials', icon: <BarChart3 size={18} /> },
  { label: 'Capacidade', href: '/capacity', icon: <Gauge size={18} /> },
  { label: 'Helpdesk', href: '/helpdesk', icon: <LifeBuoy size={18} /> },
  { label: 'Políticas', href: '/policies', icon: <BookOpen size={18} /> },
  { label: 'Formação', href: '/training', icon: <GraduationCap size={18} /> },
  { label: 'Relatórios', href: '/reports', icon: <FileBarChart size={18} /> },
  { label: 'Privacidade', href: '/gdpr', icon: <ShieldCheck size={18} /> },
  { label: 'Notificações', href: '/notifications', icon: <Bell size={18} /> },
  { label: 'Administração', href: '/admin/settings', icon: <Settings size={18} /> },
];

const adminOnlyRoutes = ['/analytics/financials', '/admin/settings'];
const managerOrAdminRoutes = ['/users', '/capacity', '/reports'];

export function AppLayout(): React.JSX.Element {
  const { sidebarOpen, toggleSidebar } = useUiStore();
  const { logout, user, permissions } = useAuthStore();
  const navigate = useNavigate();

  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));
  const isManagerOrAdmin = isAdmin || permissions.includes('manager');

  const { data: inboxCount } = useQuery({
    queryKey: ['workflow-count'],
    queryFn: () => fetchWorkflowInboxCount(),
    refetchInterval: 60000,
  });

  const { data: unreadCount } = useQuery({
    queryKey: ['notifications-unread-count'],
    queryFn: () => fetchUnreadCount(),
    refetchInterval: 60000,
  });

  const handleLogout = async (): Promise<void> => {
    await logout();
    void navigate('/login');
  };

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Box
        component="aside"
        sx={{
          position: { xs: 'fixed', md: 'relative' },
          zIndex: 40,
          display: sidebarOpen ? 'block' : 'none',
          width: 256,
          height: '100vh',
          flexShrink: 0,
          bgcolor: 'background.paper',
          borderRight: 1,
          borderColor: 'divider',
        }}
      >
        <Toolbar sx={{ px: 3 }}>
          <Typography
            component={Link}
            to="/"
            variant="h6"
            color="primary"
            sx={{ fontWeight: 700, textDecoration: 'none' }}
          >
            HR Suite
          </Typography>
        </Toolbar>
        <List component="nav" sx={{ px: 1.5, py: 1 }}>
          {navItems
            .filter((item) => !adminOnlyRoutes.includes(item.href) || isAdmin)
            .filter((item) => !managerOrAdminRoutes.includes(item.href) || isManagerOrAdmin)
            .map((item) => {
              const hasInboxCount = item.href === '/workflow/inbox' && (inboxCount?.count ?? 0) > 0;
              const label = hasInboxCount
                ? `${item.label} (${String(inboxCount?.count ?? 0)})`
                : item.label;
              return (
                <ListItemButton
                  key={item.href}
                  component={Link}
                  to={item.href}
                  sx={{ borderRadius: 1, mb: 0.25 }}
                >
                  <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.label} />
                  {hasInboxCount && (
                    <Badge
                      color="primary"
                      badgeContent={inboxCount?.count}
                      max={99}
                      aria-label={label}
                    />
                  )}
                </ListItemButton>
              );
            })}
        </List>
      </Box>

      <Box sx={{ display: 'flex', minWidth: 0, flex: 1, flexDirection: 'column' }}>
        <Box
          component="header"
          sx={{
            position: 'sticky',
            top: 0,
            zIndex: 30,
            display: 'flex',
            height: 64,
            alignItems: 'center',
            justifyContent: 'space-between',
            borderBottom: 1,
            borderColor: 'divider',
            bgcolor: 'background.paper',
            px: 2,
            boxShadow: 1,
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
            <IconButton onClick={toggleSidebar} aria-label="Alternar menu">
              <Menu size={20} />
            </IconButton>
            <Typography variant="body2" color="text.secondary">
              Bem-vindo, {user?.username ?? 'Utilizador'}
            </Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
            <IconButton
              aria-label="Notificações"
              onClick={() => {
                void navigate('/notifications');
              }}
            >
              <Badge color="primary" badgeContent={unreadCount?.count ?? 0} max={9}>
                <Bell size={20} />
              </Badge>
            </IconButton>
            <Button
              variant="ghost"
              size="icon"
              aria-label="Terminar sessão"
              onClick={() => void handleLogout()}
            >
              <LogOut size={20} />
            </Button>
          </Box>
        </Box>

        <Box component="main" sx={{ flex: 1, overflow: 'auto', p: { xs: 2, md: 3 } }}>
          <Box sx={{ mx: 'auto', maxWidth: 1440 }}>
            <Outlet />
          </Box>
        </Box>
      </Box>
    </Box>
  );
}
