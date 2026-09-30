import * as React from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import FormControlLabel from '@mui/material/FormControlLabel';
import MenuItem from '@mui/material/MenuItem';
import Paper from '@mui/material/Paper';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import TextField from '@mui/material/TextField';
import Typography from '@mui/material/Typography';
import { updateMyEmployee } from '@/api/users.api';
import { DateTextField } from '@/components/DateTextField';
import type { SelfEmployeeProfile, UpdateMyProfileRequest } from '@/types/users';

function formatDate(value: string | null): string {
  if (!value) return 'Não informado';
  return new Intl.DateTimeFormat('pt-PT', { dateStyle: 'medium' }).format(
    new Date(`${value.slice(0, 10)}T00:00:00`),
  );
}

function ProfileField({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}): React.JSX.Element {
  return (
    <Box sx={{ minWidth: 0 }}>
      <Typography color="text.secondary" variant="caption">
        {label}
      </Typography>
      <Typography sx={{ overflowWrap: 'anywhere' }} variant="body2">
        {value ?? 'Não informado'}
      </Typography>
    </Box>
  );
}

function PersonalProfileEditor({
  employee,
  onCancel,
}: {
  employee: SelfEmployeeProfile;
  onCancel: () => void;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const details = employee.profileDetails;
  const [form, setForm] = React.useState<UpdateMyProfileRequest>({
    firstName: employee.firstName,
    lastName: employee.lastName,
    preferredName: details?.preferredName,
    pronouns: details?.pronouns,
    hideBirthday: details?.hideBirthday ?? false,
    birthDate: employee.birthDate,
    gender: employee.gender,
    nationality: employee.nationality,
    phone: employee.phone,
    personalEmail: employee.personalEmail,
    idDocumentType: details?.idDocumentType,
    idDocumentNumber: details?.idDocumentNumber,
    idDocumentExpiry: details?.idDocumentExpiry,
    socialSecurityNumber: details?.socialSecurityNumber,
    retirementRegime: details?.retirementRegime,
    nif: employee.nif,
    address: employee.address,
    addressLine2: details?.addressLine2,
    city: details?.city,
    postalCode: details?.postalCode,
    province: details?.province,
    country: details?.country,
    disabilityPercentage: details?.disabilityPercentage,
    emergencyContactName: details?.emergencyContactName,
    emergencyContactPhone: details?.emergencyContactPhone,
    bankAccountFormat: details?.bankAccountFormat ?? 'iban',
    iban: employee.iban,
    swiftBic: details?.swiftBic,
    irsPercentage: details?.irsPercentage,
  });

  const updateMutation = useMutation({
    mutationFn: () => updateMyEmployee(form),
    onSuccess: async () => {
      await queryClient.invalidateQueries({ queryKey: ['my-employee-profile'] });
      onCancel();
    },
  });

  const updateText =
    (field: keyof UpdateMyProfileRequest) =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value === '' ? null : event.target.value,
      }));
    };

  const updateNumber =
    (field: 'disabilityPercentage' | 'irsPercentage') =>
    (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>): void => {
      setForm((current) => ({
        ...current,
        [field]: event.target.value === '' ? null : Number(event.target.value),
      }));
    };
  const updateDate =
    (field: 'birthDate' | 'idDocumentExpiry') =>
    (isoDate: string): void => {
      setForm((current) => ({ ...current, [field]: isoDate || null }));
    };

  const onSubmit = (event: React.FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    updateMutation.mutate();
  };

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 } }}>
      <Typography component="h2" variant="subtitle1" sx={{ mb: 2, fontWeight: 700 }}>
        Editar dados pessoais
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
            required
            size="small"
            label="Nome"
            value={form.firstName ?? ''}
            onChange={updateText('firstName')}
          />
          <TextField
            required
            size="small"
            label="Apelido"
            value={form.lastName ?? ''}
            onChange={updateText('lastName')}
          />
          <TextField
            size="small"
            label="Nome social"
            value={form.preferredName ?? ''}
            onChange={updateText('preferredName')}
          />
          <TextField
            size="small"
            label="Pronomes"
            value={form.pronouns ?? ''}
            onChange={updateText('pronouns')}
          />
          <DateTextField
            required
            size="small"
            label="Data de nascimento"
            value={form.birthDate}
            onChange={updateDate('birthDate')}
          />
          <TextField
            select
            required
            size="small"
            label="Género"
            value={form.gender ?? ''}
            onChange={updateText('gender')}
          >
            {[
              { value: 'female', label: 'Feminino' },
              { value: 'male', label: 'Masculino' },
              { value: 'non_binary', label: 'Não binário' },
              { value: 'prefer_not_to_say', label: 'Prefiro não indicar' },
            ].map((option) => (
              <MenuItem key={option.value} value={option.value}>
                {option.label}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            required
            size="small"
            label="Nacionalidade"
            value={form.nationality ?? ''}
            onChange={updateText('nationality')}
          />
          <TextField
            size="small"
            label="Telefone"
            value={form.phone ?? ''}
            onChange={updateText('phone')}
          />
          <TextField
            size="small"
            type="email"
            label="E-mail para comunicações"
            value={form.personalEmail ?? ''}
            onChange={updateText('personalEmail')}
          />
          <TextField
            select
            size="small"
            label="Tipo de documento"
            value={form.idDocumentType ?? ''}
            onChange={updateText('idDocumentType')}
          >
            {['Cartão de cidadão', 'Passaporte', 'Autorização de residência', 'Outro'].map(
              (option) => (
                <MenuItem key={option} value={option}>
                  {option}
                </MenuItem>
              ),
            )}
          </TextField>
          <TextField
            size="small"
            label="Número do documento"
            value={form.idDocumentNumber ?? ''}
            onChange={updateText('idDocumentNumber')}
          />
          <DateTextField
            size="small"
            label="Validade do documento"
            value={form.idDocumentExpiry}
            onChange={updateDate('idDocumentExpiry')}
          />
          <TextField
            size="small"
            label="Número de Segurança Social"
            value={form.socialSecurityNumber ?? ''}
            onChange={updateText('socialSecurityNumber')}
          />
          <TextField size="small" label="NIF" value={form.nif ?? ''} onChange={updateText('nif')} />
          <TextField
            size="small"
            label="Regime de reforma"
            value={form.retirementRegime ?? ''}
            onChange={updateText('retirementRegime')}
          />
          <TextField
            size="small"
            label="Endereço 1"
            value={form.address ?? ''}
            onChange={updateText('address')}
          />
          <TextField
            size="small"
            label="Endereço 2"
            value={form.addressLine2 ?? ''}
            onChange={updateText('addressLine2')}
          />
          <TextField
            size="small"
            label="Cidade"
            value={form.city ?? ''}
            onChange={updateText('city')}
          />
          <TextField
            size="small"
            label="Código postal"
            value={form.postalCode ?? ''}
            onChange={updateText('postalCode')}
          />
          <TextField
            size="small"
            label="Estado / Província / Região"
            value={form.province ?? ''}
            onChange={updateText('province')}
          />
          <TextField
            size="small"
            label="País"
            value={form.country ?? ''}
            onChange={updateText('country')}
          />
          <TextField
            size="small"
            type="number"
            label="Incapacidade (%)"
            slotProps={{ htmlInput: { min: 0, max: 100, step: 0.01 } }}
            value={form.disabilityPercentage ?? ''}
            onChange={updateNumber('disabilityPercentage')}
          />
          <TextField
            size="small"
            label="Contacto de emergência"
            value={form.emergencyContactName ?? ''}
            onChange={updateText('emergencyContactName')}
          />
          <TextField
            size="small"
            label="Telefone de emergência"
            value={form.emergencyContactPhone ?? ''}
            onChange={updateText('emergencyContactPhone')}
          />
          <TextField
            select
            size="small"
            label="Formato da conta"
            value={form.bankAccountFormat ?? 'iban'}
            onChange={updateText('bankAccountFormat')}
          >
            {['iban', 'número de conta'].map((option) => (
              <MenuItem key={option} value={option}>
                {option.toUpperCase()}
              </MenuItem>
            ))}
          </TextField>
          <TextField
            size="small"
            label="IBAN / Número de conta"
            value={form.iban ?? ''}
            onChange={updateText('iban')}
          />
          <TextField
            size="small"
            label="SWIFT/BIC"
            value={form.swiftBic ?? ''}
            onChange={updateText('swiftBic')}
          />
          <TextField
            size="small"
            type="number"
            label="IRS (%)"
            slotProps={{ htmlInput: { min: 0, max: 100, step: 0.01 } }}
            value={form.irsPercentage ?? ''}
            onChange={updateNumber('irsPercentage')}
          />
        </Box>
        <FormControlLabel
          sx={{ mt: 1.5 }}
          control={
            <Switch
              checked={form.hideBirthday ?? false}
              onChange={(_event, checked) => {
                setForm((current) => ({ ...current, hideBirthday: checked }));
              }}
            />
          }
          label="Ocultar aniversário no calendário e nos resumos"
        />
        {updateMutation.isError && (
          <Alert severity="error" sx={{ mt: 1 }}>
            Não foi possível guardar os dados pessoais.
          </Alert>
        )}
        <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'flex-end' }}>
          <Button onClick={onCancel} disabled={updateMutation.isPending}>
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={updateMutation.isPending || !form.firstName?.trim() || !form.lastName?.trim()}
          >
            {updateMutation.isPending ? 'A guardar…' : 'Guardar'}
          </Button>
        </Stack>
      </Box>
    </Paper>
  );
}

