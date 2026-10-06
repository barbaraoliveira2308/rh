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
import InputAdornment from '@mui/material/InputAdornment';
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
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import SettingsOutlined from '@mui/icons-material/SettingsOutlined';
import ShieldOutlined from '@mui/icons-material/ShieldOutlined';
import SpeedOutlined from '@mui/icons-material/SpeedOutlined';
import TextField from '@mui/material/TextField';
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
  const [searchValue, setSearchValue] = React.useState('');
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

  const drawerWidth = sidebarOpen ? 232 : 64;
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
    <Box sx={{ height: '100%', bgcolor: '#082b4c', color: '#ffffff', overflow: 'hidden' }}>
      <Box
        sx={{
          height: 44,
          display: 'flex',
          alignItems: 'center',
          justifyContent: sidebarOpen ? 'flex-start' : 'center',
          px: sidebarOpen ? 1 : 0.75,
        }}
      >
        <GroupsOutlined aria-hidden="true" sx={{ mr: sidebarOpen ? 0.75 : 0, color: '#ffffff' }} />
        {sidebarOpen && (
          <Typography
            variant="caption"
            sx={{ fontWeight: 800, color: '#ffffff', whiteSpace: 'nowrap' }}
          >
            HR Suite
          </Typography>
        )}
      </Box>
      <Divider sx={{ borderColor: 'rgba(255,255,255,0.12)' }} />
      <List component="nav" aria-label="Navegação principal" sx={{ px: 0.75, py: 0.75 }}>
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
                  minHeight: 32,
                  mb: 0.15,
                  px: sidebarOpen ? 0.75 : 0.5,
                  justifyContent: sidebarOpen ? 'initial' : 'center',
                  color: 'rgba(255,255,255,0.78)',
                  borderRadius: 1.5,
                  '& .MuiListItemIcon-root': {
                    color: 'inherit',
                    minWidth: sidebarOpen ? 25 : 0,
                    justifyContent: 'center',
                    '& svg': { fontSize: 17 },
                  },
                  '&.Mui-selected': {
                    bgcolor: '#1267b1',
                    color: '#ffffff',
                    '&:hover': { bgcolor: '#1976c8' },
                  },
                  '&:hover': { bgcolor: 'rgba(255,255,255,0.08)' },
                }}
              >
                <ListItemIcon>{item.icon}</ListItemIcon>
                {sidebarOpen && (
                  <ListItemText
                    primary={item.label}
                    slotProps={{
                      primary: {
                        variant: 'caption',
                        sx: {
                          fontSize: 10,
                          fontWeight: selected ? 700 : 500,
                          color: 'inherit',
                          lineHeight: 1.1,
                          whiteSpace: 'nowrap',
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
                      height: 19,
                      minWidth: 20,
                      bgcolor: 'primary.main',
                      color: 'common.white',
                      '& .MuiChip-label': { px: 0.5, fontSize: 11 },
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
            bgcolor: '#082b4c',
            color: '#ffffff',
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
            <Box
              component="form"
              onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
                event.preventDefault();
                const term = searchValue.trim();
                void navigate(term ? `/users?search=${encodeURIComponent(term)}` : '/users');
              }}
              sx={{ flex: 1, maxWidth: 560, mx: 'auto' }}
            >
              <TextField
                fullWidth
                size="small"
                value={searchValue}
                onChange={(event) => {
                  setSearchValue(event.target.value);
                }}
                placeholder="Pesquisar colaboradores, projetos, documentos..."
                slotProps={{
                  htmlInput: { 'aria-label': 'Pesquisar colaboradores, projetos e documentos' },
                  input: {
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchOutlined fontSize="small" color="action" />
                      </InputAdornment>
                    ),
                  },
                }}
              />
            </Box>
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
