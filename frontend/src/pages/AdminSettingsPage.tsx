import React from 'react';
import { Navigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Controller,
  FormProvider,
  useForm,
  useFormContext,
  type FieldValues,
  type Path,
} from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Pencil, Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { FormField } from '@/components/FormField';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuthStore } from '@/stores/auth.store';
import {
  fetchSettings,
  updateSettings,
  fetchLegalEntities,
  createLegalEntity,
  updateLegalEntity,
} from '@/api/admin.api';
import type { CreateLegalEntityRequest, LegalEntity, SystemSetting } from '@/types/admin';

const settingsSchema = z.object({
  companyName: z.string().min(1, 'O nome da empresa é obrigatório'),
  defaultCountry: z.string().min(1, 'O país é obrigatório'),
  defaultCurrency: z.string().min(1, 'A moeda é obrigatória'),
  defaultVacationDaysPerYear: z.coerce.number().min(0),
  carryOverVacationDays: z.coerce.number().min(0),
  timesheetSubmissionDeadlineDay: z.coerce.number().min(1),
  defaultDailyHours: z.coerce.number().min(0),
  contractExpiryAlertDays: z.coerce.number().min(0),
  projectEndAlertDays: z.coerce.number().min(0),
  underallocationThresholdPercentage: z.coerce.number().min(0),
  sessionTimeoutMinutes: z.coerce.number().min(1),
  maxLoginAttempts: z.coerce.number().min(1),
  lockoutPeriodMinutes: z.coerce.number().min(1),
  mfaRequiredForAdmin: z.boolean(),
  gdprPostExitRetentionYears: z.coerce.number().min(0),
  documentsTrashRetentionDays: z.coerce.number().min(0),
});

type SettingsForm = z.infer<typeof settingsSchema>;

function settingsToFormValues(settings: SystemSetting): SettingsForm {
  return {
    companyName: settings.companyName,
    defaultCountry: settings.defaultCountry,
    defaultCurrency: settings.defaultCurrency,
    defaultVacationDaysPerYear: settings.defaultVacationDaysPerYear,
    carryOverVacationDays: settings.carryOverVacationDays,
    timesheetSubmissionDeadlineDay: settings.timesheetSubmissionDeadlineDay,
    defaultDailyHours: settings.defaultDailyHours,
    contractExpiryAlertDays: settings.contractExpiryAlertDays,
    projectEndAlertDays: settings.projectEndAlertDays,
    underallocationThresholdPercentage: settings.underallocationThresholdPercentage,
    sessionTimeoutMinutes: settings.sessionTimeoutMinutes,
    maxLoginAttempts: settings.maxLoginAttempts,
    lockoutPeriodMinutes: settings.lockoutPeriodMinutes,
    mfaRequiredForAdmin: settings.mfaRequiredForAdmin,
    gdprPostExitRetentionYears: settings.gdprPostExitRetentionYears,
    documentsTrashRetentionDays: settings.documentsTrashRetentionDays,
  };
}

function BooleanField<TForm extends FieldValues>({
  name,
  label,
}: {
  name: Path<TForm>;
  label: string;
}): React.JSX.Element {
  const { control } = useFormContext<TForm>();
  return (
    <div className="flex items-center gap-2 space-y-2">
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <input
            id={name}
            type="checkbox"
            className="h-4 w-4 rounded border-border"
            checked={Boolean(field.value)}
            onChange={(event) => {
              field.onChange(event.target.checked);
            }}
          />
        )}
      />
      <Label htmlFor={name}>{label}</Label>
    </div>
  );
}

