import React from 'react';
import { Alert, CircularProgress, Typography } from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchPolicyAcceptanceLogs } from '@/api/policies.api';
import { getApiErrorMessage } from '@/lib/api-error';
import { ReusableDataGrid } from '@/components/ReusableDataGrid';
import type { GridColDef } from '@mui/x-data-grid';
import type { PolicyAcceptanceLog } from '@/types/policies';

export function PolicyAcceptanceLogTable(): React.JSX.Element {
  const {
    data: logs = [],
    isLoading,
    error,
    isError,
  } = useQuery({
    queryKey: ['policies', 'acceptance', 'logs'],
    queryFn: fetchPolicyAcceptanceLogs,
  });

  const categoryOptions = React.useMemo(
    () => [...new Set(logs.map((log) => log.policy.category))].sort(),
    [logs],
  );

  const columns = React.useMemo<GridColDef<PolicyAcceptanceLog>[]>(
    () => [
      {
        field: 'userName',
        headerName: 'Utilizador',
        flex: 1.2,
        valueGetter: (_, row) => `${row.user.username} (${row.user.email})`,
      },
      {
        field: 'policyTitle',
        headerName: 'Política',
        flex: 1,
        valueGetter: (_, row) => row.policy.title,
      },
      {
        field: 'category',
        headerName: 'Categoria',
        type: 'singleSelect',
        flex: 0.8,
        valueGetter: (_, row) => row.policy.category,
        valueOptions: categoryOptions,
      },
      { field: 'policyVersion', headerName: 'Versão', width: 100 },
      {
        field: 'acceptedAt',
        headerName: 'Data do aceite',
        flex: 1,
        valueFormatter: (value) => new Date(String(value)).toLocaleString('pt-PT'),
      },
    ],
    [categoryOptions],
  );

  return (
    <section>
      <Typography variant="h5" sx={{ mb: 1.5 }}>
        Registo de leitura e aceite
      </Typography>
      {isLoading && <CircularProgress size={24} />}
      {isError && (
        <Alert severity="error">
          {getApiErrorMessage(error, 'Não foi possível carregar os logs de aceite.')}
        </Alert>
      )}
      {!isLoading && !isError && (
        <ReusableDataGrid
          rows={logs}
          columns={columns}
          getRowId={(row) => row.id}
          autoHeight
          disableRowSelectionOnClick
          pageSizeOptions={[10, 25, 50]}
          initialState={{ pagination: { paginationModel: { pageSize: 10, page: 0 } } }}
        />
      )}
    </section>
  );
}
