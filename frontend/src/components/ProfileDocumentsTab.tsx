import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import ButtonBase from '@mui/material/ButtonBase';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import IconButton from '@mui/material/IconButton';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import Tooltip from '@mui/material/Tooltip';
import { Download, Eye, Upload, X } from 'lucide-react';
import { downloadDocument, fetchMyDocuments, uploadMyDocument } from '@/api/documents.api';
import { getErrorMessage } from '@/lib/utils';
import type { DocumentCategory, ProfileDocument } from '@/types/documents';

const categoryLabels: Record<DocumentCategory, string> = {
  absence: 'Ausências',
  contract: 'Contrato',
  declarations: 'B351 Declarações',
  equipment: 'Equipamento',
  id: 'Identificação',
  insurance: 'Seguro',
  medical_leave: 'Baixa médica',
  onboarding: 'Integração',
  presence: 'Declarações de presença',
  training: 'Formação',
};

const categories = Object.keys(categoryLabels) as DocumentCategory[];
const acceptedFiles = '.pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip';

function formatFileSize(size: number): string {
  if (size < 1024) return `${String(size)} B`;
  if (size < 1024 * 1024)
    return `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(size / 1024)} KB`;
  return `${new Intl.NumberFormat('pt-PT', { maximumFractionDigits: 1 }).format(size / (1024 * 1024))} MB`;
}

