import * as React from 'react';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogActions from '@mui/material/DialogActions';
import DialogContent from '@mui/material/DialogContent';
import DialogTitle from '@mui/material/DialogTitle';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Typography from '@mui/material/Typography';
import { Download, Pencil, Plus, Upload } from 'lucide-react';
import { downloadDocument, fetchCourseDocuments, uploadCourseAsset } from '@/api/documents.api';
import {
  createCourse,
  enrollInCourse,
  fetchCourses,
  fetchMyEnrollments,
  fetchTrainingRecords,
  updateCourse,
} from '@/api/training.api';
import { useAuthStore } from '@/stores/auth.store';
import { DateTextField } from '@/components/DateTextField';
import {
  CourseStatus,
  EnrollmentStatus,
  type Course,
  type CourseEnrollment,
  type CourseStatus as CourseStatusType,
  type CreateCourseRequest,
  type TrainingRecord,
} from '@/types/training';
import type { ProfileDocument } from '@/types/documents';

const courseStatusLabels: Record<CourseStatus, string> = {
  [CourseStatus.PLANNED]: 'Planeado',
  [CourseStatus.ONGOING]: 'Em curso',
  [CourseStatus.COMPLETED]: 'Concluído',
};

const enrollmentStatusLabels: Record<EnrollmentStatus, string> = {
  [EnrollmentStatus.ENROLLED]: 'Inscrito',
  [EnrollmentStatus.STARTED]: 'Iniciado',
  [EnrollmentStatus.IN_PROGRESS]: 'Em curso',
  [EnrollmentStatus.COMPLETED]: 'Concluído',
  [EnrollmentStatus.NO_SHOW]: 'Não compareceu',
};

