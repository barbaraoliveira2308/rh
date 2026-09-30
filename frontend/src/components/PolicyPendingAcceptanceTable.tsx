import React from 'react';
import { Alert, CircularProgress, Typography } from '@mui/material';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchPendingAcceptanceUsers, remindPolicyAcceptance } from '@/api/policies.api';
import { getApiErrorMessage } from '@/lib/api-error';
import { ReusableDataGrid } from '@/components/ReusableDataGrid';
import { Button } from '@/components/ui/button';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { GridColDef } from '@mui/x-data-grid';
import type { PendingAcceptanceUser } from '@/types/policies';

export function PolicyPendingAcceptanceTable(): React.JSX.Element {
  const queryClient = useQueryClient();
  const [remindedUserId, setRemindedUserId] = React.useState<string | null>(null);

  const {
    data: pendingUsers = [],
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ['policies', 'acceptance', 'pending-users'],
    queryFn: fetchPendingAcceptanceUsers,
  });

  const remindMutation = useMutation({
    mutationFn: (userId: string) => remindPolicyAcceptance(userId),
    onMutate: (userId: string) => {
      setRemindedUserId(userId);
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['policies', 'acceptance', 'pending-users'] });
    },
    onSettled: () => {
      setRemindedUserId(null);
    },
  });

  const columns = React.useMemo<GridColDef<PendingAcceptanceUser>[]>(
    () => [
      {
        field: 'userName',
        headerName: 'Utilizador',
        flex: 1.2,
        valueGetter: (_, row) => `${row.username} (${row.email})`,
      },
      {
        field: 'pendingPolicies',
        headerName: 'Políticas pendentes',
        flex: 1.6,
        valueGetter: (_, row) => row.pendingPolicies.map((policy) => policy.title).join(', '),
      },
      {
        field: 'pendingCount',
        headerName: 'Nº pendentes',
        width: 130,
        valueGetter: (_, row) => row.pendingPolicies.length,
      },
      {
        field: 'actions',
        headerName: '',
        sortable: false,
        filterable: false,
        width: 140,
        renderCell: (params) => (
          <Button
            variant="outline"
            size="sm"
            disabled={remindMutation.isPending && remindedUserId === params.row.userId}
            onClick={() => {
              remindMutation.mutate(params.row.userId);
            }}
          >
            {remindMutation.isPending && remindedUserId === params.row.userId ? (
              <LoadingSpinner size={16} />
            ) : (
              'Lembrar'
            )}
          </Button>
        ),
      },
    ],
    [remindMutation, remindedUserId],
  );

  return (
    <section>
      <Typography variant="h5" sx={{ mb: 1.5 }}>
        Utilizadores com políticas por aceitar
      </Typography>
      {isLoading && <CircularProgress size={24} />}
      {isError && (
        <Alert severity="error">
          {getApiErrorMessage(error, 'Não foi possível carregar os utilizadores pendentes.')}
        </Alert>
      )}
      {remindMutation.isError && (
        <Alert severity="error" sx={{ mb: 1.5 }}>
          {getApiErrorMessage(remindMutation.error, 'Não foi possível enviar o lembrete.')}
        </Alert>
      )}
      {!isLoading && !isError && (
        <ReusableDataGrid
          rows={pendingUsers}
          columns={columns}
          getRowId={(row) => row.userId}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
          localeText={{ noRowsLabel: 'Todos os utilizadores aceitaram as políticas publicadas.' }}
        />
      )}
    </section>
  );
}
