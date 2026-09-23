import * as React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import IconButton from '@mui/material/IconButton';
import CloseIcon from '@mui/icons-material/Close';
import FullscreenIcon from '@mui/icons-material/Fullscreen';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { fetchAnnouncementAssetBlob } from '@/api/announcements.api';
import type { AnnouncementAsset } from '@/types/announcements';

function useAnnouncementAssetObjectUrl(asset: AnnouncementAsset): string | null {
  const assetBlobQuery = useQuery({
    queryKey: ['announcement-asset', asset.id],
    queryFn: () => fetchAnnouncementAssetBlob(asset.url),
    enabled: asset.assetType === 'image' || asset.assetType === 'video',
    staleTime: Infinity,
  });

  const [objectUrl, setObjectUrl] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!assetBlobQuery.data) return;
    const url = URL.createObjectURL(assetBlobQuery.data);
    setObjectUrl(url);
    return () => {
      URL.revokeObjectURL(url);
    };
  }, [assetBlobQuery.data]);

  return objectUrl;
}

export function AnnouncementAssetPreview({
  asset,
  maxHeight = 560,
}: {
  asset: AnnouncementAsset;
  maxHeight?: number;
}): React.JSX.Element {
  const objectUrl = useAnnouncementAssetObjectUrl(asset);
  const [expanded, setExpanded] = React.useState(false);

  const downloadMutation = useMutation({
    mutationFn: () => fetchAnnouncementAssetBlob(asset.url),
    onSuccess: (blob) => {
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = asset.fileName ?? 'documento';
      anchor.click();
      URL.revokeObjectURL(url);
    },
  });

  if (asset.assetType === 'image') {
    return objectUrl ? (
      <>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: { xs: 320, sm: 460, md: maxHeight },
            borderRadius: 1,
            bgcolor: 'action.hover',
            overflow: 'hidden',
          }}
        >
          <Box
            component="img"
            src={objectUrl}
            sx={{ width: '100%', height: '100%', objectFit: 'contain' }}
          />
          <IconButton
            aria-label="Expandir imagem"
            onClick={() => {
              setExpanded(true);
            }}
            size="small"
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              bgcolor: 'background.paper',
              '&:hover': { bgcolor: 'background.paper' },
            }}
          >
            <FullscreenIcon fontSize="small" />
          </IconButton>
        </Box>
        <Dialog
          fullWidth
          maxWidth="xl"
          open={expanded}
          onClose={() => {
            setExpanded(false);
          }}
        >
          <DialogContent sx={{ bgcolor: 'common.black', p: 1, position: 'relative' }}>
            <IconButton
              aria-label="Fechar imagem"
              onClick={() => {
                setExpanded(false);
              }}
              sx={{ position: 'absolute', right: 8, top: 8, color: 'common.white', zIndex: 1 }}
            >
              <CloseIcon />
            </IconButton>
            <Box
              component="img"
              src={objectUrl}
              sx={{
                display: 'block',
                width: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                mx: 'auto',
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    ) : (
      <LoadingSpinner size={24} />
    );
  }

  if (asset.assetType === 'video') {
    return objectUrl ? (
      <>
        <Box
          sx={{
            position: 'relative',
            width: '100%',
            height: { xs: 320, sm: 460, md: maxHeight },
            borderRadius: 1,
            bgcolor: 'common.black',
            overflow: 'hidden',
          }}
        >
          <Box
            component="video"
            controls
            src={objectUrl}
            sx={{ display: 'block', width: '100%', height: '100%', objectFit: 'contain' }}
          />
          <IconButton
            aria-label="Expandir vídeo"
            onClick={() => {
              setExpanded(true);
            }}
            size="small"
            sx={{
              position: 'absolute',
              right: 8,
              top: 8,
              color: 'common.white',
              bgcolor: 'rgba(0, 0, 0, 0.55)',
              '&:hover': { bgcolor: 'rgba(0, 0, 0, 0.7)' },
            }}
          >
            <FullscreenIcon fontSize="small" />
          </IconButton>
        </Box>
        <Dialog
          fullWidth
          maxWidth="xl"
          open={expanded}
          onClose={() => {
            setExpanded(false);
          }}
        >
          <DialogContent sx={{ bgcolor: 'common.black', p: 1, position: 'relative' }}>
            <IconButton
              aria-label="Fechar vídeo"
              onClick={() => {
                setExpanded(false);
              }}
              sx={{ position: 'absolute', right: 8, top: 8, color: 'common.white', zIndex: 1 }}
            >
              <CloseIcon />
            </IconButton>
            <Box
              component="video"
              autoPlay
              controls
              src={objectUrl}
              sx={{
                display: 'block',
                width: '100%',
                maxHeight: '85vh',
                objectFit: 'contain',
                mx: 'auto',
              }}
            />
          </DialogContent>
        </Dialog>
      </>
    ) : (
      <LoadingSpinner size={24} />
    );
  }

  if (asset.assetType === 'document') {
    return (
      <Button
        disabled={downloadMutation.isPending}
        onClick={() => {
          downloadMutation.mutate();
        }}
        type="button"
        variant="outline"
      >
        {downloadMutation.isPending ? (
          <LoadingSpinner size={16} />
        ) : (
          (asset.fileName ?? 'Documento')
        )}
      </Button>
    );
  }

  return (
    <a className="text-brand-800 hover:underline" href={asset.url} rel="noreferrer" target="_blank">
      {asset.url}
    </a>
  );
}
