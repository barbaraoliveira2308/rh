import * as React from 'react';
import dayjs from 'dayjs';
import { useNavigate } from 'react-router-dom';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { PageHeader } from '@/components/PageHeader';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { FormField } from '@/components/FormField';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Label } from '@/components/ui/label';
import { cn } from '@/lib/utils';
import { useAuthStore } from '@/stores/auth.store';
import { fetchAbsenceTypes, fetchLeaveBalance, createAbsence } from '@/api/absences.api';
import type { AbsenceType, LeaveBalance } from '@/types/absences';

const absenceSchema = z
  .object({
    absenceTypeId: z.string().min(1, 'O tipo de ausência é obrigatório'),
    startDate: z.string().min(1, 'A data de início é obrigatória'),
    endDate: z.string().min(1, 'A data de fim é obrigatória'),
    startHalf: z.boolean(),
    endHalf: z.boolean(),
    reason: z.string().optional(),
  })
  .refine((data) => data.endDate >= data.startDate, {
    message: 'A data de fim deve ser igual ou posterior à data de início',
    path: ['endDate'],
  });

type AbsenceForm = z.infer<typeof absenceSchema>;

function computeRequestedDays(
  startDate: string,
  endDate: string,
  startHalf: boolean,
  endHalf: boolean,
): number {
  if (startDate === '' || endDate === '') {
    return 0;
  }

  const start = dayjs(startDate);
  const end = dayjs(endDate);

  if (!start.isValid() || !end.isValid() || end.isBefore(start, 'day')) {
    return 0;
  }

  let count = 0;
  let current = start.clone();

  while (!current.isAfter(end, 'day')) {
    const day = current.day();
    if (day !== 0 && day !== 6) {
      count += 1;
    }
    current = current.add(1, 'day');
  }

  if (startHalf) {
    count -= 0.5;
  }

  if (endHalf && !end.isSame(start, 'day')) {
    count -= 0.5;
  }

  return Math.max(0, count);
}

