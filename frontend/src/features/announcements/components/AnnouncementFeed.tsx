import * as React from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import VideoLibraryOutlined from '@mui/icons-material/VideoLibraryOutlined';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import Typography from '@mui/material/Typography';
import { AnnouncementDetailsDialog } from '@/features/announcements/components/AnnouncementDetailsDialog';
import { AnnouncementPostCard } from '@/features/announcements/components/AnnouncementPostCard';
import { emptyAnnouncementSocialState } from '@/features/announcements/services/announcementSocialStore';
import { useAnnouncements } from '@/features/announcements/hooks/useAnnouncements';
import type { Announcement } from '@/types/announcements';

type FeedFilter = 'all' | 'unread' | 'videos' | 'documents' | 'urgent';
type FeedPeriod = 'all' | '30days' | 'month';

function isUrgent(announcement: Announcement): boolean {
  const text = `${announcement.title} ${announcement.body ?? ''}`.toLocaleLowerCase('pt-PT');
  return text.includes('urgente') || text.includes('[urg') || text.includes('manutenção planeada');
}

function dateGroup(value: string | null): string {
  if (!value) return 'Sem data';
  const date = dayjs(value);
  const today = dayjs();
  if (date.isSame(today, 'day')) return 'Hoje';
  if (date.isAfter(today.startOf('week'))) return 'Esta semana';
  return date.format('MMMM [de] YYYY');
}

