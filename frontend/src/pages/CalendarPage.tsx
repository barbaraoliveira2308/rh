import React from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { DataTable, type Column } from '@/components/DataTable';
import { ConfirmDialog } from '@/components/ConfirmDialog';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
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
import { fetchAbsenceTypes, createAbsence } from '@/api/absences.api';
import {
  fetchMonthView,
  fetchHolidays,
  importHolidays,
  createHoliday,
  fetchCompanyEvents,
  createCompanyEvent,
  updateCompanyEvent,
  deleteCompanyEvent,
  fetchBlockedPeriods,
  createBlockedPeriod,
  deleteBlockedPeriod,
} from '@/api/calendar.api';
import {
  CompanyEventType,
  BlockedPeriodScope,
  type CalendarEvent,
  type PublicHoliday,
  type CompanyEvent,
  type BlockedPeriod,
} from '@/types/calendar';

const ALL_TEAMS = 'all';

const legend: { color: string; label: string }[] = [
  { color: '#22C55E', label: 'Férias aprovadas' },
  { color: '#EAB308', label: 'Ausência aprovada' },
  { color: '#9CA3AF', label: 'Feriado' },
  { color: '#EC4899', label: 'Aniversário de nascimento' },
  { color: '#3B82F6', label: 'Aniversário de empresa' },
  { color: '#8B5CF6', label: 'Evento Bridge351/NIVVOS' },
];

const companyEventTypeLabels: Record<CompanyEventType, string> = {
  [CompanyEventType.BRIDGE351]: 'Bridge351',
  [CompanyEventType.NIVVOS]: 'NIVVOS',
  [CompanyEventType.COMPANY]: 'Empresa',
  [CompanyEventType.OTHER]: 'Outro',
};

const blockedScopeLabels: Record<BlockedPeriodScope, string> = {
  [BlockedPeriodScope.ABSENCES]: 'Ausências',
  [BlockedPeriodScope.TIMESHEETS]: 'Timesheets',
  [BlockedPeriodScope.ALL]: 'Todos',
};

function currentPeriod(): string {
  const now = new Date();
  return `${String(now.getFullYear())}-${String(now.getMonth() + 1).padStart(2, '0')}`;
}

function pad(n: number): string {
  return String(n).padStart(2, '0');
}

