import FormControl from '@mui/material/FormControl';
import FormHelperText from '@mui/material/FormHelperText';
import InputLabel from '@mui/material/InputLabel';
import MenuItem from '@mui/material/MenuItem';
import Select, { type SelectChangeEvent } from '@mui/material/Select';
import type { FieldPath, FieldValues } from 'react-hook-form';
import { useController, useFormContext } from 'react-hook-form';

export interface EmployeeSelectOption {
  value: string;
  label: string;
}

interface EmployeeSelectFieldProps<TFieldValues extends FieldValues> {
  name: FieldPath<TFieldValues>;
  label: string;
  options: EmployeeSelectOption[];
  placeholder?: string;
}

export function EmployeeSelectField<TFieldValues extends FieldValues>({
  name,
  label,
  options,
  placeholder,
}: EmployeeSelectFieldProps<TFieldValues>): React.JSX.Element {
  const { control } = useFormContext<TFieldValues>();
  const { field, fieldState } = useController({ name, control });
  const labelId = `${name}-label`;

  const handleChange = (event: SelectChangeEvent<unknown>): void => {
    field.onChange(event.target.value === '' ? undefined : event.target.value);
  };

  return (
    <FormControl fullWidth error={Boolean(fieldState.error)} size="small">
      <InputLabel id={labelId}>{label}</InputLabel>
      <Select
        labelId={labelId}
        id={name}
        value={field.value ?? ''}
        label={label}
        onChange={handleChange}
        onBlur={field.onBlur}
        inputRef={field.ref}
        displayEmpty={Boolean(placeholder)}
      >
        {placeholder && (
          <MenuItem value="" disabled>
            {placeholder}
          </MenuItem>
        )}
        {options.map((option) => (
          <MenuItem key={option.value} value={option.value}>
            {option.label}
          </MenuItem>
        ))}
      </Select>
      {fieldState.error?.message && <FormHelperText>{fieldState.error.message}</FormHelperText>}
    </FormControl>
  );
}
