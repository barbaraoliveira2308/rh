import React from 'react';
import {
  Alert,
  CircularProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Typography,
} from '@mui/material';
import { useQuery } from '@tanstack/react-query';
import { fetchPolicyAcceptanceLogs } from '@/api/policies.api';
import { getApiErrorMessage } from '@/lib/api-error';

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
        <TableContainer component={Paper}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Utilizador</TableCell>
                <TableCell>Política</TableCell>
                <TableCell>Versão</TableCell>
                <TableCell>Data do aceite</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {logs.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>
                    {log.user.username} ({log.user.email})
                  </TableCell>
                  <TableCell>{log.policy.title}</TableCell>
                  <TableCell>{log.policyVersion}</TableCell>
                  <TableCell>{new Date(log.acceptedAt).toLocaleString('pt-PT')}</TableCell>
                </TableRow>
              ))}
              {logs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4}>Ainda não existem registos de aceite.</TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      )}
    </section>
  );
}
