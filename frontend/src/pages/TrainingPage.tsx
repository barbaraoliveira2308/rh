import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  FormProvider,
  useForm,
  type UseFormRegister,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';
import { fetchTeams } from '@/api/capacity.api';
import { fetchEmployees } from '@/api/users.api';
import {
  fetchCourses,
  createCourse,
  enrollInCourse,
  fetchTrainingRecords,
  fetchReviews,
  createReview,
  updateReview,
  submitReview,
  fetchNineBox,
  fetchCompetencies,
  createCompetency,
  fetchCompetencyMatrix,
  assessCompetency,
} from '@/api/training.api';
import {
  CourseStatus,
  ReviewStatus,
  type Course,
  type PerformanceReview,
  type Competency,
  type CreateCourseRequest,
  type CreateReviewRequest,
} from '@/types/training';

const ALL = 'all';

const courseStatusLabels: Record<CourseStatus, string> = {
  [CourseStatus.PLANNED]: 'Planeado',
  [CourseStatus.ONGOING]: 'Em curso',
  [CourseStatus.COMPLETED]: 'Concluído',
};

const courseStatusVariants: Record<CourseStatus, BadgeVariant> = {
  [CourseStatus.PLANNED]: 'info',
  [CourseStatus.ONGOING]: 'warning',
  [CourseStatus.COMPLETED]: 'success',
};

const reviewStatusLabels: Record<ReviewStatus, string> = {
  [ReviewStatus.DRAFT]: 'Rascunho',
  [ReviewStatus.SUBMITTED]: 'Submetida',
  [ReviewStatus.ACKNOWLEDGED]: 'Reconhecida',
};

const reviewStatusVariants: Record<ReviewStatus, BadgeVariant> = {
  [ReviewStatus.DRAFT]: 'warning',
  [ReviewStatus.SUBMITTED]: 'success',
  [ReviewStatus.ACKNOWLEDGED]: 'default',
};

const levelLabels: Record<'low' | 'medium' | 'high', string> = {
  low: 'Baixo',
  medium: 'Médio',
  high: 'Alto',
};

const selectClassName =
  'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2';

const optionalText = z
  .string()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

function toOptionalNumber(value?: string): number | undefined {
  return value ? Number(value) : undefined;
}

// ---------- Cursos ----------

const courseSchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  description: optionalText,
  provider: optionalText,
  durationHours: optionalText,
  category: optionalText,
  startDate: optionalText,
  endDate: optionalText,
  status: z.nativeEnum(CourseStatus),
  isMandatory: z.boolean(),
});

type CourseForm = z.infer<typeof courseSchema>;

function NewCourseDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();

  const methods = useForm<CourseForm>({
    resolver: zodResolver(courseSchema),
    defaultValues: {
      name: '',
      description: '',
      provider: '',
      durationHours: '',
      category: '',
      startDate: '',
      endDate: '',
      status: CourseStatus.PLANNED,
      isMandatory: false,
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: CourseForm) => {
      const payload: CreateCourseRequest = {
        name: values.name,
        description: values.description,
        provider: values.provider,
        durationHours: toOptionalNumber(values.durationHours),
        category: values.category,
        startDate: values.startDate,
        endDate: values.endDate,
        status: values.status,
        isMandatory: values.isMandatory,
      };
      return createCourse(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['training-courses'] });
      onOpenChange(false);
      methods.reset();
    },
  });

  const onSubmit = (values: CourseForm): void => {
    createMutation.mutate(values);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) methods.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Novo Curso</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <FormField name="name" label="Nome" />
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <textarea
                id="description"
                rows={3}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...methods.register('description')}
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="provider" label="Entidade formadora (opcional)" />
              <FormField
                name="category"
                label="Categoria (opcional)"
                placeholder="Técnica, Soft Skills..."
              />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="durationHours" label="Duração (horas, opcional)" type="number" />
              <div className="space-y-2">
                <Label htmlFor="status">Estado</Label>
                <select id="status" {...methods.register('status')} className={selectClassName}>
                  {Object.values(CourseStatus).map((value) => (
                    <option key={value} value={value}>
                      {courseStatusLabels[value]}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="startDate" label="Data de início (opcional)" type="date" />
              <FormField name="endDate" label="Data de fim (opcional)" type="date" />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isMandatory"
                type="checkbox"
                {...methods.register('isMandatory')}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="isMandatory" className="font-normal">
                Curso obrigatório
              </Label>
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao criar o curso.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Criar Curso'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function CoursesTab({ isAdmin }: { isAdmin: boolean }): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const { data: courses, isLoading } = useQuery({
    queryKey: ['training-courses'],
    queryFn: fetchCourses,
  });

  const enrollMutation = useMutation({
    mutationFn: (courseId: string) => enrollInCourse(courseId, user?.id ?? ''),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['training-records'] });
    },
  });

  const columns: Column<Course>[] = [
    { key: 'name', header: 'Nome', cell: (row) => row.name },
    { key: 'category', header: 'Categoria', cell: (row) => row.category ?? '-' },
    { key: 'provider', header: 'Entidade', cell: (row) => row.provider ?? '-' },
    {
      key: 'durationHours',
      header: 'Duração',
      cell: (row) => (row.durationHours !== null ? `${String(row.durationHours)}h` : '-'),
    },
    {
      key: 'isMandatory',
      header: 'Obrigatório',
      cell: (row) => (row.isMandatory ? 'Sim' : 'Não'),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={courseStatusLabels[row.status]}
          variant={courseStatusVariants[row.status]}
        />
      ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button
          variant="outline"
          size="sm"
          disabled={row.status === CourseStatus.COMPLETED || enrollMutation.isPending}
          onClick={() => {
            enrollMutation.mutate(row.id);
          }}
        >
          {enrollMutation.isPending && enrollMutation.variables === row.id ? (
            <LoadingSpinner size={14} />
          ) : (
            'Inscrever-me'
          )}
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      {isAdmin && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Curso
          </Button>
        </div>
      )}

      {enrollMutation.isError && (
        <p className="text-sm text-red-600">
          Não foi possível inscrever — pode já estar inscrito, o curso pode exigir um pré-requisito,
          ou estar concluído.
        </p>
      )}
      {enrollMutation.isSuccess && (
        <p className="text-sm text-green-700">Inscrição efetuada com sucesso.</p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      ) : (courses ?? []).length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Nenhum curso encontrado.</p>
      ) : (
        <DataTable
          data={courses ?? []}
          columns={columns}
          keyExtractor={(row) => row.id}
          pageSize={15}
        />
      )}

      <NewCourseDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

// ---------- Meu Histórico ----------

