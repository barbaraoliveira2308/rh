import * as React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { fetchAbsence, approveAbsence, rejectAbsence } from '@/api/absences.api';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/lib/utils';
import { AbsenceStatus } from '@/types/absences';

const MANAGER_ROLES = ['admin', 'manager', 'approver'];

function isManager(roles: string[]): boolean {
  return roles.some((role) => MANAGER_ROLES.includes(role));
}

const statusLabels: Record<AbsenceStatus, string> = {
  [AbsenceStatus.PENDING]: 'Pendente',
  [AbsenceStatus.APPROVED]: 'Aprovado',
  [AbsenceStatus.REJECTED]: 'Rejeitado',
  [AbsenceStatus.CANCELLED]: 'Cancelado',
};

const statusVariants: Record<AbsenceStatus, BadgeVariant> = {
  [AbsenceStatus.PENDING]: 'warning',
  [AbsenceStatus.APPROVED]: 'success',
  [AbsenceStatus.REJECTED]: 'danger',
  [AbsenceStatus.CANCELLED]: 'neutral',
};

function formatDate(value: string): string {
  return new Date(value).toLocaleDateString('pt-PT');
}

export function AbsenceDetailPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = useAuthStore((state) => state.user);
  const isManagerUser = user !== null && isManager(user.roles);

  const [rejectDialogOpen, setRejectDialogOpen] = React.useState(false);
  const [rejectReason, setRejectReason] = React.useState('');

  const absenceQuery = useQuery({
    queryKey: ['absence', id],
    queryFn: () => fetchAbsence(id),
    enabled: id !== '',
  });

  const approveMutation = useMutation({
    mutationFn: () => approveAbsence(id, {}),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['absence', id] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-inbox'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-count'] });
    },
  });

  const rejectMutation = useMutation({
    mutationFn: () => rejectAbsence(id, { reason: rejectReason.trim() }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['absence', id] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-inbox'] });
      void queryClient.invalidateQueries({ queryKey: ['workflow-count'] });
      setRejectDialogOpen(false);
      setRejectReason('');
    },
  });

  if (absenceQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const absence = absenceQuery.data;

  if (absenceQuery.isError || absence === undefined) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Ocorreu um erro ao carregar o pedido de ausência.
      </div>
    );
  }

  const canReview = absence.status === AbsenceStatus.PENDING && isManagerUser;
  const employeeName = absence.employee
    ? `${absence.employee.firstName} ${absence.employee.lastName}`
    : absence.employeeId;

  return (
    <div>
      <PageHeader
        title={absence.absenceType?.name ?? 'Pedido de Ausência'}
        description={employeeName}
        breadcrumb={[
          { label: 'Ausências', href: '/absences' },
          { label: `${formatDate(absence.startDate)} - ${formatDate(absence.endDate)}` },
        ]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-4">
        <StatusBadge
          label={statusLabels[absence.status]}
          variant={statusVariants[absence.status]}
        />
        {canReview && (
          <div className="flex flex-wrap items-center gap-2">
            <Button
              onClick={() => {
                approveMutation.mutate();
              }}
              disabled={approveMutation.isPending}
            >
              Aprovar
            </Button>
            <Button
              variant="destructive"
              onClick={() => {
                setRejectDialogOpen(true);
              }}
              disabled={rejectMutation.isPending}
            >
              Rejeitar
            </Button>
          </div>
        )}
      </div>

      {(approveMutation.isError || rejectMutation.isError) && (
        <div className="mb-6 rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
          {getErrorMessage(
            approveMutation.error ?? rejectMutation.error,
            'Não foi possível concluir a ação. Tente novamente.',
          )}
        </div>
      )}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">De</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {formatDate(absence.startDate)}
            {absence.startHalf && (
              <span className="ml-1 text-xs text-muted-foreground">(meio dia)</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Até</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {formatDate(absence.endDate)}
            {absence.endHalf && (
              <span className="ml-1 text-xs text-muted-foreground">(meio dia)</span>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total de dias
            </CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">{String(absence.totalDays)}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">Tipo</CardTitle>
          </CardHeader>
          <CardContent className="text-lg font-semibold">
            {absence.absenceType?.name ?? '-'}
            {absence.absenceType?.isPaid === false && (
              <span className="ml-1 text-xs text-muted-foreground">(não remunerado)</span>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6">
        <CardHeader>
          <CardTitle>Detalhe do Pedido</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm font-medium text-muted-foreground">Motivo</p>
            <p className="text-sm">{absence.reason ?? 'Sem motivo indicado.'}</p>
          </div>
          {absence.documentUrl !== null && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Documento justificativo</p>
              <a
                href={absence.documentUrl}
                target="_blank"
                rel="noreferrer"
                className="text-sm text-brand-800 hover:underline"
              >
                Ver documento
              </a>
            </div>
          )}
          {absence.status === AbsenceStatus.REJECTED && absence.rejectionReason !== null && (
            <div>
              <p className="text-sm font-medium text-muted-foreground">Motivo da rejeição</p>
              <p className="text-sm text-red-800">{absence.rejectionReason}</p>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="mt-6">
        <Button
          variant="outline"
          onClick={() => {
            void navigate('/absences');
          }}
        >
          Voltar
        </Button>
      </div>

      <Dialog
        open={rejectDialogOpen}
        onOpenChange={(open) => {
          setRejectDialogOpen(open);
          if (!open) {
            setRejectReason('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rejeitar pedido</DialogTitle>
            <DialogDescription>Indique o motivo da rejeição.</DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Label htmlFor="reject-reason" className="sr-only">
              Motivo
            </Label>
            <Input
              id="reject-reason"
              value={rejectReason}
              onChange={(event) => {
                setRejectReason(event.target.value);
              }}
              placeholder="Motivo da rejeição"
            />
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setRejectDialogOpen(false);
                setRejectReason('');
              }}
              disabled={rejectMutation.isPending}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              disabled={rejectMutation.isPending || rejectReason.trim() === ''}
              onClick={() => {
                rejectMutation.mutate();
              }}
            >
              Rejeitar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