export function AbsenceNewPage(): React.JSX.Element {
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const currentYear = new Date().getFullYear();

  const [absenceTypes, setAbsenceTypes] = React.useState<AbsenceType[]>([]);
  const [loadingTypes, setLoadingTypes] = React.useState<boolean>(false);
  const [balance, setBalance] = React.useState<LeaveBalance | null>(null);
  const [loadingBalance, setLoadingBalance] = React.useState<boolean>(false);
  const [error, setError] = React.useState<string | null>(null);

  const methods = useForm<AbsenceForm>({
    resolver: zodResolver(absenceSchema),
    defaultValues: {
      absenceTypeId: '',
      startDate: '',
      endDate: '',
      startHalf: false,
      endHalf: false,
      reason: '',
    },
  });

  const { register, handleSubmit, watch, formState } = methods;
  const { isSubmitting } = formState;

  const [absenceTypeId, startDate, endDate, startHalf, endHalf] = watch([
    'absenceTypeId',
    'startDate',
    'endDate',
    'startHalf',
    'endHalf',
  ]);

  React.useEffect(() => {
    let cancelled = false;

    const loadTypes = async (): Promise<void> => {
      setLoadingTypes(true);
      try {
        const data = await fetchAbsenceTypes();
        if (!cancelled) {
          setAbsenceTypes(data);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar tipos de ausência');
        }
      } finally {
        if (!cancelled) {
          setLoadingTypes(false);
        }
      }
    };

    void loadTypes();

    return (): void => {
      cancelled = true;
    };
  }, []);

  React.useEffect(() => {
    if (absenceTypeId === '' || user === null) {
      setBalance(null);
      return;
    }

    let cancelled = false;

    const loadBalance = async (): Promise<void> => {
      setLoadingBalance(true);
      try {
        const balances = await fetchLeaveBalance(user.id, currentYear);
        const selected = balances.find((b) => b.absenceTypeId === absenceTypeId) ?? null;
        if (!cancelled) {
          setBalance(selected);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Erro ao carregar saldo');
        }
      } finally {
        if (!cancelled) {
          setLoadingBalance(false);
        }
      }
    };

    void loadBalance();

    return (): void => {
      cancelled = true;
    };
  }, [absenceTypeId, currentYear, user]);

  const requestedDays = React.useMemo(
    () => computeRequestedDays(startDate, endDate, startHalf, endHalf),
    [startDate, endDate, startHalf, endHalf],
  );

  const remainingDays = balance?.remainingDays ?? 0;
  const hasInsufficientBalance =
    balance !== null && requestedDays > 0 && requestedDays > remainingDays;

  const onSubmit = async (data: AbsenceForm): Promise<void> => {
    setError(null);
    try {
      await createAbsence(data);
      void navigate('/absences');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erro ao criar pedido de ausência');
    }
  };

  const selectClassName = cn(
    'flex h-10 w-full rounded-md border border-border bg-background px-3 py-2 text-sm',
    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2',
  );

  return (
    <div>
      <PageHeader title="Nova ausência" description="Submeter um novo pedido de ausência" />

      <Card className="max-w-2xl">
        <CardHeader>
          <CardTitle>Dados do pedido</CardTitle>
        </CardHeader>
        <CardContent>
          {loadingTypes ? (
            <div className="flex h-40 items-center justify-center">
              <LoadingSpinner size={32} />
            </div>
          ) : (
            <FormProvider {...methods}>
              <form onSubmit={(e) => void handleSubmit(onSubmit)(e)} className="space-y-6">
                {error && <p className="text-sm text-red-600">{error}</p>}

                <div className="space-y-2">
                  <Label htmlFor="absenceTypeId">Tipo de ausência</Label>
                  <select
                    id="absenceTypeId"
                    {...register('absenceTypeId')}
                    className={selectClassName}
                  >
                    <option value="">Selecionar tipo</option>
                    {absenceTypes.map((type) => (
                      <option key={type.id} value={type.id}>
                        {type.name}
                      </option>
                    ))}
                  </select>
                  {formState.errors.absenceTypeId && (
                    <p className="text-sm text-red-600">{formState.errors.absenceTypeId.message}</p>
                  )}
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <FormField name="startDate" label="Data de início" type="date" />
                  <FormField name="endDate" label="Data de fim" type="date" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="flex items-center gap-2">
                    <input
                      id="startHalf"
                      type="checkbox"
                      {...register('startHalf')}
                      className="h-4 w-4 rounded border-border"
                    />
                    <Label htmlFor="startHalf" className="font-normal">
                      Meio dia no início
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <input
                      id="endHalf"
                      type="checkbox"
                      {...register('endHalf')}
                      className="h-4 w-4 rounded border-border"
                    />
                    <Label htmlFor="endHalf" className="font-normal">
                      Meio dia no fim
                    </Label>
                  </div>
                </div>

                <FormField
                  name="reason"
                  label="Motivo"
                  placeholder="Motivo da ausência (opcional)"
                />

                <div className="rounded-md border p-4">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Dias solicitados:</span>
                    <span className="font-medium">{String(requestedDays)}</span>
                  </div>
                  <div className="mt-2 flex items-center justify-between text-sm">
                    <span className="text-muted-foreground">Dias disponíveis:</span>
                    <span className="font-medium">
                      {loadingBalance ? (
                        <LoadingSpinner size={16} />
                      ) : balance === null ? (
                        '-'
                      ) : (
                        String(remainingDays)
                      )}
                    </span>
                  </div>
                  {hasInsufficientBalance && (
                    <p className="mt-2 text-sm font-medium text-amber-600">
                      Atenção: os dias solicitados excedem o saldo disponível.
                    </p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => {
                      void navigate('/absences');
                    }}
                  >
                    Cancelar
                  </Button>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? <LoadingSpinner size={16} /> : 'Submeter'}
                  </Button>
                </div>
              </form>
            </FormProvider>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