export function ProfilePersonalTab({
  employee,
}: {
  employee: SelfEmployeeProfile;
}): React.JSX.Element {
  const [editing, setEditing] = React.useState(false);
  const details = employee.profileDetails;
  const absenceApprover = details?.absenceApprover
    ? `${details.absenceApprover.firstName} ${details.absenceApprover.lastName}`
    : 'Não informado';

  if (editing) {
    return (
      <PersonalProfileEditor
        employee={employee}
        onCancel={() => {
          setEditing(false);
        }}
      />
    );
  }

  return (
    <Paper variant="outlined" sx={{ borderRadius: 2, p: { xs: 2, sm: 2.5 } }}>
      <Stack direction="row" sx={{ mb: 2, alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography component="h2" variant="subtitle1" sx={{ fontWeight: 700 }}>
          Dados pessoais
        </Typography>
        <Button
          onClick={() => {
            setEditing(true);
          }}
          size="small"
          variant="outlined"
        >
          Editar dados pessoais
        </Button>
      </Stack>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr 1fr', md: 'repeat(3, minmax(0, 1fr))' },
          gap: 2.5,
        }}
      >
        <ProfileField label="Nome" value={employee.firstName} />
        <ProfileField label="Apelido" value={employee.lastName} />
        <ProfileField label="Nome social" value={details?.preferredName} />
        <ProfileField label="Pronomes" value={details?.pronouns} />
        <ProfileField label="Data de nascimento" value={formatDate(employee.birthDate)} />
        <ProfileField label="Aniversário oculto" value={details?.hideBirthday ? 'Sim' : 'Não'} />
        <ProfileField label="Género" value={employee.gender} />
        <ProfileField label="Nacionalidade" value={employee.nationality} />
        <ProfileField label="Telefone" value={employee.phone} />
        <ProfileField label="E-mail pessoal" value={employee.personalEmail} />
        <ProfileField label="Tipo de documento" value={details?.idDocumentType} />
        <ProfileField label="Número do documento" value={details?.idDocumentNumber} />
        <ProfileField
          label="Validade do documento"
          value={formatDate(details?.idDocumentExpiry ?? null)}
        />
        <ProfileField label="Número de Segurança Social" value={details?.socialSecurityNumber} />
        <ProfileField label="NIF" value={employee.nif} />
        <ProfileField label="Regime de reforma" value={details?.retirementRegime} />
        <ProfileField label="Endereço 1" value={employee.address} />
        <ProfileField label="Endereço 2" value={details?.addressLine2} />
        <ProfileField label="Cidade" value={details?.city} />
        <ProfileField label="Código postal" value={details?.postalCode} />
        <ProfileField label="Estado / Província / Região" value={details?.province} />
        <ProfileField label="País" value={details?.country} />
        <ProfileField
          label="Incapacidade"
          value={
            details?.disabilityPercentage === null || details?.disabilityPercentage === undefined
              ? null
              : `${String(details.disabilityPercentage)}%`
          }
        />
        <ProfileField label="Contacto de emergência" value={details?.emergencyContactName} />
        <ProfileField label="Telefone de emergência" value={details?.emergencyContactPhone} />
        <ProfileField label="Aprovador de ausências" value={absenceApprover} />
        <ProfileField label="Formato da conta" value={details?.bankAccountFormat} />
        <ProfileField label="IBAN" value={employee.iban} />
        <ProfileField label="SWIFT/BIC" value={details?.swiftBic} />
        <ProfileField
          label="IRS"
          value={
            details?.irsPercentage === null || details?.irsPercentage === undefined
              ? null
              : `${String(details.irsPercentage)}%`
          }
        />
      </Box>
    </Paper>
  );
}
