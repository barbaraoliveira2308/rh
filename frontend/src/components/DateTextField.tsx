import * as React from 'react';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

function isValidDate(year: number, month: number, day: number): boolean {
  if (year < 1 || month < 1 || month > 12 || day < 1) return false;
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function toIsoDate(year: number, month: number, day: number): string | null {
  if (!isValidDate(year, month, day)) return null;
  const paddedYear = String(year).padStart(4, '0');
  const paddedMonth = String(month).padStart(2, '0');
  const paddedDay = String(day).padStart(2, '0');
  return `${paddedYear}-${paddedMonth}-${paddedDay}`;
}

function parseDateInput(value: string): string | null {
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (isoMatch) {
    return toIsoDate(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]));
  }

  const digits = value.replace(/\D/g, '');
  if (digits.length !== 8) return null;
  return toIsoDate(
    Number(digits.slice(4, 8)),
    Number(digits.slice(2, 4)),
    Number(digits.slice(0, 2)),
  );
}

function toDisplayDate(value: string | null | undefined): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value ?? '');
  if (!match) return '';
  const [, year, month, day] = match;
  if (!year || !month || !day) return '';
  return `${day}/${month}/${year}`;
}

export type DateTextFieldProps = Omit<
  TextFieldProps,
  'type' | 'value' | 'onChange' | 'onBlur' | 'inputRef'
> & {
  value: string | null | undefined;
  onChange: (isoDate: string) => void;
  onBlur?: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement>;
  inputRef?: React.Ref<HTMLInputElement>;
};

export function DateTextField({
  value,
  onChange,
  onBlur,
  inputRef,
  error,
  helperText,
  ...textFieldProps
}: DateTextFieldProps): React.JSX.Element {
  const [displayValue, setDisplayValue] = React.useState(() => toDisplayDate(value));
  const [invalidDate, setInvalidDate] = React.useState(false);
  const editing = React.useRef(false);
  const nativeInput = React.useRef<HTMLInputElement | null>(null);
  React.useImperativeHandle(inputRef, () => {
    const input = nativeInput.current;
    if (!input) throw new Error('O campo de data ainda não foi montado.');
    return input;
  });

  React.useEffect(() => {
    if (!editing.current) {
      setDisplayValue(toDisplayDate(value));
      setInvalidDate(false);
    }
  }, [value]);

  const setInputRef = (element: HTMLInputElement | null): void => {
    nativeInput.current = element;
  };

  const handleChange = (event: React.ChangeEvent<HTMLInputElement>): void => {
    const nextValue = event.target.value;
    editing.current = true;
    setDisplayValue(nextValue);

    if (nextValue === '') {
      setInvalidDate(false);
      nativeInput.current?.setCustomValidity('');
      editing.current = false;
      onChange('');
      return;
    }

    const isoDate = parseDateInput(nextValue);
    if (!isoDate) {
      setInvalidDate(true);
      nativeInput.current?.setCustomValidity('Introduza uma data válida no formato DD/MM/AAAA.');
      onChange('');
      return;
    }

    setInvalidDate(false);
    nativeInput.current?.setCustomValidity('');
    onChange(isoDate);
  };

  const handleBlur: React.FocusEventHandler<HTMLInputElement | HTMLTextAreaElement> = (event) => {
    const isoDate = parseDateInput(displayValue);
    if (isoDate) {
      editing.current = false;
      setDisplayValue(toDisplayDate(isoDate));
      setInvalidDate(false);
      nativeInput.current?.setCustomValidity('');
      onChange(isoDate);
    }
    onBlur?.(event);
  };

  return (
    <TextField
      {...textFieldProps}
      type="text"
      value={displayValue}
      onChange={handleChange}
      onBlur={handleBlur}
      inputRef={setInputRef}
      placeholder="DD/MM/AAAA"
      error={Boolean(error) || invalidDate}
      helperText={invalidDate ? 'Introduza uma data válida no formato DD/MM/AAAA.' : helperText}
      slotProps={{ htmlInput: { inputMode: 'numeric', maxLength: 10 } }}
    />
  );
}