function toIso(d: Date): string {
  return `${String(d.getFullYear())}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

interface GridCell {
  date: string;
  day: number;
  inMonth: boolean;
}

function buildMonthGrid(year: number, month: number): GridCell[] {
  const firstOfMonth = new Date(year, month - 1, 1);
  const mondayOffset = (firstOfMonth.getDay() + 6) % 7;
  const gridStart = new Date(year, month - 1, 1 - mondayOffset);
  const daysInMonth = new Date(year, month, 0).getDate();
  const totalCells = Math.ceil((mondayOffset + daysInMonth) / 7) * 7;

  const cells: GridCell[] = [];
  for (let i = 0; i < totalCells; i++) {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    cells.push({ date: toIso(d), day: d.getDate(), inMonth: d.getMonth() === month - 1 });
  }
  return cells;
}

const weekdayLabels = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];

const optionalText = z
  .string()
  .optional()
  .transform((value) => (value === '' ? undefined : value));

const quickAbsenceSchema = z
  .object({
    absenceTypeId: z.string().min(1, 'O tipo de ausência é obrigatório'),
    startDate: z.string().min(1, 'A data de início é obrigatória'),
    endDate: z.string().min(1, 'A data de fim é obrigatória'),
    reason: optionalText,
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'A data de fim deve ser igual ou posterior à data de início',
    path: ['endDate'],
  });

type QuickAbsenceForm = z.infer<typeof quickAbsenceSchema>;

function QuickAbsenceDialog({
  open,
  onOpenChange,
  date,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  date: string | null;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const { data: absenceTypes } = useQuery({
    queryKey: ['calendar-absence-types'],
    queryFn: fetchAbsenceTypes,
    enabled: open,
  });

  const methods = useForm<QuickAbsenceForm>({
    resolver: zodResolver(quickAbsenceSchema),
    values: {
      absenceTypeId: '',
      startDate: date ?? '',
      endDate: date ?? '',
      reason: '',
    },
  });

  const createMutation = useMutation({
    mutationFn: createAbsence,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-month'] });
      onOpenChange(false);
    },
  });

  const onSubmit = (values: QuickAbsenceForm): void => {
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
          <DialogTitle>Nova Ausência</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <div className="space-y-2">
              <Label htmlFor="absenceTypeId">Tipo de ausência</Label>
              <select
                id="absenceTypeId"
                {...methods.register('absenceTypeId')}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                <option value="">Selecionar tipo</option>
                {(absenceTypes ?? []).map((type) => (
                  <option key={type.id} value={type.id}>
                    {type.name}
                  </option>
                ))}
              </select>
              {methods.formState.errors.absenceTypeId && (
                <p className="text-xs text-red-600">
                  {methods.formState.errors.absenceTypeId.message}
                </p>
              )}
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="startDate" label="Data de início" type="date" />
              <FormField name="endDate" label="Data de fim" type="date" />
            </div>
            <FormField name="reason" label="Motivo" placeholder="Motivo da ausência (opcional)" />
            {createMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao criar o pedido de ausência.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Submeter'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function MonthGrid({
  year,
  month,
  events,
  onDayClick,
}: {
  year: number;
  month: number;
  events: CalendarEvent[];
  onDayClick: (date: string) => void;
}): React.JSX.Element {
  const cells = React.useMemo(() => buildMonthGrid(year, month), [year, month]);
  const today = toIso(new Date());

  const eventsByDate = React.useMemo(() => {
    const map = new Map<string, CalendarEvent[]>();
    for (const cell of cells) {
      map.set(cell.date, []);
    }
    for (const event of events) {
      const start = event.date;
      const end = event.endDate ?? event.date;
      for (const cell of cells) {
        if (cell.date >= start && cell.date <= end) {
          map.get(cell.date)?.push(event);
        }
      }
    }
    return map;
  }, [cells, events]);

  return (
    <div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-t-md border bg-border text-center text-xs font-medium text-muted-foreground">
        {weekdayLabels.map((label) => (
          <div key={label} className="bg-muted/50 py-2">
            {label}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7 gap-px overflow-hidden rounded-b-md border border-t-0 bg-border">
        {cells.map((cell) => {
          const dayEvents = eventsByDate.get(cell.date) ?? [];
          const visibleEvents = dayEvents.slice(0, 3);
          const overflow = dayEvents.length - visibleEvents.length;

          return (
            <div
              key={cell.date}
              className={`min-h-[100px] bg-card p-1.5 ${cell.inMonth ? '' : 'bg-muted/30 text-muted-foreground'}`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs ${cell.date === today ? 'flex h-5 w-5 items-center justify-center rounded-full bg-brand-800 font-semibold text-white' : ''}`}
                >
                  {cell.day}
                </span>
                {cell.inMonth && (
                  <button
                    type="button"
                    aria-label={`Adicionar ausência em ${cell.date}`}
                    onClick={() => {
                      onDayClick(cell.date);
                    }}
                    className="rounded text-muted-foreground hover:bg-muted hover:text-foreground"
                  >
                    <Plus className="h-3 w-3" />
                  </button>
                )}
              </div>
              <div className="mt-1 space-y-0.5">
                {visibleEvents.map((event) => (
                  <div
                    key={event.id}
                    title={event.title}
                    className="truncate rounded px-1 py-0.5 text-[10px] leading-tight text-white"
                    style={{ backgroundColor: event.color ?? '#6B7280' }}
                  >
                    {event.title}
                  </div>
                ))}
                {overflow > 0 && (
                  <div className="px-1 text-[10px] text-muted-foreground">+{overflow} mais</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CalendarTab(): React.JSX.Element {
  const [period, setPeriod] = React.useState(currentPeriod());
  const [teamId, setTeamId] = React.useState(ALL_TEAMS);
  const [quickAbsenceDate, setQuickAbsenceDate] = React.useState<string | null>(null);

  const [yearStr, monthStr] = period.split('-');
  const year = Number(yearStr);
  const month = Number(monthStr);

  const { data: teams } = useQuery({ queryKey: ['calendar-teams'], queryFn: fetchTeams });

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-month', year, month, teamId],
    queryFn: () => fetchMonthView(year, month, teamId === ALL_TEAMS ? undefined : teamId),
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-4">
        <div className="w-[200px]">
          <Input
            type="month"
            value={period}
            onChange={(e) => {
              setPeriod(e.target.value);
            }}
            aria-label="Mês"
          />
        </div>
        <div className="w-[240px]">
          <Select value={teamId} onValueChange={setTeamId}>
            <SelectTrigger>
              <SelectValue placeholder="Equipa" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_TEAMS}>Sem filtro de equipa</SelectItem>
              {(teams ?? []).map((team) => (
                <SelectItem key={team.id} value={team.id}>
                  {team.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {teamId === ALL_TEAMS && (
        <p className="text-sm text-muted-foreground">
          Selecione uma equipa para ver as ausências aprovadas dos seus colaboradores. Feriados e
          aniversários são sempre apresentados.
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <MonthGrid
          year={year}
          month={month}
          events={events ?? []}
          onDayClick={setQuickAbsenceDate}
        />
      )}

      <div className="flex flex-wrap gap-4">
        {legend.map((item) => (
          <div key={item.label} className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <span
              className="h-2.5 w-2.5 rounded-full"
              style={{ backgroundColor: item.color }}
              aria-hidden
            />
            {item.label}
          </div>
        ))}
      </div>

      <QuickAbsenceDialog
        open={quickAbsenceDate !== null}
        onOpenChange={(open) => {
          if (!open) setQuickAbsenceDate(null);
        }}
        date={quickAbsenceDate}
      />
    </div>
  );
}

const holidaySchema = z.object({
  countryCode: z.string().min(1, 'O país é obrigatório').max(5),
  holidayDate: z.string().min(1, 'A data é obrigatória'),
  name: z.string().min(1, 'O nome é obrigatório'),
  localName: optionalText,
  region: optionalText,
});

type HolidayForm = z.infer<typeof holidaySchema>;

function NewHolidayDialog({
  open,
  onOpenChange,
  year,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  year: number;
}): React.JSX.Element {
  const queryClient = useQueryClient();

  const methods = useForm<HolidayForm>({
    resolver: zodResolver(holidaySchema),
    defaultValues: { countryCode: 'PT', holidayDate: '', name: '', localName: '', region: '' },
  });

  const createMutation = useMutation({
    mutationFn: (values: HolidayForm) => createHoliday(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-holidays', year] });
      onOpenChange(false);
      methods.reset();
    },
  });

  const onSubmit = (values: HolidayForm): void => {
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
          <DialogTitle>Novo Feriado</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="countryCode" label="Código do país" placeholder="PT" />
              <FormField name="holidayDate" label="Data" type="date" />
            </div>
            <FormField name="name" label="Nome" />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="localName" label="Nome local (opcional)" />
              <FormField name="region" label="Região (opcional)" />
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao criar o feriado.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Criar Feriado'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function HolidaysTab(): React.JSX.Element {
  const [year, setYear] = React.useState(new Date().getFullYear());
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const queryClient = useQueryClient();

  const { data: holidays, isLoading } = useQuery({
    queryKey: ['calendar-holidays', year],
    queryFn: () => fetchHolidays(year, 'PT'),
  });

  const importMutation = useMutation({
    mutationFn: () => importHolidays(year),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-holidays', year] });
    },
  });

  const columns: Column<PublicHoliday>[] = [
    { key: 'holidayDate', header: 'Data', cell: (row) => row.holidayDate },
    { key: 'name', header: 'Nome', cell: (row) => row.name },
    { key: 'localName', header: 'Nome Local', cell: (row) => row.localName ?? '-' },
    { key: 'countryCode', header: 'País', cell: (row) => row.countryCode },
    { key: 'global', header: 'Nacional', cell: (row) => (row.global ? 'Sim' : 'Não') },
  ];

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="w-[140px]">
          <Label htmlFor="holiday-year">Ano</Label>
          <Input
            id="holiday-year"
            type="number"
            value={year}
            onChange={(e) => {
              setYear(Number(e.target.value));
            }}
          />
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={importMutation.isPending}
            onClick={() => {
              importMutation.mutate();
            }}
          >
            {importMutation.isPending ? <LoadingSpinner size={16} /> : 'Importar Feriados PT'}
          </Button>
          <Button
            onClick={() => {
              setDialogOpen(true);
            }}
          >
            <Plus className="mr-2 h-4 w-4" />
            Novo Feriado
          </Button>
        </div>
      </div>

      {importMutation.isSuccess && (
        <p className="text-sm text-green-700">
          {importMutation.data.imported} feriado(s) importado(s).
        </p>
      )}

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <DataTable
          data={holidays ?? []}
          columns={columns}
          keyExtractor={(row) => row.id}
          pageSize={15}
        />
      )}

      <NewHolidayDialog open={dialogOpen} onOpenChange={setDialogOpen} year={year} />
    </div>
  );
}

const eventSchema = z
  .object({
    title: z.string().min(1, 'O título é obrigatório'),
    description: optionalText,
    startDate: z.string().min(1, 'A data de início é obrigatória'),
    endDate: optionalText,
    type: z.nativeEnum(CompanyEventType),
    color: optionalText,
    isRecurring: z.boolean(),
  })
  .refine((data) => !data.endDate || data.endDate >= data.startDate, {
    message: 'A data de fim deve ser igual ou posterior à data de início',
    path: ['endDate'],
  });

type EventForm = z.infer<typeof eventSchema>;

function eventToFormValues(event: CompanyEvent): EventForm {
  return {
    title: event.title,
    description: event.description ?? '',
    startDate: event.startDate,
    endDate: event.endDate ?? '',
    type: event.type,
    color: event.color ?? '',
    isRecurring: event.isRecurring,
  };
}

const emptyEventForm: EventForm = {
  title: '',
  description: '',
  startDate: '',
  endDate: '',
  type: CompanyEventType.COMPANY,
  color: '',
  isRecurring: false,
};

function EventDialog({
  open,
  onOpenChange,
  event,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  event: CompanyEvent | null;
}): React.JSX.Element {
  const queryClient = useQueryClient();

  const methods = useForm<EventForm>({
    resolver: zodResolver(eventSchema),
    values: event ? eventToFormValues(event) : emptyEventForm,
  });

  const createMutation = useMutation({
    mutationFn: createCompanyEvent,
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar-month'] });
      onOpenChange(false);
    },
  });

  const updateMutation = useMutation({
    mutationFn: (values: EventForm) => updateCompanyEvent(event?.id ?? '', values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar-month'] });
      onOpenChange(false);
    },
  });

  const isSubmitting = createMutation.isPending || updateMutation.isPending;
  const submitError = createMutation.isError || updateMutation.isError;

  const onSubmit = (values: EventForm): void => {
    if (event) {
      updateMutation.mutate(values);
    } else {
      createMutation.mutate(values);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{event ? 'Editar Evento' : 'Novo Evento'}</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form onSubmit={(e) => void methods.handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormField name="title" label="Título" />
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
              <FormField name="startDate" label="Data de início" type="date" />
              <FormField name="endDate" label="Data de fim (opcional)" type="date" />
            </div>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="type">Tipo</Label>
                <select
                  id="type"
                  {...methods.register('type')}
                  className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  {Object.values(CompanyEventType).map((value) => (
                    <option key={value} value={value}>
                      {companyEventTypeLabels[value]}
                    </option>
                  ))}
                </select>
              </div>
              <FormField name="color" label="Cor (hex, opcional)" placeholder="#8B5CF6" />
            </div>
            <div className="flex items-center gap-2">
              <input
                id="isRecurring"
                type="checkbox"
                {...methods.register('isRecurring')}
                className="h-4 w-4 rounded border-border"
              />
              <Label htmlFor="isRecurring" className="font-normal">
                Evento recorrente
              </Label>
            </div>
            {submitError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao guardar o evento.</p>
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

function EventsTab(): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [editingEvent, setEditingEvent] = React.useState<CompanyEvent | null>(null);
  const [deletingEvent, setDeletingEvent] = React.useState<CompanyEvent | null>(null);
  const queryClient = useQueryClient();

  const { data: events, isLoading } = useQuery({
    queryKey: ['calendar-events'],
    queryFn: fetchCompanyEvents,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteCompanyEvent(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-events'] });
      void queryClient.invalidateQueries({ queryKey: ['calendar-month'] });
      setDeletingEvent(null);
    },
  });

  const openCreateDialog = (): void => {
    setEditingEvent(null);
    setDialogOpen(true);
  };

  const openEditDialog = (event: CompanyEvent): void => {
    setEditingEvent(event);
    setDialogOpen(true);
  };

  const columns: Column<CompanyEvent>[] = [
    { key: 'title', header: 'Título', cell: (row) => row.title },
    { key: 'startDate', header: 'Data Início', cell: (row) => row.startDate },
    { key: 'endDate', header: 'Data Fim', cell: (row) => row.endDate ?? '-' },
    { key: 'type', header: 'Tipo', cell: (row) => companyEventTypeLabels[row.type] },
    { key: 'isRecurring', header: 'Recorrente', cell: (row) => (row.isRecurring ? 'Sim' : 'Não') },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              openEditDialog(row);
            }}
          >
            <Pencil className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setDeletingEvent(row);
            }}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Button onClick={openCreateDialog}>
          <Plus className="mr-2 h-4 w-4" />
          Novo Evento
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <DataTable
          data={events ?? []}
          columns={columns}
          keyExtractor={(row) => row.id}
          pageSize={15}
        />
      )}

      <EventDialog open={dialogOpen} onOpenChange={setDialogOpen} event={editingEvent} />

      <ConfirmDialog
        open={deletingEvent !== null}
        title="Remover Evento"
        description={`Tem a certeza que pretende remover o evento "${deletingEvent?.title ?? ''}"?`}
        onCancel={() => {
          setDeletingEvent(null);
        }}
        onConfirm={() => {
          if (deletingEvent) deleteMutation.mutate(deletingEvent.id);
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

const blockedPeriodSchema = z
  .object({
    reason: z.string().min(1, 'O motivo é obrigatório'),
    startDate: z.string().min(1, 'A data de início é obrigatória'),
    endDate: z.string().min(1, 'A data de fim é obrigatória'),
    scope: z.nativeEnum(BlockedPeriodScope),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'A data de fim deve ser igual ou posterior à data de início',
    path: ['endDate'],
  });

type BlockedPeriodForm = z.infer<typeof blockedPeriodSchema>;

function NewBlockedPeriodDialog({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();

  const methods = useForm<BlockedPeriodForm>({
    resolver: zodResolver(blockedPeriodSchema),
    defaultValues: {
      reason: '',
      startDate: '',
      endDate: '',
      scope: BlockedPeriodScope.ALL,
    },
  });

  const createMutation = useMutation({
    mutationFn: (values: BlockedPeriodForm) => createBlockedPeriod(values),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-blocked-periods'] });
      onOpenChange(false);
      methods.reset();
    },
  });

  const onSubmit = (values: BlockedPeriodForm): void => {
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
          <DialogTitle>Novo Período Bloqueado</DialogTitle>
        </DialogHeader>
        <FormProvider {...methods}>
          <form
            onSubmit={(event) => void methods.handleSubmit(onSubmit)(event)}
            className="space-y-4"
          >
            <FormField name="reason" label="Motivo" />
            <div className="grid gap-4 sm:grid-cols-2">
              <FormField name="startDate" label="Data de início" type="date" />
              <FormField name="endDate" label="Data de fim" type="date" />
            </div>
            <div className="space-y-2">
              <Label htmlFor="scope">Âmbito</Label>
              <select
                id="scope"
                {...methods.register('scope')}
                className="flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              >
                {Object.values(BlockedPeriodScope).map((value) => (
                  <option key={value} value={value}>
                    {blockedScopeLabels[value]}
                  </option>
                ))}
              </select>
            </div>
            {createMutation.isError && (
              <p className="text-sm text-red-600">Ocorreu um erro ao criar o período bloqueado.</p>
            )}
            <DialogFooter>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? <LoadingSpinner size={16} /> : 'Criar Bloqueio'}
              </Button>
            </DialogFooter>
          </form>
        </FormProvider>
      </DialogContent>
    </Dialog>
  );
}

function BlockedPeriodsTab(): React.JSX.Element {
  const [dialogOpen, setDialogOpen] = React.useState(false);
  const [deletingPeriod, setDeletingPeriod] = React.useState<BlockedPeriod | null>(null);
  const queryClient = useQueryClient();

  const { data: periods, isLoading } = useQuery({
    queryKey: ['calendar-blocked-periods'],
    queryFn: fetchBlockedPeriods,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteBlockedPeriod(id),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['calendar-blocked-periods'] });
      setDeletingPeriod(null);
    },
  });

  const columns: Column<BlockedPeriod>[] = [
    { key: 'reason', header: 'Motivo', cell: (row) => row.reason },
    { key: 'startDate', header: 'Data Início', cell: (row) => row.startDate },
    { key: 'endDate', header: 'Data Fim', cell: (row) => row.endDate },
    { key: 'scope', header: 'Âmbito', cell: (row) => blockedScopeLabels[row.scope] },
    {
      key: 'actions',
      header: '',
      cell: (row) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setDeletingPeriod(row);
          }}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      ),
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
          Novo Bloqueio
        </Button>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <LoadingSpinner size={32} />
        </div>
      ) : (
        <DataTable
          data={periods ?? []}
          columns={columns}
          keyExtractor={(row) => row.id}
          pageSize={15}
        />
      )}

      <NewBlockedPeriodDialog open={dialogOpen} onOpenChange={setDialogOpen} />

      <ConfirmDialog
        open={deletingPeriod !== null}
        title="Remover Período Bloqueado"
        description={`Tem a certeza que pretende remover o bloqueio "${deletingPeriod?.reason ?? ''}"?`}
        onCancel={() => {
          setDeletingPeriod(null);
        }}
        onConfirm={() => {
          if (deletingPeriod) deleteMutation.mutate(deletingPeriod.id);
        }}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
}

