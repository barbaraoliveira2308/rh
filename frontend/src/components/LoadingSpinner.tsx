import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

export function LoadingSpinner({ className, size = 24 }: LoadingSpinnerProps): React.JSX.Element {
  return <Loader2 className={cn('animate-spin text-brand-800', className)} size={size} />;
}
