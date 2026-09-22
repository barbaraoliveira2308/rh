import CircularProgress from '@mui/material/CircularProgress';
import Box from '@mui/material/Box';

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
}

export function LoadingSpinner({ className, size = 24 }: LoadingSpinnerProps): React.JSX.Element {
  return (
    <Box className={className} sx={{ display: 'inline-flex' }}>
      <CircularProgress color="primary" size={size} />
    </Box>
  );
}
