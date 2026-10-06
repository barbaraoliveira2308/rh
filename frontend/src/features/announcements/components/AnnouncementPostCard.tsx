import * as React from 'react';
import dayjs from 'dayjs';
import { useQuery } from '@tanstack/react-query';
import Avatar from '@mui/material/Avatar';
import Badge from '@mui/material/Badge';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardActions from '@mui/material/CardActions';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import Bookmark from '@mui/icons-material/Bookmark';
import BookmarkBorder from '@mui/icons-material/BookmarkBorder';
import CampaignOutlined from '@mui/icons-material/CampaignOutlined';
import DescriptionOutlined from '@mui/icons-material/DescriptionOutlined';
import MoreVert from '@mui/icons-material/MoreVert';
import ThumbUp from '@mui/icons-material/ThumbUp';
import ThumbUpOutlined from '@mui/icons-material/ThumbUpOutlined';
import VideoLibraryOutlined from '@mui/icons-material/VideoLibraryOutlined';
import { fetchAnnouncementAssetBlob } from '@/api/announcements.api';
import type { Announcement, AnnouncementAsset } from '@/types/announcements';
import type { AnnouncementSocialState } from '../services/announcementSocialStore';

function relativeDate(value: string | null): string {
  if (!value) return 'Publicado';
  const date = dayjs(value);
  const minutes = dayjs().diff(date, 'minute');
  if (minutes < 1) return 'Agora';
  if (minutes < 60) return `há ${String(minutes)} min`;
  const hours = dayjs().diff(date, 'hour');
  if (hours < 24) return `há ${String(hours)} h`;
  const days = dayjs().diff(date, 'day');
  if (days < 7) return `há ${String(days)} dias`;
  return date.format('DD/MM/YYYY');
}

function isUrgent(announcement: Announcement): boolean {
  const text = `${announcement.title} ${announcement.body ?? ''}`.toLocaleLowerCase('pt-PT');
  return text.includes('urgente') || text.includes('[urg') || text.includes('manutenção planeada');
}

function ImageThumbnail({ asset }: { asset: AnnouncementAsset }): React.JSX.Element {
  const query = useQuery({
    queryKey: ['announcement-thumbnail', asset.id],
    queryFn: () => fetchAnnouncementAssetBlob(asset.url),
    staleTime: Infinity,
  });
  const [url, setUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!query.data) return;
    const nextUrl = URL.createObjectURL(query.data);
    setUrl(nextUrl);
    return () => {
      URL.revokeObjectURL(nextUrl);
    };
  }, [query.data]);

  if (!url) {
    return (
      <Box
        sx={{
          mt: 1,
          height: 104,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 1,
          bgcolor: 'action.hover',
        }}
      >
        <Typography color="text.secondary" variant="caption">
          {query.isError ? 'Imagem não disponível' : 'A carregar imagem…'}
        </Typography>
      </Box>
    );
  }
  return (
    <Box
      component="img"
      src={url}
      alt={asset.fileName ?? 'Imagem do comunicado'}
      sx={{ mt: 1, width: '100%', height: 104, objectFit: 'cover', borderRadius: 1 }}
    />
  );
}

