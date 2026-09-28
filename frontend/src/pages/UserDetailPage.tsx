import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { FormField } from '@/components/FormField';
import {
  EmployeeSelectField,
  type EmployeeSelectOption,
} from '@/features/employees/components/EmployeeSelectField';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  fetchEmployee,
  updateEmployee,
  fetchDepartments,
  fetchJobTitles,
  fetchEmployees,
} from '@/api/users.api';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/lib/utils';
import { EmployeeStatus, type UpdateEmployeeRequest } from '@/types/users';

function getStatusLabel(status: EmployeeStatus): string {
  switch (status) {
    case EmployeeStatus.ACTIVE:
      return 'Ativo';
    case EmployeeStatus.INACTIVE:
      return 'Inativo';
    case EmployeeStatus.ON_LEAVE:
      return 'Em licença';
    default:
      return status;
  }
}

function getStatusVariant(status: EmployeeStatus): BadgeVariant {
  switch (status) {
    case EmployeeStatus.ACTIVE:
      return 'success';
    case EmployeeStatus.INACTIVE:
      return 'neutral';
    case EmployeeStatus.ON_LEAVE:
      return 'warning';
    default:
      return 'default';
  }
}

function formatDate(date: string | null): string {
  return date ? dayjs(date).format('DD/MM/YYYY') : '-';
}

interface DetailItemProps {
  label: string;
  value: React.ReactNode;
}

function DetailItem({ label, value }: DetailItemProps): React.JSX.Element {
  return (
    <div>
      <p className="text-xs font-medium text-muted-foreground">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}

const editSchema = z.object({
  firstName: z.string().min(1, 'O nome próprio é obrigatório'),
  lastName: z.string().min(1, 'O apelido é obrigatório'),
  email: z.string().email('Email inválido'),
  personalEmail: z.string().optional(),
  phone: z.string().optional(),
  nif: z.string().optional(),
  birthDate: z.string().optional(),
  nationality: z.string().optional(),
  gender: z.string().optional(),
  address: z.string().optional(),
  employeeNumber: z.string().min(1, 'O número de colaborador é obrigatório'),
  departmentId: z.string().optional(),
  jobTitleId: z.string().optional(),
  managerId: z.string().optional(),
  employmentStartDate: z.string().min(1, 'A data de início é obrigatória'),
  employmentEndDate: z.string().optional(),
  workLocation: z.string().optional(),
  status: z.nativeEnum(EmployeeStatus),
  iban: z.string().optional(),
});

type EditForm = z.infer<typeof editSchema>;

const statusOptions = [
  { value: EmployeeStatus.ACTIVE, label: 'Ativo' },
  { value: EmployeeStatus.INACTIVE, label: 'Inativo' },
  { value: EmployeeStatus.ON_LEAVE, label: 'Em licença' },
];

interface EditEmployeeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  employeeId: string;
  defaultValues: EditForm;
}

function EditEmployeeDialog({
  open,
  onOpenChange,
  employeeId,
  defaultValues,
}: EditEmployeeDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();

  const methods = useForm<EditForm>({
    resolver: zodResolver(editSchema),
    values: defaultValues,
  });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const { data: jobTitles } = useQuery({
    queryKey: ['jobTitles'],
    queryFn: fetchJobTitles,
  });

  const { data: managers } = useQuery({
    queryKey: ['employees', { status: EmployeeStatus.ACTIVE, limit: 100 }],
    queryFn: () => fetchEmployees({ status: EmployeeStatus.ACTIVE, limit: 100 }),
  });

  const departmentOptions: EmployeeSelectOption[] = React.useMemo(
    () =>
      departments?.map((department) => ({ value: department.id, label: department.name })) ?? [],
    [departments],
  );

  const jobTitleOptions: EmployeeSelectOption[] = React.useMemo(
    () => jobTitles?.map((jobTitle) => ({ value: jobTitle.id, label: jobTitle.name })) ?? [],
    [jobTitles],
  );

  const managerOptions: EmployeeSelectOption[] = React.useMemo(
    () =>
      managers?.data
        .filter((manager) => manager.id !== employeeId)
        .map((manager) => ({
          value: manager.id,
          label: `${manager.firstName} ${manager.lastName}`,
        })) ?? [],
    [managers, employeeId],
  );

  const updateMutation = useMutation({
    mutationFn: (values: EditForm) => {
      const payload: UpdateEmployeeRequest = {};
      for (const [key, value] of Object.entries(values)) {
        if (value !== '') {
          (payload as Record<string, unknown>)[key] = value;
        }
      }
      return updateEmployee(employeeId, payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['employee', employeeId] });
      onOpenChange(false);
    },
  });

  const onSubmit = (values: EditForm): void => {
    updateMutation.mutate(values);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Colaborador</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="firstName" label="Nome próprio" />
              <FormField name="lastName" label="Apelido" />
              <FormField name="email" label="Email" type="email" />
              <FormField name="personalEmail" label="Email pessoal" type="email" />
              <FormField name="phone" label="Telefone" type="tel" />
              <FormField name="nif" label="NIF" />
              <FormField name="birthDate" label="Data de nascimento" type="date" />
              <FormField name="nationality" label="Nacionalidade" />
              <FormField name="gender" label="Género" />
              <FormField name="address" label="Morada" />
              <FormField name="employeeNumber" label="Número de colaborador" />
              <EmployeeSelectField<EditForm>
                name="departmentId"
                label="Departamento"
                placeholder="Selecionar departamento"
                options={departmentOptions}
              />
              <EmployeeSelectField<EditForm>
                name="jobTitleId"
                label="Cargo"
                placeholder="Selecionar cargo"
                options={jobTitleOptions}
              />
              <EmployeeSelectField<EditForm>
                name="managerId"
                label="Gestor"
                placeholder="Selecionar gestor"
                options={managerOptions}
              />
              <FormField name="employmentStartDate" label="Data de início" type="date" />
              <FormField name="employmentEndDate" label="Data de fim" type="date" />
              <FormField name="workLocation" label="Local de trabalho" />
              <EmployeeSelectField<EditForm>
                name="status"
                label="Estado"
                placeholder="Selecionar estado"
                options={statusOptions}
              />
              <FormField name="iban" label="IBAN" />
            </div>

            {updateMutation.isError && (
              <p className="text-sm text-red-600">
                {getErrorMessage(updateMutation.error, 'Ocorreu um erro ao guardar as alterações.')}
              </p>
            )}

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                }}
                disabled={updateMutation.isPending}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? <LoadingSpinner size={16} /> : 'Guardar Alterações'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