function SettingsTab(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [saveMessage, setSaveMessage] = React.useState<'success' | 'error' | null>(null);

  const { data: settings, isLoading } = useQuery({
    queryKey: ['admin-settings'],
    queryFn: fetchSettings,
  });

  const methods = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: settings ? settingsToFormValues(settings) : undefined,
  });

  const mutation = useMutation({
    mutationFn: updateSettings,
    onSuccess: (updated) => {
      queryClient.setQueryData(['admin-settings'], updated);
      setSaveMessage('success');
    },
    onError: () => {
      setSaveMessage('error');
    },
  });

  const onSubmit = (values: SettingsForm): void => {
    setSaveMessage(null);
    mutation.mutate(values);
  };

  if (isLoading || !settings) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <FormProvider {...methods}>
      <form onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)} className="space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Organização</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField name="companyName" label="Nome da empresa" />
            <FormField name="defaultCountry" label="País por defeito" />
            <FormField name="defaultCurrency" label="Moeda por defeito" />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Ausências</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              name="defaultVacationDaysPerYear"
              label="Dias de férias por defeito/ano"
              type="number"
            />
            <FormField
              name="carryOverVacationDays"
              label="Dias transitáveis para próximo ano"
              type="number"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Timesheets</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              name="timesheetSubmissionDeadlineDay"
              label="Prazo submissão (dia do mês seguinte)"
              type="number"
            />
            <FormField
              name="defaultDailyHours"
              label="Horas diárias por defeito"
              type="number"
              step="0.5"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Alertas</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              name="contractExpiryAlertDays"
              label="Dias antes para alertar fim de contrato"
              type="number"
            />
            <FormField
              name="projectEndAlertDays"
              label="Dias antes para alertar fim de projeto"
              type="number"
            />
            <FormField
              name="underallocationThresholdPercentage"
              label="Threshold de sub-alocação (%)"
              type="number"
              step="0.1"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Segurança</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              name="sessionTimeoutMinutes"
              label="Timeout de sessão (minutos)"
              type="number"
            />
            <FormField
              name="maxLoginAttempts"
              label="Tentativas de login antes de bloqueio"
              type="number"
            />
            <FormField
              name="lockoutPeriodMinutes"
              label="Período de bloqueio (minutos)"
              type="number"
            />
            <BooleanField<SettingsForm>
              name="mfaRequiredForAdmin"
              label="MFA obrigatório para Admin"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">GDPR e Documentos</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <FormField
              name="gdprPostExitRetentionYears"
              label="Retenção pós-saída (anos)"
              type="number"
            />
            <FormField
              name="documentsTrashRetentionDays"
              label="Retenção na lixeira (dias)"
              type="number"
            />
          </CardContent>
        </Card>

        <div className="flex items-center gap-4">
          <Button type="submit" disabled={mutation.isPending}>
            {mutation.isPending ? <LoadingSpinner size={16} /> : 'Guardar Configurações'}
          </Button>
          {saveMessage === 'success' && (
            <p className="text-sm text-green-700">Configurações guardadas com sucesso.</p>
          )}
          {saveMessage === 'error' && (
            <p className="text-sm text-red-600">Ocorreu um erro ao guardar as configurações.</p>
          )}
        </div>
      </form>
    </FormProvider>
  );
}

const legalEntitySchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  nif: z.string().optional(),
  country: z.string().min(1, 'O país é obrigatório'),
  currency: z.string().min(1, 'A moeda é obrigatória'),
  calendarProfileCountryCode: z.string().min(1, 'O perfil de calendário é obrigatório'),
  vacationDaysPerYearOverride: z.string().optional(),
  isActive: z.boolean(),
});

type LegalEntityForm = z.infer<typeof legalEntitySchema>;

function legalEntityToFormValues(entity: LegalEntity): LegalEntityForm {
  return {
    name: entity.name,
    nif: entity.nif ?? '',
    country: entity.country,
    currency: entity.currency,
    calendarProfileCountryCode: entity.calendarProfileCountryCode,
    vacationDaysPerYearOverride:
      entity.vacationDaysPerYearOverride !== null ? String(entity.vacationDaysPerYearOverride) : '',
    isActive: entity.isActive,
  };
}

const emptyLegalEntityForm: LegalEntityForm = {
  name: '',
  nif: '',
  country: 'PT',
  currency: 'EUR',
  calendarProfileCountryCode: 'PT',
  vacationDaysPerYearOverride: '',
  isActive: true,
};

function legalEntityFormToPayload(values: LegalEntityForm): CreateLegalEntityRequest {
  return {
    ...values,
    vacationDaysPerYearOverride: values.vacationDaysPerYearOverride
      ? Number(values.vacationDaysPerYearOverride)
      : undefined,
  };
}

