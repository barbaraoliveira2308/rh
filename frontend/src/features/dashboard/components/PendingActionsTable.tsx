import * as React from 'react';
import ArrowForward from '@mui/icons-material/ArrowForward';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CardHeader from '@mui/material/CardHeader';
import Chip from '@mui/material/Chip';
import CircularProgress from '@mui/material/CircularProgress';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Typography from '@mui/material/Typography';
import { WorkflowItemPriority, type WorkflowItem } from '@/types/workflow';

const workflowTypeLabels: Record<string, string> = {
  TIMESHEET: 'Timesheet',
  ABSENCE: 'Pedido de ausência',
  EXPENSE: 'Reembolso de despesa',
};

function statusFor(item: WorkflowItem): { label: string; color: 'warning' | 'error' | 'info' } {
  if (item.isOverdue || item.priority === WorkflowItemPriority.URGENT)
    return { label: 'Urgente', color: 'error' };
  if (item.priority === WorkflowItemPriority.HIGH) return { label: 'Em análise', color: 'info' };
  return { label: 'Pendente', color: 'warning' };
}

export function PendingActionsTable({
  items,
  employeeNames,
  responsibleName,
  loading,
  error,
  onViewAll,
}: {
  items: WorkflowItem[];
  employeeNames: Map<string, string>;
  responsibleName: string;
  loading: boolean;
  error: boolean;
  onViewAll: () => void;
}): React.JSX.Element {
  return (
    <Card variant="outlined" sx={{ height: '100%', borderRadius: 1.5, boxShadow: 'none' }}>
      <CardHeader
        title="Ações pendentes"
        subheader="Aprovações e tarefas que exigem atenção"
        titleTypographyProps={{ variant: 'subtitle1', fontWeight: 700 }}
        subheaderTypographyProps={{ variant: 'body2' }}
        action={
          <Button size="small" endIcon={<ArrowForward />} onClick={onViewAll}>
            Ver todas
          </Button>
        }
      />
      <CardContent sx={{ pt: 0 }}>
        {loading ? (
          <Box sx={{ minHeight: 180, display: 'grid', placeItems: 'center' }}>
            <CircularProgress size={24} />
          </Box>
        ) : error ? (
          <Typography color="error" sx={{ py: 6, textAlign: 'center' }} variant="body2">
            Não foi possível carregar as pendências.
          </Typography>
        ) : items.length === 0 ? (
          <Box sx={{ py: 2, textAlign: 'center' }}>
            <Typography variant="caption" sx={{ fontWeight: 700 }}>
              Nenhuma ação pendente
            </Typography>
            <Typography
              color="text.secondary"
              variant="caption"
              sx={{ display: 'block', mt: 0.25 }}
            >
              As aprovações e tarefas aparecerão aqui.
            </Typography>
            <Button size="small" sx={{ mt: 0.5 }} onClick={onViewAll}>
              Consultar caixa de entrada
            </Button>
          </Box>
        ) : (
          <TableContainer sx={{ maxWidth: '100%' }}>
            <Table size="small" aria-label="Ações pendentes">
              <TableHead>
                <TableRow>
                  <TableCell>Colaborador</TableCell>
                  <TableCell>Tipo</TableCell>
                  <TableCell>Data</TableCell>
                  <TableCell>Responsável</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell align="right">Ação</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {items.slice(0, 6).map((item) => {
                  const status = statusFor(item);
                  return (
                    <TableRow key={item.id} hover>
                      <TableCell>{employeeNames.get(item.requesterId) ?? 'Colaborador'}</TableCell>
                      <TableCell>{workflowTypeLabels[item.type] ?? item.type}</TableCell>
                      <TableCell>
                        {item.requestedAt
                          ? new Intl.DateTimeFormat('pt-PT', { dateStyle: 'short' }).format(
                              new Date(item.requestedAt),
                            )
                          : '—'}
                      </TableCell>
                      <TableCell>{responsibleName || '—'}</TableCell>
                      <TableCell>
                        <Chip
                          size="small"
                          label={status.label}
                          color={status.color}
                          variant="outlined"
                        />
                      </TableCell>
                      <TableCell align="right">
                        <Button size="small" onClick={onViewAll}>
                          Ver
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
}
