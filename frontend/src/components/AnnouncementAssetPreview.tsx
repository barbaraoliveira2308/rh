import * as React from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import Box from '@mui/material/Box';
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
  maxHeight = 320,
}: {
  asset: AnnouncementAsset;
  maxHeight?: number;
}): React.JSX.Element {
  const objectUrl = useAnnouncementAssetObjectUrl(asset);

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
      <Box
        component="img"
        src={objectUrl}
        sx={{ maxWidth: '100%', maxHeight, borderRadius: 1, display: 'block' }}
      />
    ) : (
      <LoadingSpinner size={24} />
    );
  }

  if (asset.assetType === 'video') {
    return objectUrl ? (
      <Box
        component="video"
        controls
        src={objectUrl}
        sx={{ width: '100%', maxHeight, borderRadius: 1 }}
      />
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
