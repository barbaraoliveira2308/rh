import * as React from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import AddLinkIcon from '@mui/icons-material/AddLink';
import CampaignIcon from '@mui/icons-material/Campaign';
import ImageIcon from '@mui/icons-material/Image';
import PollIcon from '@mui/icons-material/Poll';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  addAnnouncementLink,
  createAnnouncement,
  fetchAnnouncements,
  uploadAnnouncementAsset,
} from '@/api/announcements.api';
import type { AnnouncementAssetType, AnnouncementFormField } from '@/types/announcements';

const defaultField: AnnouncementFormField = {
  name: 'email',
  label: 'Email',
  type: 'email',
  required: true,
};

export function AnnouncementsPage(): React.JSX.Element {
  const queryClient = useQueryClient();
  const loadMoreRef = React.useRef<HTMLDivElement | null>(null);
  const [title, setTitle] = React.useState('');
  const [body, setBody] = React.useState('');
  const [formEnabled, setFormEnabled] = React.useState(false);
  const [formTitle, setFormTitle] = React.useState('Inscrição');
  const [linkUrl, setLinkUrl] = React.useState('');
  const [assetType, setAssetType] = React.useState<AnnouncementAssetType>('image');
  const [assetFile, setAssetFile] = React.useState<File | null>(null);

  const announcementsQuery = useInfiniteQuery({
    queryKey: ['announcements'],
    queryFn: ({ pageParam }) => fetchAnnouncements(pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (page) => (page.hasMore ? page.nextCursor : undefined),
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      const announcement = await createAnnouncement({
        title,
        body,
        forms: formEnabled ? [{ title: formTitle, fields: [defaultField] }] : [],
      });
      if (linkUrl.trim()) await addAnnouncementLink(announcement.id, 'link', linkUrl.trim());
      if (assetFile) await uploadAnnouncementAsset(announcement.id, assetType, assetFile);
      return announcement;
    },
    onSuccess: async () => {
      setTitle('');
      setBody('');
      setFormEnabled(false);
      setLinkUrl('');
      setAssetFile(null);
      await queryClient.invalidateQueries({ queryKey: ['announcements'] });
    },
  });

  React.useEffect(() => {
    const element = loadMoreRef.current;
    if (!element) return;
    const observer = new IntersectionObserver((entries): void => {
      if (
        entries[0]?.isIntersecting &&
        announcementsQuery.hasNextPage &&
        !announcementsQuery.isFetchingNextPage
      ) {
        void announcementsQuery.fetchNextPage();
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, [announcementsQuery]);

  const items = announcementsQuery.data?.pages.flatMap((page) => page.items) ?? [];

  return (
    <Stack spacing={3} sx={{ width: '100%' }}>
      <PageHeader
        title="Comunicados"
        description="Partilhe informação, recursos e oportunidades com a organização."
      />

      <Card>
        <CardHeader>
          <CardTitle>Publicar comunicado</CardTitle>
        </CardHeader>
        <CardContent>
          <Stack
            component="form"
            spacing={2}
            onSubmit={(event) => {
              event.preventDefault();
              if (title.trim()) void createMutation.mutateAsync();
            }}
          >
            <TextField
              label="Título"
              value={title}
              onChange={(event) => {
                setTitle(event.target.value);
              }}
              required
              fullWidth
            />
            <TextField
              label="Mensagem"
              multiline
              minRows={4}
              value={body}
              onChange={(event) => {
                setBody(event.target.value);
              }}
              placeholder="Escreva o comunicado..."
            />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Button
                type="button"
                variant={formEnabled ? 'secondary' : 'outline'}
                onClick={() => {
                  setFormEnabled((value) => !value);
                }}
              >
                <PollIcon fontSize="small" sx={{ mr: 1 }} />
                Formulário
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setAssetType(
                    assetType === 'image' ? 'video' : assetType === 'video' ? 'document' : 'image',
                  );
                }}
              >
                <ImageIcon fontSize="small" sx={{ mr: 1 }} />
                {assetType === 'image' ? 'Imagem' : assetType === 'video' ? 'Vídeo' : 'Documento'}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('announcement-asset')?.click()}
              >
                <AddLinkIcon fontSize="small" sx={{ mr: 1 }} />
                Anexo
              </Button>
              <input
                id="announcement-asset"
                type="file"
                accept={
                  assetType === 'image'
                    ? 'image/*'
                    : assetType === 'video'
                      ? 'video/*'
                      : '.pdf,.doc,.docx,.xls,.xlsx'
                }
                hidden
                onChange={(event) => {
                  setAssetFile(event.target.files?.[0] ?? null);
                }}
              />
            </Stack>
            <TextField
              label="Link opcional"
              value={linkUrl}
              onChange={(event) => {
                setLinkUrl(event.target.value);
              }}
              fullWidth
              placeholder="https://..."
            />
            {assetFile && (
              <Typography color="text.secondary" variant="body2">
                Ficheiro: {assetFile.name}
              </Typography>
            )}
            {formEnabled && (
              <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, p: 2 }}>
                <Stack spacing={2}>
                  <Typography variant="subtitle2">Formulário de inscrição</Typography>
                  <TextField
                    label="Título do formulário"
                    value={formTitle}
                    onChange={(event) => {
                      setFormTitle(event.target.value);
                    }}
                    fullWidth
                  />
                  <Typography color="text.secondary" variant="body2">
                    A primeira versão inclui um campo obrigatório de email e será expandida com mais
                    tipos de campo.
                  </Typography>
                </Stack>
              </Box>
            )}
            {createMutation.isError && (
              <Typography color="error">Não foi possível publicar o comunicado.</Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button type="submit" disabled={!title.trim() || createMutation.isPending}>
                {createMutation.isPending ? (
                  <LoadingSpinner size={18} />
                ) : (
                  <>
                    <CampaignIcon fontSize="small" sx={{ mr: 1 }} /> Publicar
                  </>
                )}
              </Button>
            </Box>
          </Stack>
        </CardContent>
      </Card>

      <Stack spacing={2}>
        {announcementsQuery.isLoading && <LoadingSpinner size={32} />}
        {announcementsQuery.isError && (
          <Typography color="error">Não foi possível carregar os comunicados.</Typography>
        )}
        {items.map((item) => (
          <Card key={item.id}>
            <CardHeader>
              <CardTitle>{item.title}</CardTitle>
              <Typography color="text.secondary" variant="body2">
                {item.author.firstName} {item.author.lastName} ·{' '}
                {item.publishedAt ? new Date(item.publishedAt).toLocaleDateString('pt-PT') : ''}
              </Typography>
            </CardHeader>
            <CardContent>
              <Typography sx={{ whiteSpace: 'pre-wrap' }}>{item.body}</Typography>
              {item.forms.length > 0 && (
                <Typography color="primary" sx={{ mt: 2 }} variant="body2">
                  Formulário: {item.forms[0]?.title}
                </Typography>
              )}
            </CardContent>
          </Card>
        ))}
        <Box ref={loadMoreRef} sx={{ display: 'flex', justifyContent: 'center', minHeight: 24 }}>
          {announcementsQuery.isFetchingNextPage && <LoadingSpinner />}
        </Box>
      </Stack>
    </Stack>
  );
}
