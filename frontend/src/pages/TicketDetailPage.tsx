import React from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { Button } from '@/components/ui/button';
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
import { useAuthStore } from '@/stores/auth.store';
import { fetchEmployees } from '@/api/users.api';
import { fetchTeams } from '@/api/capacity.api';
import {
  fetchTicket,
  fetchTicketCategories,
  fetchTicketComments,
  addTicketComment,
  assignTicket,
  escalateTicket,
  closeTicket,
  updateTicket,
} from '@/api/helpdesk.api';
import { TicketPriority, TicketStatus } from '@/types/helpdesk';

const priorityLabels: Record<TicketPriority, string> = {
  [TicketPriority.LOW]: 'Baixa',
  [TicketPriority.MEDIUM]: 'Média',
  [TicketPriority.HIGH]: 'Alta',
  [TicketPriority.URGENT]: 'Urgente',
};

const priorityVariants: Record<TicketPriority, BadgeVariant> = {
  [TicketPriority.LOW]: 'neutral',
  [TicketPriority.MEDIUM]: 'info',
  [TicketPriority.HIGH]: 'warning',
  [TicketPriority.URGENT]: 'danger',
};

const statusLabels: Record<TicketStatus, string> = {
  [TicketStatus.OPEN]: 'Aberto',
  [TicketStatus.IN_PROGRESS]: 'Em Progresso',
  [TicketStatus.PENDING]: 'Pendente',
  [TicketStatus.RESOLVED]: 'Resolvido',
  [TicketStatus.CLOSED]: 'Fechado',
};

const statusVariants: Record<TicketStatus, BadgeVariant> = {
  [TicketStatus.OPEN]: 'info',
  [TicketStatus.IN_PROGRESS]: 'default',
  [TicketStatus.PENDING]: 'warning',
  [TicketStatus.RESOLVED]: 'success',
  [TicketStatus.CLOSED]: 'neutral',
};

