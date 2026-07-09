import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Plus, Trash2, AlertTriangle } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { fetchExpenseCategories, createExpenseReport } from '@/api/expenses.api';
import type { ExpenseCategory } from '@/types/expenses';

interface ItemForm {
  tempId: string;
  categoryId: string;
  description: string;
  amount: number;
  expenseDate: string;
  receiptFile: File | null;
}

function createTempId(): string {
  return Math.random().toString(36).substring(2, 10);
}

export function ExpenseNewPage(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [title, setTitle] = React.useState('');
  const [periodStart, setPeriodStart] = React.useState('');
  const [periodEnd, setPeriodEnd] = React.useState('');
  const [notes, setNotes] = React.useState('');
  const [items, setItems] = React.useState<ItemForm[]>([]);
  const [duplicateWarnings, setDuplicateWarnings] = React.useState<Set<string>>(new Set());

  const { data: categories } = useQuery({
    queryKey: ['expense-categories'],
    queryFn: () => fetchExpenseCategories(),
  });

  const createMutation = useMutation({
    mutationFn: () =>
      createExpenseReport({ title, periodStart, periodEnd, notes: notes || undefined }),
    onSuccess: (_report) => {
      void queryClient.invalidateQueries({ queryKey: ['expenses'] });
      void navigate('/expenses');
    },
  });

  const addItem = (): void => {
    const newItem: ItemForm = {
      tempId: createTempId(),
      categoryId: '',
      description: '',
      amount: 0,
      expenseDate: '',
      receiptFile: null,
    };
    setItems((prev) => [...prev, newItem]);
  };

  const removeItem = (tempId: string): void => {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
  };

  const updateItem = (
    tempId: string,
    field: keyof ItemForm,
    value: string | number | File | null,
  ): void => {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? { ...i, [field]: value } : i)));
  };

  const checkDuplicates = (): void => {
    const warnings = new Set<string>();
    const currentItems = items;
    for (let i = 0; i < currentItems.length; i++) {
      const itemA = currentItems[i];
      if (!itemA) continue;
      for (let j = i + 1; j < currentItems.length; j++) {
        const itemB = currentItems[j];
        if (!itemB) continue;
        if (
          itemA.categoryId &&
          itemA.categoryId === itemB.categoryId &&
          itemA.amount > 0 &&
          itemB.amount > 0
        ) {
          const diff = Math.abs(itemA.amount - itemB.amount) / Math.max(itemA.amount, itemB.amount);
          if (diff <= 0.05) {
            warnings.add(itemA.tempId);
            warnings.add(itemB.tempId);
          }
        }
      }
    }
    setDuplicateWarnings(warnings);
  };

  const handleSubmit = (): void => {
    checkDuplicates();
    if (title && periodStart && periodEnd) {
      createMutation.mutate();
    }
  };

  const handleSubmitForApproval = (): void => {
    checkDuplicates();
    if (title && periodStart && periodEnd) {
      createMutation.mutate();
    }
  };

  const totalAmount = items.reduce((sum, item) => sum + (item.amount || 0), 0);

  return (
    <div>
      <PageHeader
        title="Novo Relatório de Despesas"
        description="Preencha os dados do relatório e adicione os items de despesa"
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Informação do Relatório</h3>
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="sm:col-span-2">
                <Label htmlFor="title">Título</Label>
                <Input
                  id="title"
                  value={title}
                  onChange={(e) => {
                    setTitle(e.target.value);
                  }}
                  placeholder="Ex: Despesas de viagem a Lisboa"
                />
              </div>
              <div>
                <Label htmlFor="periodStart">Início do Período</Label>
                <Input
                  id="periodStart"
                  type="date"
                  value={periodStart}
                  onChange={(e) => {
                    setPeriodStart(e.target.value);
                  }}
                />
              </div>
              <div>
                <Label htmlFor="periodEnd">Fim do Período</Label>
                <Input
                  id="periodEnd"
                  type="date"
                  value={periodEnd}
                  onChange={(e) => {
                    setPeriodEnd(e.target.value);
                  }}
                />
              </div>
              <div className="sm:col-span-2">
                <Label htmlFor="notes">Notas (opcional)</Label>
                <Input
                  id="notes"
                  value={notes}
                  onChange={(e) => {
                    setNotes(e.target.value);
                  }}
                  placeholder="Observações adicionais"
                />
              </div>
            </div>
          </div>

          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-semibold">Items de Despesa</h3>
              <Button variant="outline" size="sm" onClick={addItem}>
                <Plus className="mr-1 h-4 w-4" /> Adicionar Item
              </Button>
            </div>

            {items.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">
                Nenhum item adicionado. Clique em "Adicionar Item" para começar.
              </p>
            ) : (
              <div className="space-y-4">
                {items.map((item, index) => {
                  const hasDuplicate = duplicateWarnings.has(item.tempId);
                  return (
                    <div
                      key={item.tempId}
                      className={`rounded-md border p-4 ${hasDuplicate ? 'border-amber-400 bg-amber-50' : ''}`}
                    >
                      <div className="mb-2 flex items-center justify-between">
                        <span className="text-sm font-medium text-muted-foreground">
                          Item #{index + 1}
                        </span>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => {
                            removeItem(item.tempId);
                          }}
                        >
                          <Trash2 className="h-4 w-4 text-red-500" />
                        </Button>
                      </div>
                      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                        <div>
                          <Label>Categoria</Label>
                          <Select
                            value={item.categoryId}
                            onValueChange={(v) => {
                              updateItem(item.tempId, 'categoryId', v);
                            }}
                          >
                            <SelectTrigger>
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {(categories ?? []).map((cat: ExpenseCategory) => (
                                <SelectItem key={cat.id} value={cat.id}>
                                  {cat.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div>
                          <Label>Descrição</Label>
                          <Input
                            value={item.description}
                            onChange={(e) => {
                              updateItem(item.tempId, 'description', e.target.value);
                            }}
                            placeholder="Descrição"
                          />
                        </div>
                        <div>
                          <Label>Valor (€)</Label>
                          <Input
                            type="number"
                            step="0.01"
                            min="0"
                            value={item.amount || ''}
                            onChange={(e) => {
                              updateItem(item.tempId, 'amount', Number(e.target.value));
                            }}
                            placeholder="0.00"
                          />
                        </div>
                        <div>
                          <Label>Data</Label>
                          <Input
                            type="date"
                            value={item.expenseDate}
                            onChange={(e) => {
                              updateItem(item.tempId, 'expenseDate', e.target.value);
                            }}
                          />
                        </div>
                        <div className="sm:col-span-2 lg:col-span-4">
                          <Label>Recibo</Label>
                          <div className="flex items-center gap-2">
                            <Input
                              type="file"
                              accept="image/*,.pdf"
                              onChange={(e) => {
                                const file = e.target.files?.[0] ?? null;
                                updateItem(item.tempId, 'receiptFile', file);
                              }}
                            />
                            {item.receiptFile && (
                              <span className="text-xs text-muted-foreground">
                                {item.receiptFile.name}
                              </span>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-lg border bg-card p-6 shadow-sm">
            <h3 className="mb-4 text-lg font-semibold">Resumo</h3>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Items</span>
                <span>{String(items.length)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-muted-foreground">Total</span>
                <span className="font-bold">{totalAmount.toFixed(2)} €</span>
              </div>
            </div>
          </div>

          {duplicateWarnings.size > 0 && (
            <div className="rounded-lg border border-amber-400 bg-amber-50 p-4">
              <div className="flex items-start gap-2">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                <p className="text-sm text-amber-800">
                  Foram detetados possíveis duplicados nos items assinalados. Verifique as
                  categorias e valores antes de submeter.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col gap-3">
            <Button
              onClick={() => {
                handleSubmit();
              }}
              disabled={!title || !periodStart || !periodEnd || createMutation.isPending}
              className="w-full"
            >
              {createMutation.isPending ? 'A criar...' : 'Guardar Rascunho'}
            </Button>
            <Button
              variant="outline"
              onClick={() => {
                handleSubmitForApproval();
              }}
              disabled={
                !title ||
                !periodStart ||
                !periodEnd ||
                items.length === 0 ||
                createMutation.isPending
              }
              className="w-full"
            >
              Submeter para Aprovação
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