export function AnnouncementFeed({
  departments,
  canPublish,
}: {
  departments: string[];
  canPublish: boolean;
}): React.JSX.Element {
  const navigate = useNavigate();
  const feed = useAnnouncements();
  const scrollRef = React.useRef<HTMLDivElement | null>(null);
  const sentinelRef = React.useRef<HTMLDivElement | null>(null);
  const [search, setSearch] = React.useState('');
  const [filter, setFilter] = React.useState<FeedFilter>('all');
  const [department, setDepartment] = React.useState('all');
  const [period, setPeriod] = React.useState<FeedPeriod>('all');
  const [selected, setSelected] = React.useState<Announcement | null>(null);

  React.useEffect(() => {
    const root = scrollRef.current;
    const sentinel = sentinelRef.current;
    if (!root || !sentinel || !feed.hasMore) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !feed.isLoadingMore) {
          void feed.loadMore();
        }
      },
      { root, rootMargin: '180px 0px' },
    );
    observer.observe(sentinel);
    return () => {
      observer.disconnect();
    };
  }, [feed.hasMore, feed.isLoadingMore, feed.loadMore]);

  const departmentsAvailable = [
    ...new Set([
      ...departments,
      ...feed.announcements
        .map((item) => item.author.department?.name)
        .filter((name): name is string => Boolean(name)),
    ]),
  ].sort((left, right) => left.localeCompare(right, 'pt-PT'));
  const filtered = feed.announcements.filter((announcement) => {
    const social = feed.social[announcement.id] ?? emptyAnnouncementSocialState();
    const content =
      `${announcement.title} ${announcement.body ?? ''} ${announcement.author.firstName} ${announcement.author.lastName}`.toLocaleLowerCase(
        'pt-PT',
      );
    if (search.trim() && !content.includes(search.trim().toLocaleLowerCase('pt-PT'))) return false;
    if (filter === 'unread' && social.isRead) return false;
    if (filter === 'videos' && !announcement.assets.some((asset) => asset.assetType === 'video'))
      return false;
    if (
      filter === 'documents' &&
      !announcement.assets.some(
        (asset) => asset.assetType === 'document' || asset.assetType === 'link',
      )
    )
      return false;
    if (filter === 'urgent' && !isUrgent(announcement)) return false;
    if (department !== 'all' && announcement.author.department?.name !== department) return false;
    if (period !== 'all' && announcement.publishedAt) {
      const date = dayjs(announcement.publishedAt);
      const cutoff = period === '30days' ? dayjs().subtract(30, 'day') : dayjs().startOf('month');
      if (date.isBefore(cutoff)) return false;
    }
    return true;
  });

  const groups = new Map<string, Announcement[]>();
  for (const announcement of filtered) {
    const label = dateGroup(announcement.publishedAt);
    groups.set(label, [...(groups.get(label) ?? []), announcement]);
  }

  const openAnnouncement = (announcement: Announcement): void => {
    feed.markAsRead(announcement.id);
    setSelected(announcement);
  };

  const shareAnnouncement = (announcement: Announcement): void => {
    const shareUrl = `${window.location.origin}/announcements#${announcement.id}`;
    void navigator.clipboard.writeText(shareUrl).catch(() => undefined);
  };

  const unreadCount = feed.announcements.filter(
    (announcement) => !(feed.social[announcement.id] ?? emptyAnnouncementSocialState()).isRead,
  ).length;

  return (
    <Card variant="outlined" sx={{ borderRadius: 1.5, boxShadow: 'none', minWidth: 0 }}>
      <CardHeader
        title="Comunicados"
        subheader="Histórico de atualizações da empresa"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        subheaderTypographyProps={{ variant: 'body2' }}
        action={
          canPublish ? (
            <Button
              variant="contained"
              size="small"
              startIcon={<CampaignOutlined />}
              onClick={() => {
                void navigate('/announcements');
              }}
            >
              Publicar comunicado
            </Button>
          ) : undefined
        }
      />
      <CardContent sx={{ pt: 0 }}>
        <Stack spacing={1.25} sx={{ mb: 1.5 }}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <TextField
              size="small"
              fullWidth
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder="Pesquisar comunicados"
              slotProps={{
                htmlInput: { 'aria-label': 'Pesquisar comunicados' },
                input: {
                  startAdornment: (
                    <InputAdornment position="start">
                      <SearchOutlined fontSize="small" />
                    </InputAdornment>
                  ),
                },
              }}
            />
            <TextField
              select
              size="small"
              label="Departamento"
              value={department}
              onChange={(event) => {
                setDepartment(event.target.value);
              }}
              sx={{ minWidth: { sm: 200 } }}
            >
              <MenuItem value="all">Todos os departamentos</MenuItem>
              {departmentsAvailable.map((item) => (
                <MenuItem key={item} value={item}>
                  {item}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              select
              size="small"
              label="Período"
              value={period}
              onChange={(event) => {
                setPeriod(event.target.value as FeedPeriod);
              }}
              sx={{ minWidth: { sm: 160 } }}
            >
              <MenuItem value="all">Todo o histórico</MenuItem>
              <MenuItem value="30days">Últimos 30 dias</MenuItem>
              <MenuItem value="month">Este mês</MenuItem>
            </TextField>
          </Stack>
          <Box sx={{ overflowX: 'auto', maxWidth: '100%' }}>
            <ToggleButtonGroup
              exclusive
              size="small"
              value={filter}
              onChange={(_event, value: FeedFilter | null) => {
                if (value) setFilter(value);
              }}
              aria-label="Filtrar comunicados"
              sx={{ '& .MuiToggleButton-root': { whiteSpace: 'nowrap', px: 1.5 } }}
            >
              <ToggleButton value="all">Todos</ToggleButton>
              <ToggleButton value="unread">
                Não lidos{' '}
                <Chip size="small" label={String(unreadCount)} sx={{ ml: 0.75, height: 20 }} />
              </ToggleButton>
              <ToggleButton value="videos">
                <VideoLibraryOutlined fontSize="small" sx={{ mr: 0.5 }} />
                Vídeos
              </ToggleButton>
              <ToggleButton value="documents">
                <DescriptionOutlined fontSize="small" sx={{ mr: 0.5 }} />
                Documentos
              </ToggleButton>
              <ToggleButton value="urgent">Urgentes</ToggleButton>
            </ToggleButtonGroup>
          </Box>
        </Stack>

        <Box
          ref={scrollRef}
          sx={{ maxHeight: 620, overflowY: 'auto', overflowX: 'hidden', pr: 0.5 }}
        >
          {feed.isLoading ? (
            <Box
              sx={{
                display: 'grid',
                gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                gap: 1.5,
              }}
            >
              {[0, 1, 2, 3].map((key) => (
                <Skeleton key={key} variant="rounded" height={210} />
              ))}
            </Box>
          ) : feed.isError ? (
            <Alert
              severity="error"
              action={
                <Button
                  color="inherit"
                  size="small"
                  onClick={() => {
                    void feed.refresh();
                  }}
                >
                  Tentar novamente
                </Button>
              }
            >
              Não foi possível carregar os comunicados.
            </Alert>
          ) : filtered.length === 0 ? (
            <Box sx={{ py: 6, textAlign: 'center' }}>
              <CampaignOutlined color="disabled" sx={{ fontSize: 32, mb: 1 }} />
              <Typography variant="subtitle2" sx={{ fontWeight: 700 }}>
                Nenhum comunicado encontrado
              </Typography>
              <Typography color="text.secondary" variant="body2" sx={{ mt: 0.5 }}>
                Ajuste os filtros ou pesquise outro termo.
              </Typography>
            </Box>
          ) : (
            <Stack spacing={2}>
              {[...groups.entries()].map(([group, announcements]) => (
                <Box key={group}>
                  <Typography
                    variant="caption"
                    color="text.secondary"
                    sx={{ display: 'block', mb: 0.75, fontWeight: 700 }}
                  >
                    {group}
                  </Typography>
                  <Box
                    sx={{
                      display: 'grid',
                      gridTemplateColumns: { xs: '1fr', md: 'repeat(2, minmax(0, 1fr))' },
                      gap: 1.5,
                    }}
                  >
                    {announcements.map((announcement) => (
                      <AnnouncementPostCard
                        key={announcement.id}
                        announcement={announcement}
                        social={feed.social[announcement.id] ?? emptyAnnouncementSocialState()}
                        canPin={canPublish}
                        onOpen={() => {
                          openAnnouncement(announcement);
                        }}
                        onToggleReaction={() => {
                          feed.toggleReaction(announcement.id);
                        }}
                        onToggleSaved={() => {
                          feed.toggleSaved(announcement.id);
                        }}
                        onTogglePinned={() => {
                          feed.togglePinned(announcement.id);
                        }}
                        onShare={() => {
                          shareAnnouncement(announcement);
                        }}
                      />
                    ))}
                  </Box>
                </Box>
              ))}
              <Box
                ref={sentinelRef}
                aria-hidden="true"
                sx={{ minHeight: 8, gridColumn: '1 / -1' }}
              />
              {feed.isLoadingMore && (
                <Stack
                  direction="row"
                  spacing={1}
                  sx={{ py: 1.5, justifyContent: 'center', alignItems: 'center' }}
                >
                  <CircularProgress size={16} />
                  <Typography color="text.secondary" variant="caption">
                    A carregar mais comunicados...
                  </Typography>
                </Stack>
              )}
              {!feed.hasMore && (
                <Typography
                  color="text.secondary"
                  variant="caption"
                  sx={{ py: 1, textAlign: 'center' }}
                >
                  Você chegou ao fim dos comunicados.
                </Typography>
              )}
            </Stack>
          )}
        </Box>
      </CardContent>
      <AnnouncementDetailsDialog
        announcement={selected}
        social={
          selected
            ? (feed.social[selected.id] ?? emptyAnnouncementSocialState())
            : emptyAnnouncementSocialState()
        }
        open={Boolean(selected)}
        onClose={() => {
          setSelected(null);
        }}
        onAddComment={(comment) => {
          if (selected) feed.addComment(selected.id, comment);
        }}
      />
    </Card>
  );
}
