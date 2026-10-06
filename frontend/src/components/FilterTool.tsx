import * as React from 'react';
import SearchOutlined from '@mui/icons-material/SearchOutlined';
import InputAdornment from '@mui/material/InputAdornment';
import MenuItem from '@mui/material/MenuItem';
import TextField from '@mui/material/TextField';
import { DateTextField } from '@/components/DateTextField';
import type { FilterTool as FilterToolConfig } from '@/types/filters';

export function FilterTool({ tool }: { tool: FilterToolConfig }): React.JSX.Element {
  if (tool.type === 'search') {
    return (
      <TextField
        size="small"
        value={typeof tool.value === 'string' ? tool.value : ''}
        placeholder={tool.label}
        onChange={(event) => {
          tool.onChange(event.target.value || undefined);
        }}
        slotProps={{
          htmlInput: { 'aria-label': tool.label },
          input: {
            startAdornment: (
              <InputAdornment position="start">
                <SearchOutlined fontSize="small" />
              </InputAdornment>
            ),
          },
        }}
      />
    );
  }

  if (tool.type === 'date') {
    return (
      <DateTextField
        label={tool.label}
        value={typeof tool.value === 'string' ? tool.value : ''}
        onChange={(value) => {
          tool.onChange(value || undefined);
        }}
      />
    );
  }

  const selectedValues = Array.isArray(tool.value) ? tool.value : [];
  return (
    <TextField
      select
      size="small"
      label={tool.label}
      value={
        tool.type === 'multiselect'
          ? selectedValues
          : typeof tool.value === 'string'
            ? tool.value
            : ''
      }
      onChange={(event) => {
        if (tool.type === 'multiselect') {
          const value = event.target.value;
          tool.onChange(Array.isArray(value) ? value : value.split(','));
        } else {
          tool.onChange(event.target.value || undefined);
        }
      }}
      slotProps={{ select: { multiple: tool.type === 'multiselect' } }}
    >
      {(tool.options ?? []).map((option) => (
        <MenuItem key={option.value} value={option.value}>
          {option.label}
        </MenuItem>
      ))}
    </TextField>
  );
}