interface LegalEntityDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  entity: LegalEntity | null;
}

function LegalEntityDialog({
  open,
  onOpenChange,
  entity,
}: LegalEntityDialogProps): React.JSX.Element {
  const queryClient = useQueryClient();

  const methods = useForm<LegalEntityForm>({
    resolver: zodResolver(legalEntitySchema),
    values: entity ? legalEntityToFormValues(entity) : emptyLegalEntityForm,
  });

  const createMutation = useMutation({
    mutationFn: createLegalEntity,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['legal-entities'] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (payload: CreateLegalEntityRequest) => updateLegalEntity(entity?.id ?? '', payload),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['legal-entities'] });
      onOpenChange(false);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const submitError = createMutation.isError || updateMutation.isError;

  const onSubmit = (values: LegalEntityForm): void => {
    const payload = legalEntityFormToPayload(values);
    if (entity) {
      updateMutation.mutate(payload);
    } else {
      createMutation.mutate(payload);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{entity ? 'Editar Entidade Legal' : 'Nova Entidade Legal'}</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="name" label="Nome" className="sm:col-span-2" />
              <FormField name="nif" label="NIF" />
              <FormField name="country" label="País" placeholder="PT" />
              <FormField name="currency" label="Moeda" placeholder="EUR" />
              <FormField
                name="calendarProfileCountryCode"
                label="Perfil de calendário"
                placeholder="PT"
              />
              <FormField
                name="vacationDaysPerYearOverride"
                label="Dias de férias/ano (opcional)"
                type="number"
              />
            </div>
            <BooleanField<LegalEntityForm> name="isActive" label="Entidade ativa" />
            {submitError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao guardar a entidade legal.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <LoadingSpinner size={16} /> : 'Guardar'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function LegalEntitiesTab(): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingEntity, setEditingEntity] = React.useState<LegalEntity | null>(null);

  const { data: entities, isLoading } = useQuery({
    queryKey: ['legal-entities'],
    queryFn: fetchLegalEntities,
  });

  const openCreateDialog = (): void => {
    setEditingEntity(null);
    setDialogOpen(true);
  };

  const openEditDialog = (entity: LegalEntity): void => {
    setEditingEntity(entity);
    setDialogOpen(true);
  };

  const columns: Column<LegalEntity>[] = [
    { key: 'name', header: 'Nome', cell: (row) => row.name },
    { key: 'nif', header: 'NIF', cell: (row) => row.nif ?? '-' },
    { key: 'country', header: 'País', cell: (row) => row.country },
    { key: 'currency', header: 'Moeda', cell: (row) => row.currency },
    {
      key: 'vacationDaysPerYearOverride',
      header: 'Dias de Férias',
      cell: (row) => row.vacationDaysPerYearOverride ?? '-',
    },
    {
      key: 'isActive',
      header: 'Estado',
      cell: (row) =>
        row.isActive ? (
          <StatusBadge label="Ativa" variant="success" />
        ) : (
          <StatusBadge label="Inativa" variant="neutral" />
        ),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            openEditDialog(row);
          }}
        >
          <Pencil className="h-4 w-4" />
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Entidade
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <DataTable data={entities ?? []} columns={columns} keyExtractor={(row) => row.id} />
      )}

      <LegalEntityDialog open={dialogOpen} onOpenChange={setDialogOpen} entity={editingEntity} />
    </div>
  );
}

export function AdminSettingsPage(): React.JSX.Element {
  const permissions = useAuthStore((state) => state.permissions);
  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return (
    <div>
      <PageHeader
        title="Administração do Sistema"
        description="Configurações globais e entidades legais"
      />

      <Tabs defaultValue="settings">
        <TabsList>
          <TabsTrigger value="settings">Configurações</TabsTrigger>
          <TabsTrigger value="legal-entities">Entidades Legais</TabsTrigger>
        </TabsList>
        <TabsContent value="settings">
          <SettingsTab />
        </TabsContent>
        <TabsContent value="legal-entities">
          <LegalEntitiesTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}