export function CalendarPage(): React.JSX.Element {
  const permissions = useAuthStore((state) => state.permissions);
  const isAdmin = permissions.includes('admin:*') || permissions.some((p) => p.startsWith('admin'));

  return (
    <div>
      <PageHeader
        title="Calendário Organizacional"
        description="Feriados, aniversários, eventos e ausências aprovadas"
      />

      {isAdmin ? (
        <Tabs defaultValue="calendar">
          <TabsList>
            <TabsTrigger value="calendar">Calendário</TabsTrigger>
            <TabsTrigger value="holidays">Feriados</TabsTrigger>
            <TabsTrigger value="events">Eventos</TabsTrigger>
            <TabsTrigger value="blocked">Bloqueios</TabsTrigger>
          </TabsList>
          <TabsContent value="calendar">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Vista Mensal</CardTitle>
              </CardHeader>
              <CardContent>
                <CalendarTab />
              </CardContent>
            </Card>
          </TabsContent>
          <TabsContent value="holidays">
            <HolidaysTab />
          </TabsContent>
          <TabsContent value="events">
            <EventsTab />
          </TabsContent>
          <TabsContent value="blocked">
            <BlockedPeriodsTab />
          </TabsContent>
        </Tabs>
      ) : (
        <CalendarTab />
      )}
    </div>
  );
}
