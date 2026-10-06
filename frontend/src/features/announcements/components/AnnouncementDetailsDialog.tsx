import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import AnnouncementOutlined from '@mui/icons-material/AnnouncementOutlined';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { AnnouncementAssetPreview } from '@/components/AnnouncementAssetPreview';
import { fetchAnnouncementAssetBlob } from '@/api/announcements.api';
import type { Announcement, AnnouncementAsset } from '@/types/announcements';
import type { AnnouncementSocialState } from '../services/announcementSocialStore';

export function AnnouncementDetailsDialog({
  announcement,
  social,
  open,
  onClose,
  onAddComment,
}: {
  announcement: Announcement | null;
  social: AnnouncementSocialState;
  open: boolean;
  onClose: () => void;
  onAddComment: (comment: string) => void;
}): React.JSX.Element {
  const [comment, setComment] = React.useState('');
  const videoAsset = announcement?.assets.find((asset) => asset.assetType === 'video');
  const videoQuery = useQuery({
    queryKey: ['announcement-video', videoAsset?.id],
    queryFn: () => fetchAnnouncementAssetBlob(videoAsset?.url ?? ''),
    enabled: open && Boolean(videoAsset),
    staleTime: Infinity,
  });
  const [videoUrl, setVideoUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!videoQuery.data) return;
    const url = URL.createObjectURL(videoQuery.data);
    setVideoUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [videoQuery.data]);

  const submitComment = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    if (!comment.trim()) return;
    onAddComment(comment);
    setComment('');
  };
  const authorName = announcement
    ? `${announcement.author.firstName} ${announcement.author.lastName}`.trim()
    : '';

  return (
    <Dialog
      open={open}
      onClose={onClose}
      fullWidth
      maxWidth="md"
      aria-labelledby="announcement-dialog-title"
    >
      {announcement && (
        <>
          <DialogTitle id="announcement-dialog-title">{announcement.title}</DialogTitle>
          <DialogContent dividers>
            <Stack spacing={2}>
              <Typography color="text.secondary" variant="body2">
                {authorName}
                {announcement.author.department?.name
                  ? ` · ${announcement.author.department.name}`
                  : ''}
                {announcement.publishedAt
                  ? ` · ${new Date(announcement.publishedAt).toLocaleString('pt-PT')}`
                  : ''}
              </Typography>
              {announcement.body && (
                <Typography sx={{ whiteSpace: 'pre-wrap', overflowWrap: 'anywhere' }}>
                  {announcement.body}
                </Typography>
              )}
              {announcement.assets.map((asset: AnnouncementAsset) => {
                if (asset.assetType === 'video') {
                  return videoQuery.isError ? (
                    <Typography key={asset.id} color="text.secondary" variant="body2">
                      Não foi possível abrir este vídeo.
                    </Typography>
                  ) : videoUrl ? (
                    <Box
                      key={asset.id}
                      component="video"
                      controls
                      playsInline
                      preload="metadata"
                      src={videoUrl}
                      sx={{
                        display: 'block',
                        width: '100%',
                        maxHeight: 420,
                        borderRadius: 2,
                        bgcolor: 'common.black',
                      }}
                    />
                  ) : (
                    <Stack key={asset.id} direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                      <CircularProgress size={18} />
                      <Typography variant="body2">A carregar vídeo…</Typography>
                    </Stack>
                  );
                }
                if (asset.assetType === 'image') {
                  return <AnnouncementAssetPreview asset={asset} key={asset.id} maxHeight={420} />;
                }
                return (
                  <Button
                    key={asset.id}
                    href={asset.url}
                    target="_blank"
                    rel="noreferrer"
                    startIcon={<AnnouncementOutlined />}
                  >
                    Abrir {asset.fileName ?? 'documento'}
                  </Button>
                );
              })}
              {(announcement.forms ?? []).map((form) => (
                <Typography key={form.id} variant="subtitle2">
                  {form.title}
                </Typography>
              ))}
              <Stack spacing={1}>
                <Typography variant="subtitle2">
                  Comentários · {String(social.comments.length)}
                </Typography>
                {social.comments.map((entry, index) => (
                  <Typography key={`${String(index)}-${entry}`} variant="body2">
                    {entry}
                  </Typography>
                ))}
                <Stack component="form" direction="row" spacing={1} onSubmit={submitComment}>
                  <TextField
                    size="small"
                    fullWidth
                    label="Escrever comentário"
                    value={comment}
                    onChange={(event) => {
                      setComment(event.target.value);
                    }}
                  />
                  <Button type="submit" variant="contained" disabled={!comment.trim()}>
                    Comentar
                  </Button>
                </Stack>
              </Stack>
            </Stack>
          </DialogContent>
          <DialogActions>
            <Button onClick={onClose}>Fechar</Button>
          </DialogActions>
        </>
      )}
    </Dialog>
  );
}
