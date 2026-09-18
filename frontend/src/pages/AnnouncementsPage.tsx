import * as React from 'react';
import { useInfiniteQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import CampaignIcon from '@mui/icons-material/Campaign';
import DescriptionIcon from '@mui/icons-material/Description';
import ImageIcon from '@mui/icons-material/Image';
import LinkIcon from '@mui/icons-material/Link';
import PollIcon from '@mui/icons-material/Poll';
import VideoFileIcon from '@mui/icons-material/VideoFile';
import Checkbox from '@mui/material/Checkbox';
import FormControlLabel from '@mui/material/FormControlLabel';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import { PageHeader } from '@/components/PageHeader';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import {
  addAnnouncementLink,
  createAnnouncement,
  fetchAnnouncements,
  respondToAnnouncementForm,
  uploadAnnouncementAsset,
} from '@/api/announcements.api';
import type {
  AnnouncementAssetType,
  AnnouncementForm,
  AnnouncementFormField,
} from '@/types/announcements';

const defaultField: AnnouncementFormField = {
  name: 'email',
  label: 'Email',
  type: 'email',
  required: true,
};

function AnnouncementFormCard({ form }: { form: AnnouncementForm }): React.JSX.Element {
  const [answers, setAnswers] = React.useState<Record<string, unknown>>({});
  const [submitted, setSubmitted] = React.useState(false);

  const respondMutation = useMutation({
    mutationFn: () => respondToAnnouncementForm(form.id, answers),
    onSuccess: () => {
      setSubmitted(true);
    },
  });

  const hasMissingRequired = form.fields.some((field) => field.required && !answers[field.name]);

  return (
    <Box sx={{ border: 1, borderColor: 'divider', borderRadius: 2, mt: 2, p: 2 }}>
      <Stack spacing={2}>
        <Typography variant="subtitle2">{form.title}</Typography>
        {submitted ? (
          <Typography color="success.main" variant="body2">
            Resposta enviada.
          </Typography>
        ) : (
          <>
            {form.fields.map((field) => {
              if (field.type === 'checkbox') {
                return (
                  <FormControlLabel
                    control={
                      <Checkbox
                        checked={Boolean(answers[field.name])}
                        onChange={(event) => {
                          setAnswers((prev) => ({ ...prev, [field.name]: event.target.checked }));
                        }}
                      />
                    }
                    key={field.name}
                    label={field.label}
                  />
                );
              }
              if (field.type === 'select') {
                return (
                  <TextField
                    fullWidth
                    key={field.name}
                    label={field.label}
                    onChange={(event) => {
                      setAnswers((prev) => ({ ...prev, [field.name]: event.target.value }));
                    }}
                    required={field.required}
                    select
                    size="small"
                    value={answers[field.name] ?? ''}
                  >
                    {(field.options ?? []).map((option) => (
                      <MenuItem key={option} value={option}>
                        {option}
                      </MenuItem>
                    ))}
                  </TextField>
                );
              }
              return (
                <TextField
                  fullWidth
                  key={field.name}
                  label={field.label}
                  minRows={field.type === 'textarea' ? 2 : undefined}
                  multiline={field.type === 'textarea'}
                  onChange={(event) => {
                    setAnswers((prev) => ({ ...prev, [field.name]: event.target.value }));
                  }}
                  required={field.required}
                  size="small"
                  type={field.type === 'email' || field.type === 'number' ? field.type : 'text'}
                  value={answers[field.name] ?? ''}
                />
              );
            })}
            {respondMutation.isError && (
              <Typography color="error" variant="body2">
                Não foi possível enviar a resposta.
              </Typography>
            )}
            <Box sx={{ display: 'flex', justifyContent: 'flex-end' }}>
              <Button
                disabled={hasMissingRequired || respondMutation.isPending}
                onClick={() => {
                  respondMutation.mutate();
                }}
                type="button"
              >
                {respondMutation.isPending ? <LoadingSpinner size={18} /> : 'Responder'}
              </Button>
            </Box>
          </>
        )}
      </Stack>
    </Box>
  );
}

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
  const [linkEnabled, setLinkEnabled] = React.useState(false);
  const assetInputRef = React.useRef<HTMLInputElement | null>(null);

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
      setLinkEnabled(false);
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
            <Stack direction="row" spacing={0.5} sx={{ alignItems: 'center' }}>
              <Tooltip title="Adicionar formulário">
                <IconButton
                  aria-label="Adicionar formulário"
                  aria-pressed={formEnabled}
                  color={formEnabled ? 'secondary' : 'default'}
                  onClick={() => {
                    setFormEnabled((value) => !value);
                  }}
                  size="small"
                  type="button"
                >
                  <PollIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Adicionar imagem">
                <IconButton
                  aria-label="Adicionar imagem"
                  color={assetFile && assetType === 'image' ? 'secondary' : 'default'}
                  onClick={() => {
                    setAssetType('image');
                    assetInputRef.current?.click();
                  }}
                  size="small"
                  type="button"
                >
                  <ImageIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Adicionar vídeo">
                <IconButton
                  aria-label="Adicionar vídeo"
                  color={assetFile && assetType === 'video' ? 'secondary' : 'default'}
                  onClick={() => {
                    setAssetType('video');
                    assetInputRef.current?.click();
                  }}
                  size="small"
                  type="button"
                >
                  <VideoFileIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Adicionar documento">
                <IconButton
                  aria-label="Adicionar documento"
                  color={assetFile && assetType === 'document' ? 'secondary' : 'default'}
                  onClick={() => {
                    setAssetType('document');
                    assetInputRef.current?.click();
                  }}
                  size="small"
                  type="button"
                >
                  <DescriptionIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <Tooltip title="Adicionar link">
                <IconButton
                  aria-label="Adicionar link"
                  aria-pressed={linkEnabled}
                  color={linkEnabled ? 'secondary' : 'default'}
                  onClick={() => {
                    setLinkEnabled((value) => !value);
                  }}
                  size="small"
                  type="button"
                >
                  <LinkIcon fontSize="small" />
                </IconButton>
              </Tooltip>
              <input
                ref={assetInputRef}
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
            {linkEnabled && (
              <TextField
                label="Link do comunicado"
                value={linkUrl}
                onChange={(event) => {
                  setLinkUrl(event.target.value);
                }}
                fullWidth
                placeholder="https://..."
              />
            )}
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
              {item.assets.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  {item.assets.map((asset) => {
                    if (asset.assetType === 'image') {
                      return (
                        <Box
                          component="img"
                          key={asset.id}
                          src={asset.url}
                          sx={{
                            maxWidth: '100%',
                            maxHeight: 320,
                            borderRadius: 1,
                            display: 'block',
                          }}
                        />
                      );
                    }
                    if (asset.assetType === 'video') {
                      return (
                        <Box
                          component="video"
                          controls
                          key={asset.id}
                          src={asset.url}
                          sx={{ width: '100%', maxHeight: 360, borderRadius: 1 }}
                        />
                      );
                    }
                    if (asset.assetType === 'document') {
                      return (
                        <a
                          className="text-brand-800 hover:underline"
                          href={asset.url}
                          key={asset.id}
                          rel="noreferrer"
                          target="_blank"
                        >
                          {asset.fileName ?? 'Documento'}
                        </a>
                      );
                    }
                    return (
                      <a
                        className="text-brand-800 hover:underline"
                        href={asset.url}
                        key={asset.id}
                        rel="noreferrer"
                        target="_blank"
                      >
                        {asset.url}
                      </a>
                    );
                  })}
                </Box>
              )}
              {item.forms[0] && <AnnouncementFormCard form={item.forms[0]} />}
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
