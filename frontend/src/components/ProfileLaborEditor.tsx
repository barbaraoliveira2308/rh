import * as React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import {
  fetchDepartments,
  fetchEmployees,
  fetchJobTitles,
  updateMyEmployee,
} from '@/api/users.api';
import { DateTextField } from '@/components/DateTextField';
import {
  EmployeeStatus,
  type SelfEmployeeProfile,
  type UpdateMyProfileRequest,
} from '@/types/users';

const statusLabels: Record<EmployeeStatus, string> = {
  [EmployeeStatus.ACTIVE]: 'Ativo',
  [EmployeeStatus.INACTIVE]: 'Inativo',
  [EmployeeStatus.ON_LEAVE]: 'Em licença',
};

export function ProfileLaborEditor({
  employee,
  onCancel,
}: {
  employee: SelfEmployeeProfile;
  onCancel: () => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const [form, setForm] = React.useState<UpdateMyProfileRequest>({
    employeeNumber: employee.employeeNumber,
    departmentId: employee.departmentId,
    jobTitleId: employee.jobTitleId,
    managerId: employee.managerId,
    employmentStartDate: employee.employmentStartDate,
    employmentEndDate: employee.employmentEndDate,
    status: employee.status,
    workLocation: employee.workLocation,
    absenceApproverId: employee.profileDetails?.absenceApproverId,
  });
  const departmentsQuery = useQuery({ queryKey: ['departments'], queryFn: fetchDepartments });
  const jobTitlesQuery = useQuery({ queryKey: ['jobTitles'], queryFn: fetchJobTitles });
  const employeesQuery = useQuery({
    queryKey: ['profile-employment-options'],
    queryFn: () => fetchEmployees({ status: EmployeeStatus.ACTIVE, limit: 100 }),
  });
  const updateMutation = useMutation({
    mutationFn: () => updateMyEmployee(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-employee-profile'] });
      onCancel();
    },
  });

  const setText =
    (field: keyof UpdateMyProfileRequest) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value === '' ? null : event.target.value,
      }));
    };
  const setDate =
    (field: 'employmentStartDate' | 'employmentEndDate') =>
    (isoDate: string): void => {
      setForm((current) => ({ ...current, [field]: isoDate || null }));
    };
  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    updateMutation.mutate();
  };
  const employees = (employeesQuery.data?.data ?? []).filter((option) => option.id !== employee.id);

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 } }}>
      <Typography component="h2" variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        Editar detalhes laborais
      </Typography>
      <Box component="form" onSubmit={onSubmit}>
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: '1fr',
              sm: 'repeat(2, minmax(0, 1fr))',
              lg: 'repeat(3, minmax(0, 1fr))',
            },
            gap: 2,
          }}
        >
          <TextField
            size="small"
            label="Número de colaborador"
            value={form.employeeNumber ?? ''}
            onChange={setText('employeeNumber')}
          />
          <TextField
            select
            size="small"
            label="Estado"
            value={form.status ?? EmployeeStatus.ACTIVE}
            onChange={(event) => {
              setForm((current) => ({ ...current, status: event.target.value as EmployeeStatus }));
            }}
          >
            {Object.values(EmployeeStatus).map((status) => (
              <MenuItem key={status} value={status}>
                {statusLabels[status]}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="Local de trabalho"
            value={form.workLocation ?? ''}
            onChange={setText('workLocation')}
          />
          <DateTextField
            required
            size="small"
            label="Data de início"
            value={form.employmentStartDate}
            onChange={setDate('employmentStartDate')}
          />
          <DateTextField
            size="small"
            label="Data de fim"
            value={form.employmentEndDate}
            onChange={setDate('employmentEndDate')}
          />
          <TextField
            select
            size="small"
            label="Departamento"
            value={form.departmentId ?? ''}
            onChange={setText('departmentId')}
          >
            <MenuItem value="">Sem departamento</MenuItem>
            {(departmentsQuery.data ?? []).map((department) => (
              <MenuItem key={department.id} value={department.id}>
                {department.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Cargo"
            value={form.jobTitleId ?? ''}
            onChange={setText('jobTitleId')}
          >
            <MenuItem value="">Sem cargo</MenuItem>
            {(jobTitlesQuery.data ?? []).map((jobTitle) => (
              <MenuItem key={jobTitle.id} value={jobTitle.id}>
                {jobTitle.name}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Gestor direto"
            value={form.managerId ?? ''}
            onChange={setText('managerId')}
          >
            <MenuItem value="">Sem gestor</MenuItem>
            {employees.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.firstName} {option.lastName}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            select
            size="small"
            label="Aprovador de ausências"
            value={form.absenceApproverId ?? ''}
            onChange={setText('absenceApproverId')}
          >
            <MenuItem value="">Usar fluxo padrão</MenuItem>
            {employees.map((option) => (
              <MenuItem key={option.id} value={option.id}>
                {option.firstName} {option.lastName}
              </MenuItem>
            ))}
          </TextField>
        </Box>
        {updateMutation.isError && (
          <Alert severity="error" sx={{ mt: 2 }}>
            Não foi possível guardar os detalhes laborais.
          </Alert>
        )}
        <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={updateMutation.isPending}>
            Cancelar
          </Button>
          <Button type="submit" variant="contained" disabled={updateMutation.isPending}>
            {updateMutation.isPending ? 'A guardar…' : 'Guardar'}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}
