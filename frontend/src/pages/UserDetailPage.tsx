import * as React from 'react';
import { useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import dayjs from 'dayjs';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent } from '@/components/ui/card';
import { fetchEmployee } from '@/api/users.api';
import { EmployeeStatus } from '@/types/users';

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

export function UserDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();

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

  return (
    <div>
      <PageHeader
        title={fullName}
        description={employee.email}
        breadcrumb={[{ label: 'Colaboradores', href: '/users' }, { label: fullName }]}
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
    </div>
  );
}
