import * as React from 'react';
import MuiButton, { type ButtonProps as MuiButtonProps } from '@mui/material/Button';

export interface ButtonProps extends Omit<MuiButtonProps, 'size' | 'variant'> {
  variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ size = 'default', variant = 'default', asChild: _asChild, sx, style, ...props }, ref) => {
    const muiVariant =
      variant === 'default' || variant === 'destructive' || variant === 'secondary'
        ? 'contained'
        : variant === 'outline'
          ? 'outlined'
          : 'text';
    const color =
      variant === 'destructive' ? 'error' : variant === 'secondary' ? 'secondary' : 'primary';
    const muiSize =
      size === 'default' || size === 'icon' ? 'medium' : size === 'sm' ? 'small' : 'large';
    const buttonStyle: React.CSSProperties = {
      ...(size === 'icon' ? { minWidth: 40, width: 40, paddingLeft: 0, paddingRight: 0 } : {}),
      ...(variant === 'link' ? { textDecoration: 'underline', textUnderlineOffset: 4 } : {}),
      ...style,
    };

    return (
      <MuiButton
        ref={ref}
        variant={muiVariant}
        color={color}
        size={muiSize}
        sx={sx}
        style={buttonStyle}
        {...props}
      />
    );
  },
);
Button.displayName = 'Button';

export { Button };