export function ProfileDocumentsTab({ ownerId }: { ownerId: string }): React.JSX.Element {
  const queryClient = useQueryClient();
  const [category, setCategory] = React.useState<DocumentCategory>('id');
  const [selectedFolder, setSelectedFolder] = React.useState<DocumentCategory | null>(null);
  const [file, setFile] = React.useState<File | null>(null);
  const [preview, setPreview] = React.useState<{
    document: ProfileDocument;
    url: string;
    contentType: string;
  } | null>(null);
  const documentsQuery = useQuery({
    queryKey: ['my-documents', ownerId],
    queryFn: () => fetchMyDocuments(ownerId),
  });
  const uploadMutation = useMutation({
    mutationFn: () =>
      file ? uploadMyDocument(file, category) : Promise.reject(new Error('Selecione um ficheiro.')),
    onSuccess: async () => {
      setFile(null);
      await queryClient.invalidateQueries({ queryKey: ['my-documents', ownerId] });
    },
  });
  const downloadMutation = useMutation({
    mutationFn: (document: ProfileDocument) => downloadDocument(document.id),
    onSuccess: (blob, profileDocument) => {
      const url = URL.createObjectURL(blob);
      const link = window.document.createElement('a');
      link.href = url;
      link.download = profileDocument.name;
      link.click();
      window.setTimeout(() => {
        URL.revokeObjectURL(url);
      }, 0);
    },
  });
  const previewMutation = useMutation({
    mutationFn: (document: ProfileDocument) => downloadDocument(document.id),
    onSuccess: (blob, document): void => {
      setPreview({
        document,
        url: URL.createObjectURL(blob),
        contentType: blob.type,
      });
    },
  });
  React.useEffect((): (() => void) => {
    return () => {
      if (preview) URL.revokeObjectURL(preview.url);
    };
  }, [preview]);
  const closePreview = (): void => {
    setPreview(null);
  };
  const documents = documentsQuery.data ?? [];
  const visibleDocuments = selectedFolder
    ? documents.filter((document) => document.category === selectedFolder)
    : documents;

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={1.5}
          sx={{ alignItems: { md: 'center' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
              {selectedFolder ? categoryLabels[selectedFolder] : 'Pastas pessoais'}
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Os documentos carregados ficam visíveis apenas para si e para os perfis autorizados.
            </Typography>
          </Box>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            {selectedFolder && (
              <Button
                size="small"
                onClick={() => {
                  setSelectedFolder(null);
                }}
              >
                Voltar às pastas
              </Button>
            )}
            <TextField
              select
              size="small"
              label="Pasta"
              value={category}
              onChange={(event) => {
                setCategory(event.target.value as DocumentCategory);
              }}
            >
              {categories.map((item) => (
                <MenuItem key={item} value={item}>
                  {categoryLabels[item]}
                </MenuItem>
              ))}
            </TextField>
            <Button component="label" variant="contained" startIcon={<Upload size={16} />}>
              Carregar ficheiro
              <input
                hidden
                type="file"
                accept={acceptedFiles}
                onChange={(event) => {
                  setFile(event.target.files?.[0] ?? null);
                }}
              />
            </Button>
          </Stack>
        </Stack>
        {file && (
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mt: 1.5, alignItems: { sm: 'center' } }}
          >
            <Typography variant="body2">
              {file.name} · {formatFileSize(file.size)}
            </Typography>
            <Button
              size="small"
              onClick={() => {
                uploadMutation.mutate();
              }}
              disabled={uploadMutation.isPending}
            >
              {uploadMutation.isPending ? <CircularProgress size={16} /> : 'Guardar documento'}
            </Button>
          </Stack>
        )}
        {uploadMutation.isError && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {getErrorMessage(uploadMutation.error, 'Não foi possível carregar o documento.')}
          </Alert>
        )}
        {documentsQuery.isError && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            Não foi possível carregar os seus documentos.
          </Alert>
        )}
        {(downloadMutation.isError || previewMutation.isError) && (
          <Alert severity="error" sx={{ mt: 1.5 }}>
            {getErrorMessage(
              downloadMutation.error ?? previewMutation.error,
              'Não foi possível abrir o documento.',
            )}
          </Alert>
        )}
      </Paper>

      {!selectedFolder && (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: '1fr 1fr', sm: 'repeat(3, minmax(0, 1fr))' },
            gap: 1,
          }}
        >
          {categories.map((item) => {
            const count = documents.filter((document) => document.category === item).length;
            return (
              <ButtonBase
                key={item}
                onClick={() => {
                  setSelectedFolder(item);
                  setCategory(item);
                }}
                sx={{ display: 'block', borderRadius: 1.5, textAlign: 'left' }}
              >
                <Paper
                  variant="outlined"
                  sx={{
                    minHeight: 62,
                    borderRadius: 1.5,
                    p: 1.5,
                    transition: 'background-color 120ms ease, border-color 120ms ease',
                    '&:hover': { bgcolor: 'action.hover', borderColor: 'primary.main' },
                  }}
                >
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {categoryLabels[item]}
                  </Typography>
                  <Typography color="text.secondary" variant="caption">
                    {String(count)} {count === 1 ? 'ficheiro' : 'ficheiros'}
                  </Typography>
                </Paper>
              </ButtonBase>
            );
          })}
        </Box>
      )}

      <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
        <Table size="small" aria-label="Documentos pessoais">
          <TableHead>
            <TableRow>
              <TableCell>Nome do ficheiro</TableCell>
              <TableCell>Pasta</TableCell>
              <TableCell>Carregado em</TableCell>
              <TableCell>Visibilidade</TableCell>
              <TableCell align="right">Ações</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {documentsQuery.isLoading ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  <CircularProgress size={20} />
                </TableCell>
              </TableRow>
            ) : visibleDocuments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  {selectedFolder
                    ? 'Esta pasta não contém ficheiros.'
                    : 'Nenhum documento pessoal.'}
                </TableCell>
              </TableRow>
            ) : (
              visibleDocuments.map((document) => (
                <TableRow key={document.id} hover>
                  <TableCell>{document.name}</TableCell>
                  <TableCell>{categoryLabels[document.category]}</TableCell>
                  <TableCell>
                    {new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short' }).format(
                      new Date(document.createdAt),
                    )}
                  </TableCell>
                  <TableCell>{document.isPublic ? 'Público' : 'Visível'}</TableCell>
                  <TableCell align="right">
                    <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                      <Tooltip title="Visualizar">
                        <span>
                          <IconButton
                            aria-label={`Visualizar ${document.name}`}
                            size="small"
                            onClick={() => {
                              previewMutation.mutate(document);
                            }}
                            disabled={previewMutation.isPending}
                          >
                            {previewMutation.isPending &&
                            previewMutation.variables.id === document.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Eye size={16} />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                      <Tooltip title="Descarregar">
                        <span>
                          <IconButton
                            aria-label={`Descarregar ${document.name}`}
                            size="small"
                            onClick={() => {
                              downloadMutation.mutate(document);
                            }}
                            disabled={downloadMutation.isPending}
                          >
                            {downloadMutation.isPending &&
                            downloadMutation.variables.id === document.id ? (
                              <CircularProgress size={16} />
                            ) : (
                              <Download size={16} />
                            )}
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Stack>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </TableContainer>

      <Dialog open={Boolean(preview)} onClose={closePreview} fullWidth maxWidth="lg">
        <DialogTitle
          sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 2 }}
        >
          <Typography component="span" noWrap variant="subtitle1">
            {preview?.document.name}
          </Typography>
          <IconButton aria-label="Fechar pré-visualização" onClick={closePreview} size="small">
            <X size={18} />
          </IconButton>
        </DialogTitle>
        <DialogContent dividers sx={{ minHeight: 240, display: 'grid', placeItems: 'center' }}>
          {preview &&
          (preview.contentType.startsWith('image/') ||
            /\.(png|jpe?g)$/i.test(preview.document.name)) ? (
            <Box
              component="img"
              src={preview.url}
              alt={preview.document.name}
              sx={{ display: 'block', maxWidth: '100%', maxHeight: '75vh', objectFit: 'contain' }}
            />
          ) : preview &&
            (preview.contentType === 'application/pdf' ||
              preview.document.fileType.toLowerCase() === 'pdf') ? (
            <Box
              component="iframe"
              src={preview.url}
              title={preview.document.name}
              sx={{ width: '100%', height: '75vh', border: 0 }}
            />
          ) : preview ? (
            <Stack spacing={1.5} sx={{ alignItems: 'center' }}>
              <Typography color="text.secondary" variant="body2">
                A pré-visualização não está disponível para este formato.
              </Typography>
              <Button
                startIcon={<Download size={16} />}
                onClick={() => {
                  downloadMutation.mutate(preview.document);
                }}
                variant="outlined"
              >
                Descarregar ficheiro
              </Button>
            </Stack>
          ) : null}
        </DialogContent>
      </Dialog>
    </Stack>
  );
}
