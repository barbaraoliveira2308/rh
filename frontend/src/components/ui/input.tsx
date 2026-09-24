import * as React from 'react';
import TextField from '@mui/material/TextField';

type InputProps = React.InputHTMLAttributes<HTMLInputElement>;

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, size: _inputSize, color: _inputColor, ...props }, ref) => (
    <TextField
      inputRef={ref}
      type={type}
      className={className}
      variant="outlined"
      size="small"
      fullWidth
      {...props}
    />
  ),
);
Input.displayName = 'Input';

export { Input };
