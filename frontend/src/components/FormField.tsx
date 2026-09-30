import * as React from 'react';
import { useFormContext } from 'react-hook-form';
import TextField from '@mui/material/TextField';
import { DateTextField } from '@/components/DateTextField';

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
    setValue,
    watch,
    formState: { errors },
  } = useFormContext();

  const error = errors[name]?.message as string | undefined;
  const { type, ...fieldInputProps } = inputProps;

  if (type === 'date') {
    const registration = register(name);
    return (
      <DateTextField
        {...fieldInputProps}
        name={name}
        value={String(watch(name) ?? '')}
        onChange={(isoDate) => {
          setValue(name, isoDate, { shouldDirty: true, shouldTouch: true, shouldValidate: true });
        }}
        onBlur={(event) => {
          void registration.onBlur(event);
        }}
        inputRef={registration.ref}
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

  return (
    <TextField
      {...register(name)}
      {...fieldInputProps}
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