function AssignDialog({
  open,
  onOpenChange,
  ticketId,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  ticketId: string;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const canListEmployees =
    permissions.includes('admin:*') ||
    permissions.some((permission) => permission.startsWith('admin')) ||
    permissions.includes('manager');
  const [agentUserId, setAgentUserId] = React.useState('');

  const { data: employeesResponse } = useQuery({
    queryKey: ['helpdesk-employees'],
    queryFn: () => fetchEmployees({ limit: 100 }),
    enabled: canListEmployees,
  });

  const assignMutation = useMutation({
    mutationFn: () => assignTicket(ticketId, { agentId: agentUserId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] });
      onOpenChange(false);
      setAgentUserId('');
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Atribuir Ticket</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Agente</Label>
            <Select value={agentUserId} onValueChange={setAgentUserId}>
              <SelectTrigger>
                <SelectValue placeholder="Selecionar agente" />
              </SelectTrigger>
              <SelectContent>
                {(employeesResponse?.data ?? []).map((employee) => (
                  <SelectItem key={employee.id} value={employee.userId}>
                    {employee.firstName} {employee.lastName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {assignMutation.isError && (
            <p className="text-sm text-red-600">Ocorreu um erro ao atribuir o ticket.</p>
          )}
        </div>
        <DialogFooter>
          <Button
            onClick={() => {
              assignMutation.mutate();
            }}
            disabled={agentUserId === '' || assignMutation.isPending}
          >
            {assignMutation.isPending ? <LoadingSpinner size={16} /> : 'Atribuir'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export function TicketDetailPage(): React.JSX.Element {
  const { id = '' } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const permissions = useAuthStore((state) => state.permissions);
  const canListEmployees =
    permissions.includes('admin:*') ||
    permissions.some((permission) => permission.startsWith('admin')) ||
    permissions.includes('manager');
  const user = useAuthStore((state) => state.user);
  const roles = user?.roles ?? [];
  const isAdmin = roles.includes('admin');
  const isAgentOrAdmin = isAdmin || roles.includes('manager');

  const [assignDialogOpen, setAssignDialogOpen] = React.useState(false);
  const [escalateConfirmOpen, setEscalateConfirmOpen] = React.useState(false);
  const [closeConfirmOpen, setCloseConfirmOpen] = React.useState(false);
  const [commentText, setCommentText] = React.useState('');
  const [isInternalComment, setIsInternalComment] = React.useState(false);

  const ticketQuery = useQuery({
    queryKey: ['ticket', id],
    queryFn: () => fetchTicket(id),
    enabled: id !== '',
  });

  const commentsQuery = useQuery({
    queryKey: ['ticket-comments', id],
    queryFn: () => fetchTicketComments(id),
    enabled: id !== '',
  });

  const { data: categories } = useQuery({
    queryKey: ['ticket-categories'],
    queryFn: fetchTicketCategories,
  });

  const { data: teams } = useQuery({ queryKey: ['helpdesk-teams'], queryFn: fetchTeams });

  const { data: employeesResponse } = useQuery({
    queryKey: ['helpdesk-employees'],
    queryFn: () => fetchEmployees({ limit: 100 }),
    enabled: canListEmployees,
  });

  const employeeNameByUserId = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const employee of employeesResponse?.data ?? []) {
      map.set(employee.userId, `${employee.firstName} ${employee.lastName}`);
    }
    return map;
  }, [employeesResponse]);

  const escalateMutation = useMutation({
    mutationFn: () => escalateTicket(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setEscalateConfirmOpen(false);
    },
  });

  const closeMutation = useMutation({
    mutationFn: () => closeTicket(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ticket', id] });
      setCloseConfirmOpen(false);
    },
  });

  const reopenMutation = useMutation({
    mutationFn: () => updateTicket(id, { status: TicketStatus.OPEN }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ticket', id] });
    },
  });

  const addCommentMutation = useMutation({
    mutationFn: () => addTicketComment(id, { text: commentText, isInternal: isInternalComment }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ticket-comments', id] });
      setCommentText('');
      setIsInternalComment(false);
    },
  });

  if (ticketQuery.isLoading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner />
      </div>
    );
  }

  const ticket = ticketQuery.data;

  if (ticketQuery.isError || ticket === undefined) {
    return (
      <div className="rounded-md border border-red-200 bg-red-50 p-4 text-sm text-red-800">
        Ocorreu um erro ao carregar o ticket.
      </div>
    );
  }

  const isSubmitter = user !== null && user.id === ticket.submitterId;
  const isClosed = ticket.status === TicketStatus.CLOSED;
  const canAssign = isAdmin && !isClosed;
  const canEscalate = isAgentOrAdmin && !isClosed;
  const canClose = (isAgentOrAdmin || isSubmitter) && !isClosed;
  const canReopen = isAgentOrAdmin && isClosed;

  const category = categories?.find((c) => c.id === ticket.categoryId);
  const team = teams?.find((t) => t.id === ticket.teamId);

  return (
    <div>
      <PageHeader
        title={ticket.title}
        description={category ? category.name : 'Sem categoria'}
        breadcrumb={[{ label: 'Helpdesk', href: '/helpdesk' }, { label: ticket.title }]}
      />

      <div className="mb-6 flex flex-wrap items-center gap-2">
        <StatusBadge label={statusLabels[ticket.status]} variant={statusVariants[ticket.status]} />
        <StatusBadge
          label={priorityLabels[ticket.priority]}
          variant={priorityVariants[ticket.priority]}
        />
        {ticket.slaBreached && <StatusBadge label="SLA Violado" variant="danger" />}
      </div>

      <div className="mb-6 flex flex-wrap gap-2">
        {canAssign && (
          <Button
            variant="outline"
            onClick={() => {
              setAssignDialogOpen(true);
            }}
          >
            Atribuir
          </Button>
        )}
        {canEscalate && (
          <Button
            variant="outline"
            onClick={() => {
              setEscalateConfirmOpen(true);
            }}
          >
            Escalar
          </Button>
        )}
        {canClose && (
          <Button
            variant="destructive"
            onClick={() => {
              setCloseConfirmOpen(true);
            }}
          >
            Fechar Ticket
          </Button>
        )}
        {canReopen && (
          <Button
            variant="outline"
            onClick={() => {
              reopenMutation.mutate();
            }}
            disabled={reopenMutation.isPending}
          >
            Reabrir
          </Button>
        )}
        <Button
          variant="ghost"
          onClick={() => {
            void navigate('/helpdesk');
          }}
        >
          Voltar
        </Button>
      </div>

      {reopenMutation.isError && (
        <p className="mb-4 text-sm text-red-600">
          Não foi possível reabrir o ticket (só é permitido até 7 dias após o fecho).
        </p>
      )}

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Descrição</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="whitespace-pre-wrap text-sm">{ticket.description}</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                Comentários ({(commentsQuery.data ?? []).length})
              </CardTitle>
            </CardHeader>
            <CardContent>
              {commentsQuery.isLoading ? (
                <LoadingSpinner size={24} />
              ) : (commentsQuery.data ?? []).length === 0 ? (
                <p className="text-sm text-muted-foreground">Sem comentários ainda.</p>
              ) : (
                <ul className="space-y-3">
                  {(commentsQuery.data ?? []).map((comment) => (
                    <li key={comment.id} className="rounded-md border p-3">
                      <div className="mb-1 flex items-center justify-between">
                        <span className="text-sm font-medium">
                          {employeeNameByUserId.get(comment.userId) ?? 'Utilizador'}
                        </span>
                        <div className="flex items-center gap-2">
                          {comment.isInternal && <StatusBadge label="Interno" variant="warning" />}
                          <span className="text-xs text-muted-foreground">
                            {new Date(comment.createdAt).toLocaleString('pt-PT')}
                          </span>
                        </div>
                      </div>
                      <p className="whitespace-pre-wrap text-sm">{comment.text}</p>
                    </li>
                  ))}
                </ul>
              )}

              <div className="mt-4 space-y-2 border-t pt-4">
                <Label htmlFor="newComment">Adicionar comentário</Label>
                <textarea
                  id="newComment"
                  rows={3}
                  value={commentText}
                  onChange={(event) => {
                    setCommentText(event.target.value);
                  }}
                  className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  placeholder="Escreva um comentário..."
                />
                <div className="flex items-center justify-between">
                  {isAgentOrAdmin ? (
                    <div className="flex items-center gap-2">
                      <input
                        id="isInternalComment"
                        type="checkbox"
                        checked={isInternalComment}
                        onChange={(event) => {
                          setIsInternalComment(event.target.checked);
                        }}
                        className="h-4 w-4 rounded border-border"
                      />
                      <Label htmlFor="isInternalComment" className="font-normal">
                        Comentário interno (visível apenas a agentes)
                      </Label>
                    </div>
                  ) : (
                    <span />
                  )}
                  <Button
                    onClick={() => {
                      addCommentMutation.mutate();
                    }}
                    disabled={commentText.trim() === '' || addCommentMutation.isPending}
                  >
                    {addCommentMutation.isPending ? <LoadingSpinner size={16} /> : 'Comentar'}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Detalhes</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Submetido por</span>
              <span>{employeeNameByUserId.get(ticket.submitterId) ?? '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Atribuído a</span>
              <span>
                {ticket.assigneeId ? (employeeNameByUserId.get(ticket.assigneeId) ?? '-') : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Equipa</span>
              <span>{team ? team.name : '-'}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Criado em</span>
              <span>{new Date(ticket.createdAt).toLocaleString('pt-PT')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">SLA</span>
              <span>
                {ticket.slaDeadline ? new Date(ticket.slaDeadline).toLocaleString('pt-PT') : '-'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Resolvido em</span>
              <span>
                {ticket.resolvedAt ? new Date(ticket.resolvedAt).toLocaleString('pt-PT') : '-'}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <AssignDialog open={assignDialogOpen} onOpenChange={setAssignDialogOpen} ticketId={id} />

      <ConfirmDialog
        open={escalateConfirmOpen}
        title="Escalar Ticket"
        description="O ticket será marcado como urgente e o prazo de SLA recalculado. Confirma?"
        confirmLabel="Escalar"
        onConfirm={() => {
          escalateMutation.mutate();
        }}
        onCancel={() => {
          setEscalateConfirmOpen(false);
        }}
        isLoading={escalateMutation.isPending}
      />

      <ConfirmDialog
        open={closeConfirmOpen}
        title="Fechar Ticket"
        description="Tem a certeza que pretende fechar este ticket?"
        confirmLabel="Fechar"
        onConfirm={() => {
          closeMutation.mutate();
        }}
        onCancel={() => {
          setCloseConfirmOpen(false);
        }}
        isLoading={closeMutation.isPending}
      />
    </div>
  );
}
