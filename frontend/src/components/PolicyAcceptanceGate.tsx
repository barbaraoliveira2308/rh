import React from 'react';
import {
  Accordion,
  AccordionDetails,
  AccordionSummary,
  Alert,
  Box,
  Button,
  Checkbox,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControlLabel,
  Stack,
  Typography,
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { acceptPolicy, fetchPendingPolicyAcceptances } from '@/api/policies.api';
import { PolicyDocument } from '@/components/PolicyDocument';
import { useAuthStore } from '@/stores/auth.store';

export function PolicyAcceptanceGate({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  const queryClient = useQueryClient();
  const isAuthenticated = useAuthStore((state) => state.isAuthenticated);
  const [selectedPolicyIds, setSelectedPolicyIds] = React.useState<Set<string>>(new Set());
  const {
    data: pendingPolicies = [],
    isLoading,
    isError,
    refetch,
  } = useQuery({
    queryKey: ['policies', 'acceptance', 'pending'],
    queryFn: fetchPendingPolicyAcceptances,
    enabled: isAuthenticated,
    retry: 1,
  });

  const acceptMutation = useMutation({
    mutationFn: async (): Promise<void> => {
      await Promise.all([...selectedPolicyIds].map((policyId) => acceptPolicy(policyId)));
    },
    onSuccess: async () => {
      setSelectedPolicyIds(new Set());
      await queryClient.invalidateQueries({ queryKey: ['policies', 'acceptance', 'pending'] });
    },
  });

  const allSelected =
    pendingPolicies.length > 0 && selectedPolicyIds.size === pendingPolicies.length;
  const isBlocked = pendingPolicies.length > 0 || isLoading || isError;

  const togglePolicy = (policyId: string): void => {
    setSelectedPolicyIds((current) => {
      const next = new Set(current);
      if (next.has(policyId)) next.delete(policyId);
      else next.add(policyId);
      return next;
    });
  };

  const toggleAll = (): void => {
    setSelectedPolicyIds(
      allSelected ? new Set() : new Set(pendingPolicies.map((policy) => policy.id)),
    );
  };

  return (
    <>
      {children}
      <Dialog
        open={isBlocked}
        fullWidth
        maxWidth="md"
        onClose={() => undefined}
        aria-labelledby="policy-acceptance-title"
      >
        <DialogTitle id="policy-acceptance-title">Leitura e aceite obrigatório</DialogTitle>
        <DialogContent dividers>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 5 }}>
              <CircularProgress />
            </Box>
          )}
          {isError && (
            <Stack spacing={2}>
              <Alert severity="error">Não foi possível carregar as políticas pendentes.</Alert>
              <Button variant="outlined" onClick={() => void refetch()}>
                Tentar novamente
              </Button>
            </Stack>
          )}
          {!isLoading && !isError && pendingPolicies.length > 0 && (
            <Stack spacing={2}>
              <Typography>
                Para continuar, leia e aceite todas as políticas publicadas abaixo.
              </Typography>
              <FormControlLabel
                control={<Checkbox checked={allSelected} onChange={toggleAll} />}
                label="Marcar todas como lidas e aceites"
              />
              {pendingPolicies.map((policy) => (
                <Accordion key={policy.id} disableGutters>
                  <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography sx={{ fontWeight: 700 }}>
                      {policy.title} · versão {policy.version}
                    </Typography>
                  </AccordionSummary>
                  <AccordionDetails>
                    <Box sx={{ mb: 1.5 }}>
                      <PolicyDocument policy={policy} />
                    </Box>
                    <FormControlLabel
                      control={
                        <Checkbox
                          checked={selectedPolicyIds.has(policy.id)}
                          onChange={() => {
                            togglePolicy(policy.id);
                          }}
                        />
                      }
                      label="Li e aceito esta política"
                    />
                  </AccordionDetails>
                </Accordion>
              ))}
              {acceptMutation.isError && (
                <Alert severity="error">Não foi possível guardar todos os aceites.</Alert>
              )}
            </Stack>
          )}
        </DialogContent>
        {!isLoading && !isError && pendingPolicies.length > 0 && (
          <DialogActions sx={{ px: 3, py: 2 }}>
            <Button
              variant="contained"
              onClick={() => {
                acceptMutation.mutate();
              }}
              disabled={!allSelected || acceptMutation.isPending}
            >
              {acceptMutation.isPending ? 'A guardar...' : 'Aceitar e continuar'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
}
