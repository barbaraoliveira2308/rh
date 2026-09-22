import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { StatusBadge, type BadgeVariant } from '@/components/StatusBadge';
import { DataTable, type Column } from '@/components/DataTable';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
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
import { fetchEmployees } from '@/api/users.api';
import { fetchTeams } from '@/api/capacity.api';
import {
  fetchTickets,
  createTicket,
  fetchTicketCategories,
  createTicketCategory,
} from '@/api/helpdesk.api';
import {
  TicketPriority,
  TicketStatus,
  type Ticket,
  type TicketCategory,
  type CreateTicketCategoryRequest,
} from '@/types/helpdesk';

const ALL = 'all';

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

const ticketSchema = z.object({
  title: z.string().min(1, 'O título é obrigatório'),
  description: z.string().min(1, 'A descrição é obrigatória'),
  categoryId: z
    .string()
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
  teamId: z
    .string()
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
});

type TicketForm = z.infer<typeof ticketSchema>;

function NewTicketDialog({
  open,
  onOpenChange,
  categories,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  categories: TicketCategory[];
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const navigate = useNavigate();

  const methods = useForm<TicketForm>({
    resolver: zodResolver(ticketSchema),
    defaultValues: { title: '', description: '', categoryId: '', teamId: '' },
  });

  const { data: teams } = useQuery({ queryKey: ['helpdesk-teams'], queryFn: fetchTeams });

  const createMutation = useMutation({
    mutationFn: (values: TicketForm) =>
      createTicket({
        title: values.title,
        description: values.description,
        categoryId: values.categoryId,
        teamId: values.teamId,
      }),
    onSuccess: (ticket: Ticket) => {
      void queryClient.invalidateQueries({ queryKey: ['tickets'] });
      onOpenChange(false);
      methods.reset();
      void navigate(`/helpdesk/${ticket.id}`);
    },
  });

  const onSubmit = (values: TicketForm): void => {
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
          <DialogTitle>Novo Ticket</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <FormField name="title" label="Título" />
            <div className="space-y-2">
              <Label htmlFor="description">Descrição</Label>
              <textarea
                id="description"
                rows={4}
                className="flex w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                {...methods.register('description')}
              />
              {methods.formState.errors.description && (
                <p className="text-xs text-red-600">
                  {methods.formState.errors.description.message}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="categoryId">Categoria (opcional)</Label>
                <select
                  id="categoryId"
                  {...methods.register('categoryId')}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Sem categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="teamId">Equipa (opcional)</Label>
                <select
                  id="teamId"
                  {...methods.register('teamId')}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">Sem equipa</option>
                  {(teams ?? []).map((team) => (
                    <option key={team.id} value={team.id}>
                      {team.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao criar o ticket.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Criar Ticket'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function TicketsTab(): React.JSX.Element {
  const navigate = useNavigate();
  const permissions = useAuthStore((state) => state.permissions);
  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));
  const canListEmployees = isAdmin || permissions.includes('manager');
  const [status, setStatus] = React.useState(ALL);
  const [priority, setPriority] = React.useState(ALL);
  const [categoryId, setCategoryId] = React.useState(ALL);
  const [dialogOpen, setDialogOpen] = React.useState(false);

  const filterParams = {
    status: status === ALL ? undefined : status,
    priority: priority === ALL ? undefined : priority,
    categoryId: categoryId === ALL ? undefined : categoryId,
  };

  const { data: tickets, isLoading } = useQuery({
    queryKey: ['tickets', filterParams],
    queryFn: () => fetchTickets(filterParams),
  });

  const { data: categories } = useQuery({
    queryKey: ['ticket-categories'],
    queryFn: fetchTicketCategories,
  });

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

  const categoryNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const category of categories ?? []) {
      map.set(category.id, category.name);
    }
    return map;
  }, [categories]);

  const columns: Column<Ticket>[] = [
    { key: 'title', header: 'Título', cell: (row) => row.title },
    {
      key: 'category',
      header: 'Categoria',
      cell: (row) => (row.categoryId ? (categoryNameById.get(row.categoryId) ?? '-') : '-'),
    },
    {
      key: 'priority',
      header: 'Prioridade',
      cell: (row) => (
        <StatusBadge
          label={priorityLabels[row.priority]}
          variant={priorityVariants[row.priority]}
        />
      ),
    },
    {
      key: 'status',
      header: 'Estado',
      cell: (row) => (
        <StatusBadge label={statusLabels[row.status]} variant={statusVariants[row.status]} />
      ),
    },
    {
      key: 'sla',
      header: 'SLA',
      cell: (row) =>
        row.slaBreached ? <StatusBadge label="Violado" variant="danger" /> : <span>-</span>,
    },
    {
      key: 'submitter',
      header: 'Submetido por',
      cell: (row) => employeeNameByUserId.get(row.submitterId) ?? '-',
    },
    {
      key: 'createdAt',
      header: 'Criado em',
      cell: (row) => new Date(row.createdAt).toLocaleDateString('pt-PT'),
    },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            void navigate(`/helpdesk/${row.id}`);
          }}
        >
          Ver
        </Button>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="flex flex-wrap gap-4">
          <div className="w-[180px]">
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todos os estados</SelectItem>
                {Object.values(TicketStatus).map((value) => (
                  <SelectItem key={value} value={value}>
                    {statusLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[180px]">
            <Select value={priority} onValueChange={setPriority}>
              <SelectTrigger>
                <SelectValue placeholder="Prioridade" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as prioridades</SelectItem>
                {Object.values(TicketPriority).map((value) => (
                  <SelectItem key={value} value={value}>
                    {priorityLabels[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="w-[200px]">
            <Select value={categoryId} onValueChange={setCategoryId}>
              <SelectTrigger>
                <SelectValue placeholder="Categoria" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL}>Todas as categorias</SelectItem>
                {(categories ?? []).map((category) => (
                  <SelectItem key={category.id} value={category.id}>
                    {category.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Novo Ticket
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      ) : (tickets ?? []).length === 0 ? (
        <p className="py-8 text-center text-muted-foreground">Nenhum ticket encontrado.</p>
      ) : (
        <DataTable
          data={tickets ?? []}
          columns={columns}
          keyExtractor={(row) => row.id}
          pageSize={15}
        />
      )}

      <NewTicketDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        categories={categories ?? []}
      />
    </div>
  );
}

const categorySchema = z.object({
  name: z.string().min(1, 'O nome é obrigatório'),
  defaultPriority: z.nativeEnum(TicketPriority),
  slaHours: z.coerce.number().min(1, 'O SLA deve ser maior que 0'),
  resolutionTeamId: z
    .string()
    .optional()
    .transform((value) => (value === '' ? undefined : value)),
});

type CategoryForm = z.infer<typeof categorySchema>;

function NewCategoryDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: teams } = useQuery({ queryKey: ['helpdesk-teams'], queryFn: fetchTeams });

  const methods = useForm<CategoryForm>({
    resolver: zodResolver(categorySchema),
    defaultValues: {
      name: '',
      defaultPriority: TicketPriority.MEDIUM,
      slaHours: 48,
      resolutionTeamId: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: CategoryForm) => {
      const payload: CreateTicketCategoryRequest = {
        name: values.name,
        defaultPriority: values.defaultPriority,
        slaHours: values.slaHours,
        resolutionTeamId: values.resolutionTeamId,
      };
      return createTicketCategory(payload);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['ticket-categories'] });
      onOpenChange(false);
      methods.reset();
    },
  });

  const onSubmit = (values: CategoryForm): void => {
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
          <DialogTitle>Nova Categoria</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <FormField name="name" label="Nome" />
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="defaultPriority">Prioridade padrão</Label>
                <select
                  id="defaultPriority"
                  {...methods.register('defaultPriority')}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {Object.values(TicketPriority).map((value) => (
                    <option key={value} value={value}>
                      {priorityLabels[value]}
                    </option>
                  ))}
                </select>
              </div>
              <FormField name="slaHours" label="SLA (horas)" type="number" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="resolutionTeamId">Equipa de resolução (opcional)</Label>
              <select
                id="resolutionTeamId"
                {...methods.register('resolutionTeamId')}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Sem equipa</option>
                {(teams ?? []).map((team) => (
                  <option key={team.id} value={team.id}>
                    {team.name}
                  </option>
                ))}
              </select>
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao criar a categoria.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Criar Categoria'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function CategoriesTab(): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const { data: categories, isLoading } = useQuery({
    queryKey: ['ticket-categories'],
    queryFn: fetchTicketCategories,
  });
  const { data: teams } = useQuery({ queryKey: ['helpdesk-teams'], queryFn: fetchTeams });

  const teamNameById = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const team of teams ?? []) {
      map.set(team.id, team.name);
    }
    return map;
  }, [teams]);

  const columns: Column<TicketCategory>[] = [
    { key: 'name', header: 'Nome', cell: (row) => row.name },
    {
      key: 'defaultPriority',
      header: 'Prioridade Padrão',
      cell: (row) => (
        <StatusBadge
          label={priorityLabels[row.defaultPriority]}
          variant={priorityVariants[row.defaultPriority]}
        />
      ),
    },
    { key: 'slaHours', header: 'SLA (horas)', cell: (row) => String(row.slaHours) },
    {
      key: 'resolutionTeamId',
      header: 'Equipa de Resolução',
      cell: (row) => (row.resolutionTeamId ? (teamNameById.get(row.resolutionTeamId) ?? '-') : '-'),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button
          onClick={() => {
            setDialogOpen(true);
          }}
        >
          <Plus className="mr-2 h-4 w-4" />
          Nova Categoria
        </Button>
      </div>
      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <DataTable data={categories ?? []} columns={columns} keyExtractor={(row) => row.id} />
      )}
      <NewCategoryDialog open={dialogOpen} onOpenChange={setDialogOpen} />
    </div>
  );
}

export function HelpdeskListPage(): React.JSX.Element {
  const permissions = useAuthStore((state) => state.permissions);
  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));

  return (
    <div>
      <PageHeader
        title="Helpdesk Interno"
        description="Submissão e gestão de tickets de suporte interno"
      />

      {isAdmin ? (
        <Tabs defaultValue="tickets">
          <TabsList>
            <TabsTrigger value="tickets">Tickets</TabsTrigger>
            <TabsTrigger value="categories">Categorias</TabsTrigger>
          </TabsList>
          <TabsContent value="tickets">
            <TicketsTab />
          </TabsContent>
          <TabsContent value="categories">
            <CategoriesTab />
          </TabsContent>
        </Tabs>
      ) : (
        <TicketsTab />
      )}
    </div>
  );
}