function MyRecordsTab(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);

  const { data: records, isLoading } = useQuery({
    queryKey: ['training-records', user?.id],
    queryFn: () => fetchTrainingRecords(user?.id ?? ''),
    enabled: !!user,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Formações Concluídas</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner size={32} />
          </div>
        ) : (records ?? []).length === 0 ? (
          <p className="py-8 text-center text-muted-foreground">
            Ainda não concluiu nenhuma formação.
          </p>
        ) : (
          <ul className="space-y-2">
            {(records ?? []).map((record) => (
              <li
                key={record.id}
                className="flex items-center justify-between rounded-md border p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{record.course?.name ?? 'Curso'}</div>
                  <div className="text-muted-foreground">
                    Concluído em {new Date(record.completedAt).toLocaleDateString('pt-PT')}
                    {record.score !== null && ` · Pontuação: ${String(record.score)}`}
                  </div>
                </div>
                {record.certificateUrl && (
                  <a
                    href={record.certificateUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="text-sm text-brand-800 hover:underline"
                  >
                    Certificado
                  </a>
                )}
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

// ---------- Avaliações ----------

const reviewSchema = z.object({
  employeeId: z.string().min(1, 'O colaborador é obrigatório'),
  period: z.string().min(1, 'O período é obrigatório'),
  overallRating: optionalText,
  potentialRating: optionalText,
  strengths: optionalText,
  improvementAreas: optionalText,
  objectivesNext: optionalText,
});

type ReviewForm = z.infer<typeof reviewSchema>;

function ratingSelect<TForm extends FieldValues>(
  name: Path<TForm>,
  label: string,
  register: UseFormRegister<TForm>,
): React.JSX.Element {
  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <select id={name} {...register(name)} className={selectClassName}>
        <option value="">Sem classificação</option>
        {[1, 2, 3, 4, 5].map((value) => (
          <option key={value} value={value}>
            {value}
          </option>
        ))}
      </select>
    </div>
  );
}

function NewReviewDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: employeesResponse } = useQuery({
    queryKey: ['training-employees'],
    queryFn: () => fetchEmployees({ limit: 100 }),
  });

  const methods = useForm<ReviewForm>({
    resolver: zodResolver(reviewSchema),
    defaultValues: {
      employeeId: '',
      period: '',
      overallRating: '',
      potentialRating: '',
      strengths: '',
      improvementAreas: '',
      objectivesNext: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: ReviewForm) => {
      const payload: CreateReviewRequest = {
        employeeId: values.employeeId,
        period: values.period,
        overallRating: toOptionalNumber(values.overallRating),
        potentialRating: toOptionalNumber(values.potentialRating),
        strengths: values.strengths,
        improvementAreas: values.improvementAreas,
        objectivesNext: values.objectivesNext,
      };
      return createReview(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['training-reviews'] });
      onOpenChange(false);
      methods.reset();
    },
  });

  const onSubmit = (values: ReviewForm): void => {
    createMutation.mutate(values);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) methods.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Avaliação de Desempenho</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="employeeId">Colaborador</Label>
              <select
                id="employeeId"
                {...methods.register('employeeId')}
                className={selectClassName}
              >
                <option value="">Selecionar colaborador</option>
                {(employeesResponse?.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
              {methods.formState.errors.employeeId && (
                <p className="text-xs text-red-600">
                  {methods.formState.errors.employeeId.message}
                </p>
              )}
            </div>
            <FormField name="period" label="Período" placeholder="ex: 2026-H1" />
            <div className="grid gap-4 sm:grid-cols-2">
              {ratingSelect('overallRating', 'Classificação geral (1-5)', methods.register)}
              {ratingSelect(
                'potentialRating',
                'Classificação de potencial (1-5)',
                methods.register,
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="strengths">Pontos fortes (opcional)</Label>
              <textarea
                id="strengths"
                rows={2}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...methods.register('strengths')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="improvementAreas">Áreas de melhoria (opcional)</Label>
              <textarea
                id="improvementAreas"
                rows={2}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...methods.register('improvementAreas')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="objectivesNext">Objetivos para o próximo período (opcional)</Label>
              <textarea
                id="objectivesNext"
                rows={2}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...methods.register('objectivesNext')}
              />
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao criar a avaliação.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Criar Avaliação'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

const editReviewSchema = z.object({
  overallRating: optionalText,
  potentialRating: optionalText,
  strengths: optionalText,
  improvementAreas: optionalText,
  objectivesNext: optionalText,
});

type EditReviewForm = z.infer<typeof editReviewSchema>;

function EditReviewDialog({
  open,
  onOpenChange,
  review,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  review: PerformanceReview | null;
}): React.JSX.Element | null {
  const queryClient = useQueryClient();

  const methods = useForm<EditReviewForm>({
    resolver: zodResolver(editReviewSchema),
    values: {
      overallRating:
        review?.overallRating !== null && review?.overallRating !== undefined
          ? String(review.overallRating)
          : '',
      potentialRating:
        review?.potentialRating !== null && review?.potentialRating !== undefined
          ? String(review.potentialRating)
          : '',
      strengths: review?.strengths ?? '',
      improvementAreas: review?.improvementAreas ?? '',
      objectivesNext: review?.objectivesNext ?? '',
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: EditReviewForm) =>
      updateReview(review?.id ?? '', {
        overallRating: toOptionalNumber(values.overallRating),
        potentialRating: toOptionalNumber(values.potentialRating),
        strengths: values.strengths,
        improvementAreas: values.improvementAreas,
        objectivesNext: values.objectivesNext,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['training-reviews'] });
      onOpenChange(false);
    },
  });

  if (!review) return null;

  const onSubmit = (values: EditReviewForm): void => {
    updateMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Editar Avaliação — {review.period}</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              {ratingSelect('overallRating', 'Classificação geral (1-5)', methods.register)}
              {ratingSelect(
                'potentialRating',
                'Classificação de potencial (1-5)',
                methods.register,
              )}
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-strengths">Pontos fortes</Label>
              <textarea
                id="edit-strengths"
                rows={2}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...methods.register('strengths')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-improvementAreas">Áreas de melhoria</Label>
              <textarea
                id="edit-improvementAreas"
                rows={2}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...methods.register('improvementAreas')}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-objectivesNext">Objetivos para o próximo período</Label>
              <textarea
                id="edit-objectivesNext"
                rows={2}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...methods.register('objectivesNext')}
              />
            </div>
            {updateMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao guardar a avaliação.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <LoadingSpinner size={16} /> : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function ReviewsTab(): React.JSX.Element {
  const user = useAuthStore((state) => state.user);
  const queryClient = useQueryClient();
  const [teamId, setTeamId] = React.useState(ALL);
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingReview, setEditingReview] = React.useState<PerformanceReview | null>(null);

  const { data: teams } = useQuery({ queryKey: ['training-teams'], queryFn: fetchTeams });

  const filters = { teamId: teamId === ALL ? undefined : teamId };

  const { data: reviews, isLoading } = useQuery({
    queryKey: ['training-reviews', filters],
    queryFn: () => fetchReviews(filters),
  });

  const submitMutation = useMutation({
    mutationFn: (id: string) => submitReview(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['training-reviews'] });
    },
  });

  const columns: Column<PerformanceReview>[] = [
    {
      key: 'employee',
      header: 'Colaborador',
      cell: (row) => (row.employee ? `${row.employee.firstName} ${row.employee.lastName}` : '-'),
    },
    { key: 'period', header: 'Período', cell: (row) => row.period },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => (
        <StatusBadge
          label={reviewStatusLabels[row.status]}
          variant={reviewStatusVariants[row.status]}
        />
      ),
    },
    {
      key: 'overallRating',
      header: 'Desempenho',
      cell: (row) => row.overallRating ?? '-',
    },
    {
      key: 'potentialRating',
      header: 'Potencial',
      cell: (row) => row.potentialRating ?? '-',
    },
    {
      key: 'actions',
      header: '',
      cell: (row) =>
        row.status === ReviewStatus.DRAFT && row.reviewerId === user?.id ? (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                setEditingReview(row);
              }}
            >
              Editar
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => {
                submitMutation.mutate(row.id);
              }}
              disabled={submitMutation.isPending}
            >
              Submeter
            </Button>
          </div>
        ) : null,
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="w-[240px]">
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Equipa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas as equipas</SelectItem>
              {(teams ?? []).map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Avaliação
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      ) : (reviews ?? []).length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Nenhuma avaliação encontrada.</p>
      ) : (
        <DataTable
          data={reviews ?? []}
          columns={columns}
          keyExtractor={(row) => row.id}
          pageSize={15}
        />
      )}

      <NewReviewDialog open={dialogOpen} onOpenChange={setDialogOpen} />
      <EditReviewDialog
        open={editingReview !== null}
        onOpenChange={(open) => {
          if (!open) setEditingReview(null);
        }}
        review={editingReview}
      />
    </div>
  );
}

