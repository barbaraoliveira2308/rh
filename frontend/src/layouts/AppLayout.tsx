import * as React from 'react';
import { Link as RouterLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import AccountTreeOutlined from '@mui/icons-material/AccountTreeOutlined';
import AssessmentOutlined from '@mui/icons-material/AssessmentOutlined';
import Badge from '@mui/material/Badge';
import BookOutlined from '@mui/icons-material/BookOutlined';
import Box from '@mui/material/Box';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import CalendarMonthOutlined from '@mui/icons-material/CalendarMonthOutlined';
import DashboardOutlined from '@mui/icons-material/DashboardOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import EventBusyOutlined from '@mui/icons-material/EventBusyOutlined';
import FolderOpenOutlined from '@mui/icons-material/FolderOpenOutlined';
import GroupsOutlined from '@mui/icons-material/GroupsOutlined';
import IconButton from '@mui/material/IconButton';
import InboxOutlined from '@mui/icons-material/InboxOutlined';
import List from '@mui/material/List';
import ListItemButton from '@mui/material/ListItemButton';
import ListItemIcon from '@mui/material/ListItemIcon';
import ListItemText from '@mui/material/ListItemText';
import LogoutOutlined from '@mui/icons-material/LogoutOutlined';
import Menu from '@mui/material/Menu';
import MenuIcon from '@mui/icons-material/Menu';
import MenuItem from '@mui/material/MenuItem';
import NotificationsNoneOutlined from '@mui/icons-material/NotificationsNoneOutlined';
import AccountCircleOutlined from '@mui/icons-material/AccountCircleOutlined';
import PrivacyTipOutlined from '@mui/icons-material/PrivacyTipOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import Tooltip from '@mui/material/Tooltip';
import Toolbar from '@mui/material/Toolbar';
import Typography from '@mui/material/Typography';
import AppBar from '@mui/material/AppBar';
import Avatar from '@mui/material/Avatar';
import Drawer from '@mui/material/Drawer';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Stack from '@mui/material/Stack';
import useMediaQuery from '@mui/material/useMediaQuery';
import { useTheme } from '@mui/material/styles';
import SchoolOutlined from '@mui/icons-material/SchoolOutlined';
import SupportAgentIcon from '@mui/icons-material/SupportAgent';
import { useAuthStore } from '@/stores/auth.store';
import { useUiStore } from '@/stores/ui.store';
import { useIdleLogout } from '@/lib/useIdleLogout';
import { fetchWorkflowInboxCount } from '@/api/workflow.api';
import { fetchUnreadCount } from '@/api/notifications.api';
import { fetchMyEmployee } from '@/api/users.api';
import { PolicyAcceptanceGate } from '@/components/PolicyAcceptanceGate';

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { label: 'Dashboard', href: '/', icon: <DashboardOutlined /> },
  { label: 'Perfil', href: '/profile', icon: <AccountCircleOutlined /> },
  { label: 'Colaboradores', href: '/users', icon: <GroupsOutlined /> },
  { label: 'Organograma', href: '/org-chart', icon: <AccountTreeOutlined /> },
  { label: 'Projetos', href: '/projects', icon: <FolderOpenOutlined /> },
  { label: 'Timesheets', href: '/timesheets', icon: <DescriptionOutlined /> },
  { label: 'Ausências', href: '/absences', icon: <EventBusyOutlined /> },
  { label: 'Calendário', href: '/calendar', icon: <CalendarMonthOutlined /> },
  { label: 'Caixa de Entrada', href: '/workflow/inbox', icon: <InboxOutlined /> },
  { label: 'Despesas', href: '/expenses', icon: <DescriptionOutlined /> },
  { label: 'Financeiro', href: '/analytics/financials', icon: <AssessmentOutlined /> },
  { label: 'Capacidade', href: '/capacity', icon: <SpeedOutlined /> },
  { label: 'Helpdesk', href: '/helpdesk', icon: <SupportAgentIcon /> },
  { label: 'Políticas', href: '/policies', icon: <BookOutlined /> },
  { label: 'Formação', href: '/training', icon: <SchoolOutlined /> },
  { label: 'Relatórios', href: '/reports', icon: <AssessmentOutlined /> },
  { label: 'Privacidade', href: '/gdpr', icon: <PrivacyTipOutlined /> },
  { label: 'Notificações', href: '/notifications', icon: <NotificationsNoneOutlined /> },
  { label: 'Comunicados', href: '/announcements', icon: <CampaignOutlined /> },
  { label: 'Administração', href: '/admin/settings', icon: <SettingsOutlined /> },
  { label: 'Segurança', href: '/settings/security', icon: <ShieldOutlined /> },
];

