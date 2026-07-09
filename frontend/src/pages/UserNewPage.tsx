import * as React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { Controller, FormProvider, Path, useForm, useFormContext, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { createEmployee, fetchDepartments, fetchEmployees, fetchJobTitles } from '@/api/users.api';
import { EmployeeStatus } from '@/types/users';

const employeeSchema = z.object({
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
  userId: z.string().optional(),
});

type EmployeeForm = z.infer<typeof employeeSchema>;

const statusOptions = [
  { value: EmployeeStatus.ACTIVE, label: 'Ativo' },
  { value: EmployeeStatus.INACTIVE, label: 'Inativo' },
  { value: EmployeeStatus.ON_LEAVE, label: 'Em licença' },
];

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

interface SelectOption {
  value: string;
  label: string;
}

interface SelectFieldProps {
  name: Path<EmployeeForm>;
  label: string;
  options: SelectOption[];
  placeholder?: string;
}

function SelectField({ name, label, options, placeholder }: SelectFieldProps): React.JSX.Element {
  const { control, formState } = useFormContext<EmployeeForm>();
  const error = formState.errors[name]?.message;

  return (
    <div className="space-y-2">
      <Label htmlFor={name}>{label}</Label>
      <Controller
        name={name}
        control={control}
        render={({ field }) => (
          <Select
            value={field.value ?? ''}
            onValueChange={(value) => {
              field.onChange(value || undefined);
            }}
          >
            <SelectTrigger id={name} aria-invalid={Boolean(error)}>
              <SelectValue placeholder={placeholder ?? label} />
            </SelectTrigger>
            <SelectContent>
              {options.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      />
      {error && <p className="text-xs text-red-600">{error}</p>}
    </div>
  );
}

const stepFields: Path<EmployeeForm>[][] = [
  ['firstName', 'lastName', 'email'],
  ['employeeNumber', 'employmentStartDate', 'status'],
];

const stepLabels = ['Dados Básicos', 'Emprego', 'Acesso'];

export function UserNewPage(): React.JSX.Element {
  const navigate = useNavigate();
  const [step, setStep] = React.useState(0);
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  const methods = useForm<EmployeeForm>({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      personalEmail: '',
      phone: '',
      nif: '',
      birthDate: '',
      nationality: '',
      gender: '',
      address: '',
      employeeNumber: '',
      departmentId: '',
      jobTitleId: '',
      managerId: '',
      employmentStartDate: '',
      employmentEndDate: '',
      workLocation: '',
      status: EmployeeStatus.ACTIVE,
      iban: '',
      userId: '',
    },
  });

  const { handleSubmit, trigger } = methods;

  const values = useWatch({ control: methods.control });

  const { data: departments } = useQuery({
    queryKey: ['departments'],
    queryFn: fetchDepartments,
  });

  const { data: jobTitles } = useQuery({
    queryKey: ['jobTitles'],
    queryFn: fetchJobTitles,
  });

  const { data: managers } = useQuery({
    queryKey: ['employees', { status: EmployeeStatus.ACTIVE, limit: 1000 }],
    queryFn: () => fetchEmployees({ status: EmployeeStatus.ACTIVE, limit: 1000 }),
  });

  const departmentOptions: SelectOption[] = React.useMemo(
    () =>
      departments?.map((department) => ({
        value: department.id,
        label: department.name,
      })) ?? [],
    [departments],
  );

  const jobTitleOptions: SelectOption[] = React.useMemo(
    () =>
      jobTitles?.map((jobTitle) => ({
        value: jobTitle.id,
        label: jobTitle.name,
      })) ?? [],
    [jobTitles],
  );

  const managerOptions: SelectOption[] = React.useMemo(
    () =>
      managers?.data.map((manager) => ({
        value: manager.id,
        label: `${manager.firstName} ${manager.lastName}`,
      })) ?? [],
    [managers],
  );

  const handleNext = async (): Promise<void> => {
    const fields = stepFields[step];
    if (fields) {
      const valid = await trigger(fields);
      if (!valid) {
        return;
      }
    }
    setStep((prev) => prev + 1);
  };

  const handleBack = (): void => {
    setStep((prev) => prev - 1);
  };

  const onSubmit = async (formValues: EmployeeForm): Promise<void> => {
    setSubmitError(null);
    setIsSubmitting(true);
    try {
      await createEmployee(formValues);
      void navigate('/users');
    } catch {
      setSubmitError('Ocorreu um erro ao criar o colaborador.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const departmentName = React.useMemo(() => {
    return departments?.find((department) => department.id === values.departmentId)?.name ?? '-';
  }, [departments, values.departmentId]);

  const jobTitleName = React.useMemo(() => {
    return jobTitles?.find((jobTitle) => jobTitle.id === values.jobTitleId)?.name ?? '-';
  }, [jobTitles, values.jobTitleId]);

  const managerName = React.useMemo(() => {
    const manager = managers?.data.find((m) => m.id === values.managerId);
    return manager ? `${manager.firstName} ${manager.lastName}` : '-';
  }, [managers, values.managerId]);

  return (
    <div>
      <PageHeader
        title="Novo Colaborador"
        description="Criar novo colaborador no sistema"
        breadcrumb={[{ label: 'Colaboradores', href: '/users' }, { label: 'Novo' }]}
      />

      <FormProvider {...methods}>
        <form onSubmit={(event) => void handleSubmit(onSubmit)(event)} className="space-y-6">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            {stepLabels.map((label, index) => (
              <React.Fragment key={label}>
                <span className={index === step ? 'font-medium text-foreground' : undefined}>
                  {String(index + 1)}. {label}
                </span>
                {index < stepLabels.length - 1 && <ChevronRight className="h-4 w-4" />}
              </React.Fragment>
            ))}
          </div>

          {step === 0 && (
            <Card>
              <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
                <FormField name="firstName" label="Nome próprio" />
                <FormField name="lastName" label="Apelido" />
                <FormField name="email" label="Email" type="email" />
                <FormField name="personalEmail" label="Email pessoal" type="email" />
                <FormField name="phone" label="Telefone" type="tel" />
                <FormField name="nif" label="NIF" />
                <FormField name="birthDate" label="Data de nascimento" type="date" />
                <FormField name="nationality" label="Nacionalidade" />
                <FormField name="gender" label="Género" />
                <FormField name="address" label="Morada" className="sm:col-span-2 lg:col-span-3" />
              </CardContent>
            </Card>
          )}

          {step === 1 && (
            <Card>
              <CardContent className="grid gap-4 pt-6 sm:grid-cols-2 lg:grid-cols-3">
                <FormField name="employeeNumber" label="Número de colaborador" />
                <SelectField
                  name="departmentId"
                  label="Departamento"
                  placeholder="Selecionar departamento"
                  options={departmentOptions}
                />
                <SelectField
                  name="jobTitleId"
                  label="Cargo"
                  placeholder="Selecionar cargo"
                  options={jobTitleOptions}
                />
                <SelectField
                  name="managerId"
                  label="Gestor"
                  placeholder="Selecionar gestor"
                  options={managerOptions}
                />
                <FormField name="employmentStartDate" label="Data de início" type="date" />
                <FormField name="employmentEndDate" label="Data de fim" type="date" />
                <FormField name="workLocation" label="Local de trabalho" />
                <SelectField
                  name="status"
                  label="Estado"
                  placeholder="Selecionar estado"
                  options={statusOptions}
                />
                <FormField name="iban" label="IBAN" />
              </CardContent>
            </Card>
          )}

          {step === 2 && (
            <Card>
              <CardContent className="space-y-6 pt-6">
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <FormField
                    name="userId"
                    label="Utilizador associado"
                    placeholder="ID do utilizador"
                  />
                </div>

                <div>
                  <h3 className="mb-2 text-sm font-semibold">Resumo</h3>
                  <div className="grid gap-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
                    <p>
                      <span className="text-muted-foreground">Nome:</span> {values.firstName}{' '}
                      {values.lastName}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Email:</span> {values.email ?? '-'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Telefone:</span> {values.phone ?? '-'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Número de colaborador:</span>{' '}
                      {values.employeeNumber ?? '-'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Departamento:</span> {departmentName}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Cargo:</span> {jobTitleName}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Gestor:</span> {managerName}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Data de início:</span>{' '}
                      {values.employmentStartDate ?? '-'}
                    </p>
                    <p>
                      <span className="text-muted-foreground">Estado:</span>{' '}
                      {values.status ? getStatusLabel(values.status) : '-'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {submitError && <p className="text-sm text-red-600">{submitError}</p>}

          <div className="flex justify-between">
            <Button type="button" variant="outline" onClick={handleBack} disabled={step === 0}>
              <ChevronLeft className="mr-2 h-4 w-4" />
              Anterior
            </Button>

            {step < stepLabels.length - 1 ? (
              <Button type="button" onClick={() => void handleNext()}>
                Próximo
                <ChevronRight className="ml-2 h-4 w-4" />
              </Button>
            ) : (
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? <LoadingSpinner size={16} /> : 'Criar Colaborador'}
              </Button>
            )}
          </div>
        </form>
      </FormProvider>
    </div>
  );
}