// ---------- 9-Box ----------

const performanceOrder: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
const potentialOrder: ('low' | 'medium' | 'high')[] = ['high', 'medium', 'low'];

function NineBoxTab(): React.JSX.Element {
  const [teamId, setTeamId] = React.useState('');
  const [reviewCycle, setReviewCycle] = React.useState('');

  const { data: teams } = useQuery({ queryKey: ['training-teams'], queryFn: fetchTeams });

  const { data: items, isLoading } = useQuery({
    queryKey: ['training-nine-box', teamId, reviewCycle],
    queryFn: () => fetchNineBox(teamId, reviewCycle),
    enabled: !!teamId && !!reviewCycle,
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="w-[240px]">
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecionar equipa" />
            </SelectTrigger>
            <SelectContent>
              {(teams ?? []).map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="w-[200px]">
          <Input
            value={reviewCycle}
            onChange={(e) => {
              setReviewCycle(e.target.value);
            }}
            placeholder="Período (ex: 2026-H1)"
          />
        </div>
      </div>

      {!teamId || !reviewCycle ? (
        <p className="py-8 text-center text-muted-foreground">
          Selecione uma equipa e um período para ver a matriz 9-box.
        </p>
      ) : isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      ) : (items ?? []).length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">
          Nenhuma avaliação submetida encontrada para esta equipa/período.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <div className="grid min-w-[600px] grid-cols-[100px_repeat(3,1fr)] gap-2">
            <div />
            {performanceOrder.map((level) => (
              <div key={level} className="text-center text-xs font-medium text-muted-foreground">
                Desempenho {levelLabels[level]}
              </div>
            ))}
            {potentialOrder.map((potentialLevel) => (
              <React.Fragment key={potentialLevel}>
                <div className="flex items-center justify-end pr-2 text-xs font-medium text-muted-foreground">
                  Potencial {levelLabels[potentialLevel]}
                </div>
                {performanceOrder.map((performanceLevel) => {
                  const cellItems = (items ?? []).filter(
                    (item) =>
                      item.potentialLevel === potentialLevel &&
                      item.performanceLevel === performanceLevel,
                  );
                  return (
                    <div
                      key={performanceLevel}
                      className="min-h-[80px] space-y-1 rounded-md border bg-card p-2"
                    >
                      {cellItems.map((item) => (
                        <div
                          key={item.employeeId}
                          className="truncate rounded bg-brand-100 px-2 py-1 text-xs text-brand-900"
                        >
                          {item.employeeName}
                        </div>
                      ))}
                    </div>
                  );
                })}
              </React.Fragment>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// ---------- Competências ----------

const competencySchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  category: optionalText,
  description: optionalText,
});

type CompetencyForm = z.infer<typeof competencySchema>;

function NewCompetencyDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();

  const methods = useForm<CompetencyForm>({
    resolver: zodResolver(competencySchema),
    defaultValues: { name: '', category: '', description: '' },
  });

  const createMutation = useMutation({
    mutationFn: createCompetency,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['training-competencies'] });
      onOpenChange(false);
      methods.reset();
    },
  });

  const onSubmit = (values: CompetencyForm): void => {
    createMutation.mutate(values);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) methods.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Competência</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <FormField name="name" label="Nome" />
            <FormField name="category" label="Categoria (opcional)" />
            <div className="space-y-2">
              <Label htmlFor="description">Descrição (opcional)</Label>
              <textarea
                id="description"
                rows={3}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...methods.register('description')}
              />
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao criar a competência.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Criar Competência'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

const assessSchema = z.object({
  employeeId: z.string().min(1, 'O colaborador é obrigatório'),
  competencyId: z.string().min(1, 'A competência é obrigatória'),
  level: z.string().min(1, 'O nível é obrigatório'),
  assessedAt: z.string().min(1, 'A data é obrigatória'),
});

type AssessForm = z.infer<typeof assessSchema>;

function AssessCompetencyDialog({
  open,
  onOpenChange,
  competencies,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  competencies: Competency[];
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: employeesResponse } = useQuery({
    queryKey: ['training-employees'],
    queryFn: () => fetchEmployees({ limit: 100 }),
  });

  const methods = useForm<AssessForm>({
    resolver: zodResolver(assessSchema),
    defaultValues: {
      employeeId: '',
      competencyId: '',
      level: '3',
      assessedAt: new Date().toISOString().split('T')[0],
    },
  });

  const assessMutation = useMutation({
    mutationFn: (values: AssessForm) =>
      assessCompetency(values.employeeId, {
        competencyId: values.competencyId,
        level: Number(values.level),
        assessedAt: values.assessedAt,
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['training-competency-matrix'] });
      onOpenChange(false);
      methods.reset();
    },
  });

  const onSubmit = (values: AssessForm): void => {
    assessMutation.mutate(values);
  };

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (!next) methods.reset();
        onOpenChange(next);
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Avaliar Competência</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="assess-employeeId">Colaborador</Label>
              <select
                id="assess-employeeId"
                {...methods.register('employeeId')}
                className={selectClassName}
              >
                <option value="">Selecionar colaborador</option>
                {(employeesResponse?.data ?? []).map((employee) => (
                  <option key={employee.id} value={employee.id}>
                    {employee.firstName} {employee.lastName}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="assess-competencyId">Competência</Label>
              <select
                id="assess-competencyId"
                {...methods.register('competencyId')}
                className={selectClassName}
              >
                <option value="">Selecionar competência</option>
                {competencies.map((competency) => (
                  <option key={competency.id} value={competency.id}>
                    {competency.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="assess-level">Nível (1-5)</Label>
                <select
                  id="assess-level"
                  {...methods.register('level')}
                  className={selectClassName}
                >
                  {[1, 2, 3, 4, 5].map((value) => (
                    <option key={value} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
              </div>
              <FormField name="assessedAt" label="Data de avaliação" type="date" />
            </div>
            {assessMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao guardar a avaliação.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={assessMutation.isPending}>
                {assessMutation.isPending ? <LoadingSpinner size={16} /> : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function CompetenciesTab({
  isAdmin,
  isManagerOrAdmin,
}: {
  isAdmin: boolean;
  isManagerOrAdmin: boolean;
}): React.JSX.Element {
  const [competencyDialogOpen, setCompetencyDialogOpen] = React.useState(false);
  const [assessDialogOpen, setAssessDialogOpen] = React.useState(false);
  const [teamId, setTeamId] = React.useState('');

  const { data: competencies, isLoading } = useQuery({
    queryKey: ['training-competencies'],
    queryFn: fetchCompetencies,
  });

  const { data: teams } = useQuery({
    queryKey: ['training-teams'],
    queryFn: fetchTeams,
    enabled: isManagerOrAdmin,
  });

  const { data: matrix, isLoading: matrixLoading } = useQuery({
    queryKey: ['training-competency-matrix', teamId],
    queryFn: () => fetchCompetencyMatrix(teamId),
    enabled: isManagerOrAdmin && !!teamId,
  });

  const competencyColumns: Column<Competency>[] = [
    { key: 'name', header: 'Nome', cell: (row) => row.name },
    { key: 'category', header: 'Categoria', cell: (row) => row.category ?? '-' },
    { key: 'description', header: 'Descrição', cell: (row) => row.description ?? '-' },
  ];

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="text-base">Competências Definidas</CardTitle>
            {isAdmin && (
              <Button
                size="sm"
                onClick={() => {
                  setCompetencyDialogOpen(true);
                }}
              >
                <Plus className="mr-2 h-4 w-4" />
                Nova Competência
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex justify-center py-8">
              <LoadingSpinner size={32} />
            </div>
          ) : (
            <DataTable
              data={competencies ?? []}
              columns={competencyColumns}
              keyExtractor={(row) => row.id}
            />
          )}
        </CardContent>
      </Card>

      {isManagerOrAdmin && (
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-4">
              <CardTitle className="text-base">Matriz de Competências da Equipa</CardTitle>
              <div className="flex gap-2">
                <div className="w-[220px]">
                  <Select value={teamId} onValueChange={setTeamId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecionar equipa" />
                    </SelectTrigger>
                    <SelectContent>
                      {(teams ?? []).map((team) => (
                        <SelectItem key={team.id} value={team.id}>
                          {team.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button
                  size="sm"
                  onClick={() => {
                    setAssessDialogOpen(true);
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Avaliar
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {!teamId ? (
              <p className="py-8 text-center text-muted-foreground">
                Selecione uma equipa para ver a matriz.
              </p>
            ) : matrixLoading ? (
              <div className="flex justify-center py-8">
                <LoadingSpinner size={32} />
              </div>
            ) : (matrix ?? []).length === 0 ? (
              <p className="py-8 text-center text-muted-foreground">
                Nenhuma avaliação de competência encontrada para esta equipa.
              </p>
            ) : (
              <ul className="space-y-2">
                {(matrix ?? []).map((item) => (
                  <li
                    key={`${item.employeeId}-${item.competencyId}`}
                    className="flex items-center justify-between rounded-md border p-3 text-sm"
                  >
                    <span>
                      {item.employeeName} · {item.competencyName}
                    </span>
                    <StatusBadge label={`Nível ${String(item.level)}`} variant="default" />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}

      <NewCompetencyDialog open={competencyDialogOpen} onOpenChange={setCompetencyDialogOpen} />
      <AssessCompetencyDialog
        open={assessDialogOpen}
        onOpenChange={setAssessDialogOpen}
        competencies={competencies ?? []}
      />
    </div>
  );
}

// ---------- Page ----------

export function TrainingPage(): React.JSX.Element {
  const permissions = useAuthStore((state) => state.permissions);
  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));
  const isManagerOrAdmin = isAdmin || permissions.includes('manager');

  return (
    <div>
      <PageHeader
        title="Formação & Talento"
        description="Cursos, avaliações de desempenho, matriz 9-box e competências"
      />

      <Tabs defaultValue="courses">
        <TabsList>
          <TabsTrigger value="courses">Cursos</TabsTrigger>
          <TabsTrigger value="records">Meu Histórico</TabsTrigger>
          {isManagerOrAdmin && <TabsTrigger value="reviews">Avaliações</TabsTrigger>}
          {isManagerOrAdmin && <TabsTrigger value="nine-box">9-Box</TabsTrigger>}
          <TabsTrigger value="competencies">Competências</TabsTrigger>
        </TabsList>
        <TabsContent value="courses">
          <CoursesTab isAdmin={isAdmin} />
        </TabsContent>
        <TabsContent value="records">
          <MyRecordsTab />
        </TabsContent>
        {isManagerOrAdmin && (
          <TabsContent value="reviews">
            <ReviewsTab />
          </TabsContent>
        )}
        {isManagerOrAdmin && (
          <TabsContent value="nine-box">
            <NineBoxTab />
          </TabsContent>
        )}
        <TabsContent value="competencies">
          <CompetenciesTab isAdmin={isAdmin} isManagerOrAdmin={isManagerOrAdmin} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