const adminOnlyRoutes = ['/analytics/financials', '/admin/settings'];
const managerOrAdminRoutes = ['/users', '/capacity', '/reports'];

export function AppLayout(): React.JSX.Element {
  const { sidebarOpen, toggleSidebar, setSidebarOpen } = useUiStore();
  const { logout, user, permissions, mfaSetupRequired, sessionTimeoutMinutes } = useAuthStore();
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [userMenuAnchor, setUserMenuAnchor] = React.useState<HTMLElement | null>(null);
  const { data: employeeProfile } = useQuery({
    queryKey: ['my-employee-profile'],
    queryFn: fetchMyEmployee,
  });

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

  const drawerWidth = sidebarOpen ? 240 : 64;
  const fullName = employeeProfile
    ? `${employeeProfile.firstName} ${employeeProfile.lastName}`
    : (user?.username ?? 'Utilizador');
  const initials = fullName
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();
  const activeRoute =
    navItems.find((item) => item.href === location.pathname)?.label ?? 'Dashboard';

  const drawerContent = (
    <Box sx={{ height: '100%', bgcolor: '#EAF3FB', color: 'text.primary', overflow: 'hidden' }}>
      <Box
        sx={{
          height: 64,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'flex-start' : 'center',
          px: sidebarOpen ? 2.5 : 1.5,
        }}
      >
        <GroupsOutlined
          aria-hidden="true"
          sx={{ mr: sidebarOpen ? 1 : 0, color: 'primary.main' }}
        />
        {sidebarOpen && (
          <Typography
            variant="subtitle1"
            sx={{ fontWeight: 800, color: 'text.primary', whiteSpace: 'nowrap' }}
          >
            HR Suite
          </Typography>
        )}
      </Box>
      <Divider sx={{ borderColor: 'divider' }} />
      <List component="nav" aria-label="Navegação principal" sx={{ px: 1, py: 1.5 }}>
        {navItems
          .filter((item) => !mfaSetupRequired || item.href === '/settings/security')
          .filter((item) => !adminOnlyRoutes.includes(item.href) || isAdmin)
          .filter((item) => !managerOrAdminRoutes.includes(item.href) || isManagerOrAdmin)
          .map((item) => {
            const selected =
              item.href === '/'
                ? location.pathname === '/'
                : location.pathname.startsWith(item.href);
            const link = (
              <ListItemButton
                key={item.href}
                component={RouterLink}
                to={item.href}
                selected={selected}
                aria-label={sidebarOpen ? undefined : item.label}
                onClick={() => {
                  if (isMobile) setSidebarOpen(false);
                }}
                sx={{
                  minHeight: 36,
                  mb: 0.25,
                  px: sidebarOpen ? 1 : 0.75,
                  justifyContent: sidebarOpen ? 'initial' : 'center',
                  color: 'text.secondary',
                  borderRadius: 1.5,
                  '& .MuiListItemIcon-root': {
                    color: 'inherit',
                    minWidth: sidebarOpen ? 28 : 0,
                    justifyContent: 'center',
                    '& svg': { fontSize: 18 },
                  },
                  '&.Mui-selected': {
                    bgcolor: 'rgba(25, 118, 210, 0.16)',
                    color: 'primary.main',
                    '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.22)' },
                  },
                  '&:hover': { bgcolor: 'rgba(25, 118, 210, 0.08)' },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                {sidebarOpen && (
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: {
                        variant: 'body2',
                        sx: {
                          fontSize: 13,
                          fontWeight: selected ? 700 : 500,
                          color: 'inherit',
                          lineHeight: 1.2,
                        },
                      },
                    }}
                  />
                )}
                {sidebarOpen && item.href === '/workflow/inbox' && (inboxCount?.count ?? 0) > 0 && (
                  <Chip
                    size="small"
                    label={String(inboxCount?.count ?? 0)}
                    sx={{
                      height: 22,
                      bgcolor: 'primary.main',
                      color: 'common.white',
                    }}
                  />
                )}
              </ListItemButton>
            );
            return sidebarOpen ? (
              link
            ) : (
              <Tooltip key={item.href} title={item.label} placement="right">
                {link}
              </Tooltip>
            );
          })}
      </List>
    </Box>
  );

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      <Drawer
        variant={isMobile ? 'temporary' : 'permanent'}
        open={isMobile ? sidebarOpen : true}
        onClose={() => {
          setSidebarOpen(false);
        }}
        ModalProps={{ keepMounted: true }}
        sx={{
          width: isMobile ? 0 : drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: isMobile ? 240 : drawerWidth,
            boxSizing: 'border-box',
            border: 0,
            bgcolor: '#EAF3FB',
            color: 'text.primary',
            transition: theme.transitions.create('width'),
          },
        }}
      >
        {drawerContent}
      </Drawer>
      <Box sx={{ display: 'flex', flex: 1, minWidth: 0, flexDirection: 'column' }}>
        <AppBar
          position="sticky"
          color="inherit"
          elevation={0}
          sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: 'background.paper' }}
        >
          <Toolbar sx={{ gap: 1, minHeight: '44px !important', px: { xs: 1, sm: 1.5 } }}>
            <Tooltip title={sidebarOpen ? 'Recolher menu' : 'Expandir menu'}>
              <IconButton
                aria-label={sidebarOpen ? 'Recolher menu lateral' : 'Expandir menu lateral'}
                onClick={toggleSidebar}
                edge="start"
              >
                <MenuIcon />
              </IconButton>
            </Tooltip>
            <Stack
              direction="row"
              spacing={0.75}
              sx={{ alignItems: 'center', minWidth: 130, display: { xs: 'none', sm: 'flex' } }}
            >
              <DashboardOutlined color="action" fontSize="small" />
              <Typography variant="body2" color="text.secondary">
                {activeRoute}
              </Typography>
            </Stack>
            <Box sx={{ flex: 1 }} />
            <Tooltip title="Notificações">
              <IconButton
                aria-label={`Notificações${(unreadCount?.count ?? 0) > 0 ? `, ${String(unreadCount?.count)} não lidas` : ''}`}
                onClick={() => {
                  void navigate('/notifications');
                }}
              >
                <Badge badgeContent={unreadCount?.count ?? 0} color="error" max={9}>
                  <NotificationsNoneOutlined />
                </Badge>
              </IconButton>
            </Tooltip>
            <Button
              onClick={(event) => {
                setUserMenuAnchor(event.currentTarget);
              }}
              color="inherit"
              sx={{ textTransform: 'none', gap: 1, minWidth: 0, px: 1 }}
              aria-label="Abrir menu do utilizador"
            >
              <Avatar
                sx={{
                  width: 32,
                  height: 32,
                  bgcolor: 'secondary.main',
                  fontSize: 13,
                  fontWeight: 700,
                }}
              >
                {initials}
              </Avatar>
              <Typography
                variant="body2"
                sx={{ display: { xs: 'none', md: 'block' }, maxWidth: 150 }}
                noWrap
              >
                {fullName}
              </Typography>
            </Button>
            <Menu
              anchorEl={userMenuAnchor}
              open={Boolean(userMenuAnchor)}
              onClose={() => {
                setUserMenuAnchor(null);
              }}
            >
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  void navigate('/profile');
                }}
              >
                Meu perfil
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  void navigate('/notifications');
                }}
              >
                Notificações
              </MenuItem>
              <MenuItem
                onClick={() => {
                  setUserMenuAnchor(null);
                  void handleLogout();
                }}
              >
                <LogoutOutlined fontSize="small" sx={{ mr: 1 }} />
                Terminar sessão
              </MenuItem>
            </Menu>
          </Toolbar>
        </AppBar>
        <Box
          component="main"
          sx={{
            flex: 1,
            minWidth: 0,
            overflowX: 'hidden',
            p: { xs: 1, sm: 1.25 },
            bgcolor: 'background.default',
          }}
        >
          <PolicyAcceptanceGate>
            <Outlet />
          </PolicyAcceptanceGate>
        </Box>
      </Box>
    </Box>
  );
}
