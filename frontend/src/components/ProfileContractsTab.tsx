import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { updateMyContract } from '@/api/contracts.api';
import { DateTextField } from '@/components/DateTextField';
import type { EmployeeContract, UpdateMyContractRequest } from '@/types/contracts';

const contractTypeLabels: Record<EmployeeContract['contractType'], string> = {
  permanent: 'Sem termo',
  fixed_term: 'Termo certo',
  freelancer: 'Prestação de serviços',
  b2b: 'B2B',
};

const contractStatusLabels: Record<EmployeeContract['status'], string> = {
  draft: 'Rascunho',
  active: 'Em vigor',
  expired: 'Expirado',
  terminated: 'Terminado',
};

function formatDate(value: string | null): string {
  return value
    ? new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(
        new Date(`${value.slice(0, 10)}T00:00:00`),
      )
    : 'Não informado';
}

function ContractEditor({
  contract,
  onCancel,
}: {
  contract: EmployeeContract;
  onCancel: () => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState<UpdateMyContractRequest>({
    contractType: contract.contractType,
    status: contract.status,
    startDate: contract.startDate,
    endDate: contract.endDate ?? undefined,
    value: contract.value ?? undefined,
    monthlyCost: contract.monthlyCost ?? undefined,
    currency: contract.currency,
    contractingEntity: contract.contractingEntity,
  });
  const mutation = useMutation({
    mutationFn: () => updateMyContract(contract.id, form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['profile-contracts'] });
      await queryClient.invalidateQueries({ queryKey: ['my-employee-profile'] });
      onCancel();
    },
  });
  const setText =
    (field: keyof UpdateMyContractRequest) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      setForm((current) => ({ ...current, [field]: event.target.value }));
    };
  const setDate =
    (field: 'startDate' | 'endDate') =>
    (isoDate: string): void => {
      setForm((current) => ({ ...current, [field]: isoDate || undefined }));
    };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
      <Typography component="h2" variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        Editar contrato
      </Typography>
      <Box
        component="form"
        onSubmit={(event: React.FormEvent<HTMLFormElement>) => {
          event.preventDefault();
          mutation.mutate();
        }}
      >
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              md: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          <TextField
            select
            size="small"
            label="Tipo de contrato"
            value={form.contractType ?? ''}
            onChange={setText('contractType')}
          >
            {Object.entries(contractTypeLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Estado"
            value={form.status ?? ''}
            onChange={setText('status')}
          >
            {Object.entries(contractStatusLabels).map(([value, label]) => (
              <MenuItem key={value} value={value}>
                {label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            required
            size="small"
            label="Entidade contratante"
            value={form.contractingEntity ?? ''}
            onChange={setText('contractingEntity')}
          />
          <DateTextField
            required
            size="small"
            label="Data de início"
            value={form.startDate}
            onChange={setDate('startDate')}
          />
          <DateTextField
            size="small"
            label="Data de fim"
            value={form.endDate}
            onChange={setDate('endDate')}
          />
          <TextField
            size="small"
            label="Moeda"
            value={form.currency ?? ''}
            onChange={setText('currency')}
          />
          <TextField
            size="small"
            type="number"
            label="Compensação mensal"
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            value={form.monthlyCost ?? ''}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                monthlyCost: event.target.value === '' ? undefined : Number(event.target.value),
              }));
            }}
          />
          <TextField
            size="small"
            type="number"
            label="Valor contratual"
            slotProps={{ htmlInput: { min: 0, step: 0.01 } }}
            value={form.value ?? ''}
            onChange={(event) => {
              setForm((current) => ({
                ...current,
                value: event.target.value === '' ? undefined : Number(event.target.value),
              }));
            }}
          />
        </Box>
        {mutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Não foi possível atualizar o contrato.
          </Alert>
        )}
        <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={mutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={mutation.isPending}>
            {mutation.isPending ? 'A guardar…' : 'Guardar'}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}

export function ProfileContractsTab({
  contracts,
  canEdit,
}: {
  contracts: EmployeeContract[];
  canEdit: boolean;
}): React.JSX.Element {
  const [editingId, setEditingId] = React.useState<string | null>(null);

  if (editingId) {
    const contract = contracts.find((item) => item.id === editingId);
    if (contract) {
      return (
        <ContractEditor
          contract={contract}
          onCancel={() => {
            setEditingId(null);
          }}
        />
      );
    }
  }

  if (contracts.length === 0) {
    return (
      <Paper variant="outlined" sx={{ borderRadius: 2, p: 2.5 }}>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
          Contratos
        </Typography>
        <Typography color="text.secondary" variant="body2" sx={{ mt: 1 }}>
          Não há contratos associados ao seu perfil.
        </Typography>
      </Paper>
    );
  }

  return (
    <Stack spacing={2}>
      {contracts.map((contract) => (
        <Paper key={contract.id} variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 } }}>
          <Stack
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1}
            sx={{ mb: 2, alignItems: { sm: 'center' }, justifyContent: 'space-between' }}
          >
            <Box>
              <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
                {contract.status === 'active' ? 'Condições em curso' : 'Contrato'}
              </Typography>
              <Typography color="text.secondary" variant="body2">
                Em vigor desde {formatDate(contract.startDate)}
              </Typography>
            </Box>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Chip
                size="small"
                label={contractStatusLabels[contract.status]}
                color={contract.status === 'active' ? 'success' : 'default'}
                variant="outlined"
              />
              {canEdit && (
                <Button
                  size="small"
                  variant="outlined"
                  onClick={() => {
                    setEditingId(contract.id);
                  }}
                >
                  Editar
                </Button>
              )}
            </Stack>
          </Stack>
          <Divider sx={{ mb: 2 }} />
          <Box
            sx={{
              display: 'grid',
              gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, minmax(0, 1fr))' },
              gap: 2.5,
            }}
          >
            <Typography variant="body2">
              <strong>Tipo</strong>
              <br />
              {contractTypeLabels[contract.contractType]}
            </Typography>
            <Typography variant="body2">
              <strong>Data de início</strong>
              <br />
              {formatDate(contract.startDate)}
            </Typography>
            <Typography variant="body2">
              <strong>Data de fim</strong>
              <br />
              {formatDate(contract.endDate)}
            </Typography>
            <Typography variant="body2">
              <strong>Entidade</strong>
              <br />
              {contract.legalEntity?.name ?? contract.contractingEntity}
            </Typography>
            <Typography variant="body2">
              <strong>Compensação mensal</strong>
              <br />
              {contract.monthlyCost === null
                ? 'Não informado'
                : new Intl.NumberFormat('pt-PT', {
                    style: 'currency',
                    currency: contract.currency,
                  }).format(contract.monthlyCost)}
            </Typography>
            <Typography variant="body2">
              <strong>Valor contratual</strong>
              <br />
              {contract.value === null
                ? 'Não informado'
                : new Intl.NumberFormat('pt-PT', {
                    style: 'currency',
                    currency: contract.currency,
                  }).format(contract.value)}
            </Typography>
          </Box>
        </Paper>
      ))}
    </Stack>
  );
}
