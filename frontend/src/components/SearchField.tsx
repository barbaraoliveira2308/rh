import * as React from 'react';
import SearchIcon from '@mui/icons-material/Search';
import ClearIcon from '@mui/icons-material/Clear';
import IconButton from '@mui/material/IconButton';
import InputAdornment from '@mui/material/InputAdornment';
import TextField, { type TextFieldProps } from '@mui/material/TextField';

export type SearchFieldProps = Omit<TextFieldProps, 'onChange' | 'value' | 'slotProps'> & {
  value: string;
  onChange: (value: string) => void;
  onClear?: () => void;
};

export const SearchField = React.forwardRef<HTMLInputElement, SearchFieldProps>(
  ({ value, onChange, onClear, placeholder = 'Pesquisar', label, ...props }, ref) => {
    const handleClear = (): void => {
      onClear?.();
      if (!onClear) onChange('');
    };

    return (
      <TextField
        {...props}
        inputRef={ref}
        value={value}
        onChange={(event) => {
          onChange(event.target.value);
        }}
        label={label}
        placeholder={placeholder}
        type="search"
        size="small"
        fullWidth
        slotProps={{
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: value ? (
              <InputAdornment position="end">
                <IconButton
                  aria-label="Limpar pesquisa"
                  edge="end"
                  onClick={handleClear}
                  size="small"
                >
                  <ClearIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined,
          },
        }}
      />
    );
  },
);

SearchField.displayName = 'SearchField';