export function AnnouncementPostCard({
  announcement,
  social,
  canPin,
  onOpen,
  onToggleReaction,
  onToggleSaved,
  onTogglePinned,
  onShare,
}: {
  announcement: Announcement;
  social: AnnouncementSocialState;
  canPin: boolean;
  onOpen: () => void;
  onToggleReaction: () => void;
  onToggleSaved: () => void;
  onTogglePinned: () => void;
  onShare: () => void;
}): React.JSX.Element {
  const author = `${announcement.author.firstName} ${announcement.author.lastName}`.trim();
  const department = announcement.author.department?.name ?? 'Organização';
  const urgent = isUrgent(announcement);
  const imageAssets = announcement.assets
    .filter((asset) => asset.assetType === 'image')
    .slice(0, 1);
  const videoCount = announcement.assets.filter((asset) => asset.assetType === 'video').length;
  const documents = announcement.assets.filter(
    (asset) => asset.assetType === 'document' || asset.assetType === 'link',
  );
  const body = announcement.body ?? '';
  const showMore = body.length > 240;
  const initials = author
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0] ?? '')
    .join('')
    .toUpperCase();

  return (
    <Card
      variant="outlined"
      sx={{ height: '100%', borderRadius: 1.5, boxShadow: 'none', minWidth: 0 }}
    >
      <CardHeader
        avatar={
          <Badge color="secondary" variant="dot" invisible={social.isRead} overlap="circular">
            <Avatar
              sx={{ width: 36, height: 36, bgcolor: 'primary.main', fontSize: 13, fontWeight: 700 }}
            >
              {initials}
            </Avatar>
          </Badge>
        }
        title={
          <Typography variant="body2" sx={{ fontWeight: 700 }}>
            {author}
          </Typography>
        }
        subheader={
          <Typography component="span" variant="caption" color="text.secondary">
            {department} ·{' '}
            <Tooltip
              title={
                announcement.publishedAt
                  ? new Date(announcement.publishedAt).toLocaleString('pt-PT')
                  : ''
              }
            >
              <span>{relativeDate(announcement.publishedAt)}</span>
            </Tooltip>
          </Typography>
        }
        action={
          canPin ? (
            <Tooltip title={social.isPinned ? 'Desafixar publicação' : 'Fixar publicação'}>
              <IconButton
                aria-label={social.isPinned ? 'Desafixar comunicado' : 'Fixar comunicado'}
                size="small"
                onClick={onTogglePinned}
              >
                <MoreVert fontSize="small" />
              </IconButton>
            </Tooltip>
          ) : undefined
        }
        sx={{ pb: 0.5, '& .MuiCardHeader-content': { minWidth: 0 } }}
      />
      <CardContent sx={{ pt: 1, pb: 0.5 }}>
        <Stack direction="row" spacing={0.75} sx={{ mb: 0.75, flexWrap: 'wrap' }}>
          {social.isPinned && (
            <Chip
              size="small"
              icon={<CampaignOutlined />}
              label="Fixado"
              color="primary"
              variant="outlined"
            />
          )}
          {urgent && <Chip size="small" label="Urgente" color="error" variant="outlined" />}
          {videoCount > 0 && (
            <Chip size="small" icon={<VideoLibraryOutlined />} label="Vídeo" variant="outlined" />
          )}
          {documents.length > 0 && (
            <Chip
              size="small"
              icon={<DescriptionOutlined />}
              label="Documento"
              variant="outlined"
            />
          )}
        </Stack>
        <Typography
          component="h3"
          variant="subtitle2"
          sx={{ fontWeight: 700, overflowWrap: 'anywhere' }}
        >
          {announcement.title}
        </Typography>
        {body && (
          <Typography
            color="text.secondary"
            variant="body2"
            sx={{ mt: 0.5, overflowWrap: 'anywhere' }}
          >
            {showMore ? `${body.slice(0, 240).trimEnd()}…` : body}
            {showMore && (
              <Box
                component="button"
                onClick={onOpen}
                sx={{
                  ml: 0.5,
                  p: 0,
                  border: 0,
                  bgcolor: 'transparent',
                  color: 'primary.main',
                  font: 'inherit',
                  fontWeight: 700,
                  cursor: 'pointer',
                }}
              >
                Ver mais
              </Box>
            )}
          </Typography>
        )}
        {imageAssets.map((asset) => (
          <ImageThumbnail asset={asset} key={asset.id} />
        ))}
        {videoCount > 0 && (
          <Box
            role="button"
            tabIndex={0}
            aria-label={`Abrir ${String(videoCount)} vídeo(s) do comunicado`}
            onClick={onOpen}
            onKeyDown={(event) => {
              if (event.key === 'Enter' || event.key === ' ') onOpen();
            }}
            sx={{
              mt: 1,
              height: 104,
              display: 'grid',
              placeItems: 'center',
              borderRadius: 1,
              bgcolor: 'grey.900',
              color: 'common.white',
              cursor: 'pointer',
            }}
          >
            <Stack spacing={0.5} sx={{ alignItems: 'center' }}>
              <VideoLibraryOutlined />
              <Typography variant="caption">Ver vídeo · sem reprodução automática</Typography>
            </Stack>
          </Box>
        )}
        {documents.slice(0, 2).map((asset) => (
          <Button
            key={asset.id}
            startIcon={<DescriptionOutlined />}
            size="small"
            onClick={onOpen}
            sx={{ mt: 0.5, maxWidth: '100%' }}
          >
            <Typography noWrap variant="caption">
              {asset.fileName ?? 'Abrir documento'}
            </Typography>
          </Button>
        ))}
      </CardContent>
      <CardActions sx={{ px: 1.5, pt: 0.5, pb: 1, gap: 0.25, flexWrap: 'wrap' }}>
        <Tooltip title={social.hasReacted ? 'Remover reação' : 'Gostar'}>
          <IconButton
            aria-label={social.hasReacted ? 'Remover gosto' : 'Gostar do comunicado'}
            size="small"
            onClick={onToggleReaction}
          >
            {social.hasReacted ? (
              <ThumbUp color="primary" fontSize="small" />
            ) : (
              <ThumbUpOutlined fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
        <Typography color="text.secondary" variant="caption">
          {String(social.hasReacted ? 1 : 0)}
        </Typography>
        <Button size="small" onClick={onOpen}>
          {String(social.comments.length)} comentários
        </Button>
        <Tooltip title={social.isSaved ? 'Remover dos guardados' : 'Guardar'}>
          <IconButton
            aria-label={social.isSaved ? 'Remover comunicado guardado' : 'Guardar comunicado'}
            size="small"
            onClick={onToggleSaved}
          >
            {social.isSaved ? (
              <Bookmark color="primary" fontSize="small" />
            ) : (
              <BookmarkBorder fontSize="small" />
            )}
          </IconButton>
        </Tooltip>
        <Button size="small" onClick={onShare}>
          Partilhar
        </Button>
      </CardActions>
    </Card>
  );
}
