import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import TextField from '@mui/material/TextField';

interface FormFieldProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  'color' | 'size'
> {
  name: string;
  label: string;
  helperText?: string;
}

export function FormField({
  name,
  label,
  helperText,
  className,
  ...inputProps
}: FormFieldProps): React.JSX.Element {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  const error = errors[name]?.message as string | undefined;

  return (
    <TextField
      {...register(name)}
      {...inputProps}
      className={className}
      error={Boolean(error)}
      helperText={error ?? helperText}
      id={name}
      label={label}
      size="small"
      fullWidth
      variant="outlined"
    />
  );
}