export function UserDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const permissions = useAuthStore((state) => state.permissions);
  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));
  const canEdit = isAdmin || permissions.includes('manager');
  const [editOpen, setEditOpen] = React.useState(false);

  if (!id) {
    return <p className="text-sm text-red-600">ID inválido.</p>;
  }

  const {
    data: employee,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['employee', id],
    queryFn: () => fetchEmployee(id),
  });

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <LoadingSpinner />
      </div>
    );
  }

  if (error || !employee) {
    return <p className="text-sm text-red-600">Erro ao carregar colaborador.</p>;
  }

  const fullName = `${employee.firstName} ${employee.lastName}`;
  const managerName = employee.manager
    ? `${employee.manager.firstName} ${employee.manager.lastName}`
    : '-';

  const editDefaultValues: EditForm = {
    firstName: employee.firstName,
    lastName: employee.lastName,
    email: employee.email,
    personalEmail: employee.personalEmail ?? '',
    phone: employee.phone ?? '',
    nif: employee.nif ?? '',
    birthDate: employee.birthDate ?? '',
    nationality: employee.nationality ?? '',
    gender: employee.gender ?? '',
    address: employee.address ?? '',
    employeeNumber: employee.employeeNumber,
    departmentId: employee.departmentId ?? '',
    jobTitleId: employee.jobTitleId ?? '',
    managerId: employee.managerId ?? '',
    employmentStartDate: employee.employmentStartDate,
    employmentEndDate: employee.employmentEndDate ?? '',
    workLocation: employee.workLocation ?? '',
    status: employee.status,
    iban: employee.iban ?? '',
  };

  return (
    <div>
      <PageHeader
        title={fullName}
        description={employee.email}
        breadcrumb={[{ label: 'Colaboradores', href: '/users' }, { label: fullName }]}
        action={
          canEdit
            ? {
                label: 'Editar',
                onClick: (): void => {
                  setEditOpen(true);
                },
              }
            : undefined
        }
      />

      <Tabs defaultValue="personal">
        <TabsList className="mb-4">
          <TabsTrigger value="personal">Dados Pessoais</TabsTrigger>
          <TabsTrigger value="contracts">Contratos</TabsTrigger>
          <TabsTrigger value="allocations">Alocações</TabsTrigger>
          <TabsTrigger value="absences">Ausências</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="personal">
          <Card>
            <CardContent className="space-y-6 pt-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center">
                {employee.photoUrl ? (
                  <img
                    src={employee.photoUrl}
                    alt={fullName}
                    className="h-24 w-24 rounded-full object-cover"
                  />
                ) : (
                  <div className="flex h-24 w-24 items-center justify-center rounded-full bg-muted text-sm text-muted-foreground">
                    Sem foto
                  </div>
                )}
                <div>
                  <h2 className="text-2xl font-bold">{fullName}</h2>
                  <p className="text-sm text-muted-foreground">
                    {employee.jobTitle?.name ?? '-'} @ {employee.department?.name ?? '-'}
                  </p>
                  <div className="mt-2">
                    <StatusBadge
                      label={getStatusLabel(employee.status)}
                      variant={getStatusVariant(employee.status)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <DetailItem label="Email" value={employee.email} />
                <DetailItem label="Email pessoal" value={employee.personalEmail ?? '-'} />
                <DetailItem label="Telefone" value={employee.phone ?? '-'} />
                <DetailItem label="NIF" value={employee.nif ?? '-'} />
                <DetailItem label="Data de nascimento" value={formatDate(employee.birthDate)} />
                <DetailItem label="Nacionalidade" value={employee.nationality ?? '-'} />
                <DetailItem label="Género" value={employee.gender ?? '-'} />
                <DetailItem label="Morada" value={employee.address ?? '-'} />
                <DetailItem label="Departamento" value={employee.department?.name ?? '-'} />
                <DetailItem label="Cargo" value={employee.jobTitle?.name ?? '-'} />
                <DetailItem label="Gestor" value={managerName} />
                <DetailItem
                  label="Data de início"
                  value={formatDate(employee.employmentStartDate)}
                />
                <DetailItem label="Data de fim" value={formatDate(employee.employmentEndDate)} />
                <DetailItem label="Local de trabalho" value={employee.workLocation ?? '-'} />
                <DetailItem label="IBAN" value={employee.iban ?? '-'} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contracts">
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Dados de contratos serão apresentados aqui.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="allocations">
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Alocações a projetos serão apresentadas aqui.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="absences">
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Registo de ausências será apresentado aqui.
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="documents">
          <Card>
            <CardContent className="py-6 text-sm text-muted-foreground">
              Documentos do colaborador serão apresentados aqui.
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {canEdit && (
        <EditEmployeeDialog
          open={editOpen}
          onOpenChange={setEditOpen}
          employeeId={id}
          defaultValues={editDefaultValues}
        />
      )}
    </div>
  );
}