function formatDate(value: string | null): string {
  if (!value) return '—';
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00`),
  );
}

function CourseEditorDialog({
  course,
  open,
  pending,
  error,
  onCancel,
  onSave,
}: {
  course: Course | null;
  open: boolean;
  pending: boolean;
  error: boolean;
  onCancel: () => void;
  onSave: (data: CreateCourseRequest, files: File[]) => void;
}): React.JSX.Element {
  const [name, setName] = React.useState(course?.name ?? '');
  const [description, setDescription] = React.useState(course?.description ?? '');
  const [provider, setProvider] = React.useState(course?.provider ?? '');
  const [category, setCategory] = React.useState(course?.category ?? '');
  const [durationHours, setDurationHours] = React.useState(course?.durationHours?.toString() ?? '');
  const [startDate, setStartDate] = React.useState(course?.startDate ?? '');
  const [endDate, setEndDate] = React.useState(course?.endDate ?? '');
  const [status, setStatus] = React.useState<CourseStatusType>(
    course?.status ?? CourseStatus.PLANNED,
  );
  const [isMandatory, setIsMandatory] = React.useState(course?.isMandatory ?? false);
  const [files, setFiles] = React.useState<File[]>([]);

  const submit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    onSave(
      {
        name: name.trim(),
        description: description || undefined,
        provider: provider || undefined,
        category: category || undefined,
        durationHours: durationHours === '' ? undefined : Number(durationHours),
        startDate: startDate || undefined,
        endDate: endDate || undefined,
        status,
        isMandatory,
      },
      files,
    );
  };

  return (
    <Dialog open={open} onClose={pending ? undefined : onCancel} fullWidth maxWidth="sm">
      <DialogTitle>{course ? 'Editar formação' : 'Nova formação'}</DialogTitle>
      <Box component="form" onSubmit={submit}>
        <DialogContent>
          <Stack spacing={2}>
            <TextField
              required
              label="Curso"
              value={name}
              onChange={(event) => {
                setName(event.target.value);
              }}
            />
            <TextField
              multiline
              minRows={2}
              label="Descrição"
              value={description}
              onChange={(event) => {
                setDescription(event.target.value);
              }}
            />
            <Box
              sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', sm: '1fr 1fr' }, gap: 2 }}
            >
              <TextField
                label="Entidade formadora"
                value={provider}
                onChange={(event) => {
                  setProvider(event.target.value);
                }}
              />
              <TextField
                label="Categoria"
                value={category}
                onChange={(event) => {
                  setCategory(event.target.value);
                }}
              />
              <TextField
                type="number"
                label="Duração (horas)"
                slotProps={{ htmlInput: { min: 0, step: 0.5 } }}
                value={durationHours}
                onChange={(event) => {
                  setDurationHours(event.target.value);
                }}
              />
              <TextField
                select
                label="Estado"
                value={status}
                onChange={(event) => {
                  setStatus(event.target.value as CourseStatusType);
                }}
              >
                {Object.values(CourseStatus).map((item) => (
                  <MenuItem key={item} value={item}>
                    {courseStatusLabels[item]}
                  </MenuItem>
                ))}
              </TextField>
              <DateTextField
                label="Próxima sessão / início"
                value={startDate}
                onChange={setStartDate}
              />
              <DateTextField label="Data de fim" value={endDate} onChange={setEndDate} />
            </Box>
            <FormControlLabel
              control={
                <Switch
                  checked={isMandatory}
                  onChange={(_event, checked) => {
                    setIsMandatory(checked);
                  }}
                />
              }
              label="Formação obrigatória"
            />
            <Button component="label" variant="outlined" startIcon={<Upload size={16} />}>
              Imagem ou documentos do curso
              <input
                hidden
                multiple
                type="file"
                accept=".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg,.jpeg,.zip"
                onChange={(event) => {
                  setFiles(Array.from(event.target.files ?? []));
                }}
              />
            </Button>
            {files.length > 0 && (
              <Typography color="text.secondary" variant="caption">
                {String(files.length)} ficheiro(s) selecionado(s)
              </Typography>
            )}
            {error && (
              <Alert severity="error">Não foi possível guardar o curso ou os materiais.</Alert>
            )}
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={onCancel} disabled={pending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={pending || !name.trim()}>
            {pending ? <CircularProgress size={18} color="inherit" /> : 'Guardar'}
          </Button>
        </DialogActions>
      </Box>
    </Dialog>
  );
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = window.document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 0);
}

export function ProfileTrainingTab({ employeeId }: { employeeId: string }): React.JSX.Element {
  const permissions = useAuthStore((state) => state.permissions);
  const canManageCourses =
    permissions.includes('admin:*') ||
    permissions.some((permission) => permission.startsWith('admin')) ||
    permissions.includes('manager');
  const queryClient = useQueryClient();
  const [editor, setEditor] = React.useState<Course | null | undefined>(undefined);
  const coursesQuery = useQuery({ queryKey: ['training-courses'], queryFn: fetchCourses });
  const enrollmentsQuery = useQuery({
    queryKey: ['profile-training-enrollments', employeeId],
    queryFn: fetchMyEnrollments,
  });
  const recordsQuery = useQuery({
    queryKey: ['profile-training-records', employeeId],
    queryFn: () => fetchTrainingRecords(employeeId),
  });
  const documentsQuery = useQuery({
    queryKey: ['course-documents'],
    queryFn: fetchCourseDocuments,
  });
  const enrollMutation = useMutation({
    mutationFn: (courseId: string) => enrollInCourse(courseId, employeeId),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: ['profile-training-enrollments', employeeId],
      });
    },
  });
  const saveCourseMutation = useMutation({
    mutationFn: async ({
      data,
      files,
      course,
    }: {
      data: CreateCourseRequest;
      files: File[];
      course: Course | null;
    }) => {
      const savedCourse = course ? await updateCourse(course.id, data) : await createCourse(data);
      await Promise.all(files.map((file) => uploadCourseAsset(file, savedCourse.id)));
      return savedCourse;
    },
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['training-courses'] });
      await queryClient.invalidateQueries({ queryKey: ['course-documents'] });
      setEditor(undefined);
    },
  });
  const downloadMutation = useMutation({
    mutationFn: (document: ProfileDocument) => downloadDocument(document.id),
    onSuccess: (blob, profileDocument) => {
      downloadBlob(blob, profileDocument.name);
    },
  });

  const courses = coursesQuery.data ?? [];
  const enrollments = enrollmentsQuery.data ?? [];
  const records = recordsQuery.data ?? [];
  const enrollmentByCourse = new Map<string, CourseEnrollment>(
    enrollments.map((enrollment) => [enrollment.courseId, enrollment]),
  );
  const courseDocuments = documentsQuery.data ?? [];

  return (
    <Stack spacing={2.5}>
      <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 } }}>
        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          spacing={1}
          sx={{ mb: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
        >
          <Box>
            <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
              Cursos
            </Typography>
            <Typography color="text.secondary" variant="body2">
              Inscrições, obrigatoriedade e próximas sessões
            </Typography>
          </Box>
          {canManageCourses && (
            <Button
              startIcon={<Plus size={16} />}
              variant="contained"
              onClick={() => {
                setEditor(null);
              }}
            >
              Novo curso
            </Button>
          )}
        </Stack>
        {enrollMutation.isError && (
          <Alert severity="error" sx={{ mb: 1 }}>
            Não foi possível inscrever-se neste curso.
          </Alert>
        )}
        {saveCourseMutation.isError && (
          <Alert severity="error" sx={{ mb: 1 }}>
            Não foi possível guardar o curso.
          </Alert>
        )}
        <TableContainer>
          <Table size="small" aria-label="Formações">
            <TableHead>
              <TableRow>
                <TableCell>Curso</TableCell>
                <TableCell>Obrigatoriedade</TableCell>
                <TableCell>Próxima sessão</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Materiais</TableCell>
                <TableCell align="right">Ações</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {coursesQuery.isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    <CircularProgress size={20} />
                  </TableCell>
                </TableRow>
              ) : courses.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} align="center">
                    Nenhum curso disponível.
                  </TableCell>
                </TableRow>
              ) : (
                courses.map((course) => {
                  const enrollment = enrollmentByCourse.get(course.id);
                  const assets = courseDocuments.filter((item) => item.courseId === course.id);
                  const session =
                    course.startDate && course.startDate >= dayjs().format('YYYY-MM-DD')
                      ? formatDate(course.startDate)
                      : course.status === CourseStatus.ONGOING
                        ? 'Em curso'
                        : '—';
                  const statusLabel = enrollment
                    ? enrollmentStatusLabels[enrollment.status]
                    : courseStatusLabels[course.status];
                  return (
                    <TableRow key={course.id} hover>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontWeight: 600 }}>
                          {course.name}
                        </Typography>
                        <Typography color="text.secondary" variant="caption">
                          {course.provider ?? course.category ?? ' '}
                        </Typography>
                      </TableCell>
                      <TableCell>{course.isMandatory ? 'Obrigatória' : 'Opcional'}</TableCell>
                      <TableCell>{session}</TableCell>
                      <TableCell>
                        <Chip size="small" label={statusLabel} variant="outlined" />
                      </TableCell>
                      <TableCell>
                        {assets.length === 0 ? (
                          '—'
                        ) : (
                          <Stack spacing={0.5}>
                            {assets.map((asset) => (
                              <Tooltip key={asset.id} title={`Descarregar ${asset.name}`}>
                                <Button
                                  size="small"
                                  onClick={() => {
                                    downloadMutation.mutate(asset);
                                  }}
                                  startIcon={<Download size={14} />}
                                >
                                  {asset.name}
                                </Button>
                              </Tooltip>
                            ))}
                          </Stack>
                        )}
                      </TableCell>
                      <TableCell align="right">
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end' }}>
                          {!enrollment && course.status !== CourseStatus.COMPLETED && (
                            <Button
                              size="small"
                              onClick={() => {
                                enrollMutation.mutate(course.id);
                              }}
                              disabled={enrollMutation.isPending}
                            >
                              Inscrever-me
                            </Button>
                          )}
                          {canManageCourses && (
                            <Button
                              size="small"
                              aria-label={`Editar ${course.name}`}
                              onClick={() => {
                                setEditor(course);
                              }}
                            >
                              <Pencil size={15} />
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 } }}>
        <Typography component="h2" variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
          Histórico de formações
        </Typography>
        {recordsQuery.isLoading ? (
          <CircularProgress size={20} />
        ) : records.length === 0 ? (
          <Typography color="text.secondary" variant="body2">
            Ainda não há formações concluídas.
          </Typography>
        ) : (
          <Stack spacing={1}>
            {records.map((record: TrainingRecord) => (
              <Stack
                key={record.id}
                direction={{ xs: 'column', sm: 'row' }}
                spacing={0.5}
                sx={{
                  justifyContent: 'space-between',
                  borderBottom: '1px solid',
                  borderColor: 'divider',
                  pb: 1,
                }}
              >
                <Box>
                  <Typography variant="body2" sx={{ fontWeight: 600 }}>
                    {record.course?.name ?? 'Curso'}
                  </Typography>
                  <Typography color="text.secondary" variant="caption">
                    Concluído em {formatDate(record.completedAt)}
                  </Typography>
                </Box>
                <Typography color="text.secondary" variant="body2">
                  {record.score === null ? 'Concluído' : `Pontuação ${String(record.score)}`}
                </Typography>
              </Stack>
            ))}
          </Stack>
        )}
      </Paper>

      {editor !== undefined && (
        <CourseEditorDialog
          key={editor?.id ?? 'new-course'}
          course={editor}
          open
          pending={saveCourseMutation.isPending}
          error={saveCourseMutation.isError}
          onCancel={() => {
            setEditor(undefined);
          }}
          onSave={(data, files) => {
            saveCourseMutation.mutate({ data, files, course: editor });
          }}
        />
      )}
    </Stack>
  );
}
