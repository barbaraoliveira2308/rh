import React from 'react';
import Alert from '@mui/material/Alert';
import AlertTitle from '@mui/material/AlertTitle';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import { Button } from '@/components/ui/button';

interface ErrorBoundaryProps {
  children: React.ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo): void {
    // eslint-disable-next-line no-console
    console.error('ErrorBoundary caught an error:', error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({ hasError: false, error: undefined });
  };

  render(): React.ReactNode {
    if (this.state.hasError) {
      return (
        <Box
          sx={{
            minHeight: '50vh',
            p: 4,
            textAlign: 'center',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 2,
          }}
        >
          <Alert severity="error" sx={{ maxWidth: 560, textAlign: 'left' }}>
            <AlertTitle>Algo correu mal</AlertTitle>
            Ocorreu um erro inesperado. Tente recarregar a página ou contacte o suporte.
          </Alert>
          <Typography color="text.secondary" variant="body2">
            O estado da aplicação foi preservado para permitir uma nova tentativa.
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button onClick={this.handleReset}>Tentar novamente</Button>
            <Button
              variant="outline"
              onClick={() => {
                window.location.reload();
              }}
            >
              Recarregar página
            </Button>
          </Box>
        </Box>
      );
    }

    return this.props.children;
  }
}
