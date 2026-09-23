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
import { getApiErrorMessage } from '@/lib/api-error';

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
    error,
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
        PaperProps={{
          sx: {
            borderRadius: 1.5,
            overflow: 'hidden',
          },
        }}
      >
        <DialogTitle
          id="policy-acceptance-title"
          sx={{
            backgroundColor: '#4b5558',
            color: '#fff',
            px: { xs: 3, sm: 4 },
            py: 2.5,
          }}
        >
          <Typography
            component="div"
            sx={{ fontSize: '1.25rem', fontWeight: 700, mt: 0.75, textAlign: 'center' }}
          >
            Leitura e aceite obrigatório
          </Typography>
          <Typography
            sx={{
              color: '#d9dede',
              fontSize: '0.7rem',
              fontWeight: 700,
              letterSpacing: '0.16em',
              textTransform: 'uppercase',
              textAlign: 'center',
            }}
          >
            Conformidade interna
          </Typography>
        </DialogTitle>
        <DialogContent dividers sx={{ backgroundColor: '#eef0f0', p: { xs: 2, sm: 3 } }}>
          {isLoading && (
            <Box sx={{ display: 'flex', justifyContent: 'center', py: 8 }}>
              <CircularProgress />
            </Box>
          )}
          {isError && (
            <Stack spacing={2} sx={{ backgroundColor: '#fff', p: 3 }}>
              <Alert severity="error">
                {getApiErrorMessage(error, 'Não foi possível carregar as políticas pendentes.')}
              </Alert>
              <Button variant="outlined" onClick={() => void refetch()}>
                Tentar novamente
              </Button>
            </Stack>
          )}
          {!isLoading && !isError && pendingPolicies.length > 0 && (
            <Stack spacing={2}>
              <Box sx={{ backgroundColor: '#f8f9f9', border: '1px solid #d5d8d8', p: 2.5 }}>
                <Typography sx={{ color: '#303638', fontSize: '0.95rem', fontWeight: 600 }}>
                  Reveja as políticas abaixo antes de continuar.
                </Typography>
                <Typography sx={{ color: '#687174', fontSize: '0.85rem', mt: 0.5 }}>
                  É necessário confirmar a leitura de {pendingPolicies.length}{' '}
                  {pendingPolicies.length === 1 ? 'política' : 'políticas'} publicada(s).
                </Typography>
                <FormControlLabel
                  control={<Checkbox checked={allSelected} onChange={toggleAll} />}
                  label="Marcar todas como lidas e aceites"
                  sx={{ mt: 1, mb: -1, ml: -1 }}
                />
              </Box>
              {pendingPolicies.map((policy) => (
                <Accordion
                  key={policy.id}
                  disableGutters
                  sx={{
                    '&:before': { display: 'none' },
                    backgroundColor: '#fff',
                    border: '1px solid #d2d5d5',
                    borderRadius: 1,
                    overflow: 'hidden',
                  }}
                >
                  <AccordionSummary
                    expandIcon={<ExpandMoreIcon />}
                    sx={{
                      '&.Mui-expanded': { minHeight: 56 },
                      '& .MuiAccordionSummary-content': { my: 1.5 },
                      backgroundColor: '#f8f9f9',
                    }}
                  >
                    <Box>
                      <Typography sx={{ color: '#252b2d', fontWeight: 700 }}>
                        {policy.title} · versão {policy.version}
                      </Typography>
                      <Typography sx={{ color: '#687174', fontSize: '0.75rem', mt: 0.25 }}>
                        Política interna · {policy.category}
                      </Typography>
                    </Box>
                  </AccordionSummary>
                  <AccordionDetails sx={{ p: 0 }}>
                    <Box sx={{ backgroundColor: '#e7e8e8', p: { xs: 1.5, sm: 3 } }}>
                      <Box
                        sx={{
                          mx: 'auto',
                          maxWidth: 820,
                          border: '1px solid #d2d4d4',
                          backgroundColor: '#fafafa',
                          boxShadow: '0 10px 28px rgba(35, 42, 45, 0.12)',
                        }}
                      >
                        <Box
                          sx={{
                            borderBottom: '4px solid #4b5558',
                            px: { xs: 3, sm: 6 },
                            py: { xs: 3, sm: 4 },
                          }}
                        >
                          <Typography
                            sx={{
                              color: '#687174',
                              fontSize: '0.7rem',
                              fontWeight: 700,
                              letterSpacing: '0.18em',
                              textTransform: 'uppercase',
                            }}
                          >
                            Política interna
                          </Typography>
                          <Typography
                            component="h2"
                            sx={{
                              color: '#252b2d',
                              fontFamily: 'Georgia, "Times New Roman", serif',
                              fontSize: { xs: '1.35rem', sm: '1.7rem' },
                              fontWeight: 700,
                              mt: 1.5,
                            }}
                          >
                            {policy.title}
                          </Typography>
                          <Box
                            sx={{
                              borderTop: '1px solid #d7d9d9',
                              color: '#687174',
                              display: 'grid',
                              fontSize: '0.7rem',
                              gap: 1,
                              gridTemplateColumns: { xs: '1fr', sm: 'repeat(2, 1fr)' },
                              letterSpacing: '0.06em',
                              mt: 2,
                              pt: 1.5,
                              textTransform: 'uppercase',
                            }}
                          >
                            <span>Categoria: {policy.category}</span>
                            <span>Versão: {policy.version}</span>
                          </Box>
                        </Box>
                        <Box sx={{ px: { xs: 3, sm: 6 }, py: { xs: 3, sm: 5 } }}>
                          <PolicyDocument policy={policy} showHeader={false} variant="sheet" />
                        </Box>
                      </Box>
                    </Box>
                    <Box
                      sx={{
                        borderTop: '1px solid #d7d9d9',
                        backgroundColor: '#f8f9f9',
                        px: 3,
                        py: 1.5,
                      }}
                    >
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
                        sx={{ m: 0, fontWeight: 600 }}
                      />
                    </Box>
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
          <DialogActions
            sx={{
              backgroundColor: '#f8f9f9',
              borderTop: '1px solid #d7d9d9',
              px: { xs: 2, sm: 3 },
              py: 2,
            }}
          >
            <Button
              variant="contained"
              onClick={() => {
                acceptMutation.mutate();
              }}
              disabled={!allSelected || acceptMutation.isPending}
              sx={{ minWidth: 190 }}
            >
              {acceptMutation.isPending ? 'A guardar...' : 'Aceitar e continuar'}
            </Button>
          </DialogActions>
        )}
      </Dialog>
    </>
  );
}
