import Chip from '@mui/material/Chip';

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neutral';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantColors: Record<BadgeVariant, 'default' | 'success' | 'warning' | 'error' | 'info'> = {
  default: 'default',
  success: 'success',
  warning: 'warning',
  danger: 'error',
  info: 'info',
  neutral: 'default',
};

export function StatusBadge({
  label,
  variant = 'default',
  className,
}: StatusBadgeProps): React.JSX.Element {
  return <Chip className={className} color={variantColors[variant]} label={label} size="small" />;
}
