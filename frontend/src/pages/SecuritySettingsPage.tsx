import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { AlertTriangle, Copy, Download, KeyRound } from 'lucide-react';
import { PageHeader } from '@/components/PageHeader';
import { StatusBadge } from '@/components/StatusBadge';
import { FormField } from '@/components/FormField';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  fetchAuthProfile,
  startMfaSetup,
  confirmMfaSetup,
  regenerateRecoveryCodes,
  disableMfa,
} from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';
import { getErrorMessage } from '@/lib/utils';
import type { MfaSetupResponse } from '@/types/auth';

const PROFILE_QUERY_KEY = ['auth-profile'];

const totpSchema = z.object({
  code: z.string().regex(/^\d{6}$/, 'O código tem 6 dígitos'),
});

// Desativar aceita também um código de recuperação (decisão P092-04): é o caminho de quem
// perdeu o telemóvel.
const disableSchema = z.object({
  code: z.string().trim().min(6, 'Introduza um código válido').max(20, 'Código demasiado longo'),
});

type TotpForm = z.infer<typeof totpSchema>;
type DisableForm = z.infer<typeof disableSchema>;

function formatSecret(secret: string): string {
  return secret.replace(/(.{4})/g, '$1 ').trim();
}

interface CodeFormProps {
  schema: typeof totpSchema | typeof disableSchema;
  label: string;
  helperText: string;
  submitLabel: string;
  variant?: 'default' | 'destructive';
  isPending: boolean;
  error: string | null;
  onSubmit: (code: string) => void;
}

function CodeForm({
  schema,
  label,
  helperText,
  submitLabel,
  variant = 'default',
  isPending,
  error,
  onSubmit,
}: CodeFormProps): React.JSX.Element {
  const form = useForm<TotpForm | DisableForm>({
    resolver: zodResolver(schema),
    defaultValues: { code: '' },
  });

  return (
    <FormProvider {...form}>
      <form
        onSubmit={(e) =>
          void form.handleSubmit((data) => {
            onSubmit(data.code);
          })(e)
        }
        className="space-y-4"
      >
        <FormField
          name="code"
          label={label}
          helperText={helperText}
          autoComplete="one-time-code"
          disabled={isPending}
          className="max-w-xs"
        />
        {error && <p className="text-sm text-red-600">{error}</p>}
        <Button type="submit" variant={variant} disabled={isPending}>
          {isPending ? <LoadingSpinner size={16} /> : submitLabel}
        </Button>
      </form>
    </FormProvider>
  );
}

interface RecoveryCodesPanelProps {
  codes: string[];
  onDone: () => void;
  isFinishing: boolean;
}

function RecoveryCodesPanel({
  codes,
  onDone,
  isFinishing,
}: RecoveryCodesPanelProps): React.JSX.Element {
  const [copied, setCopied] = React.useState(false);
  const text = codes.join('\n');

  const handleCopy = (): void => {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(true);
      })
      .catch(() => undefined);
  };

  const handleDownload = (): void => {
    const blob = new Blob([`Códigos de recuperação — HR Suite\n\n${text}\n`], {
      type: 'text/plain',
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'hr-suite-codigos-recuperacao.txt';
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Códigos de recuperação</CardTitle>
        <CardDescription>
          Use um destes códigos para entrar se perder o acesso à aplicação autenticadora.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            Guarde estes códigos num local seguro. Cada código só pode ser usado uma vez e não
            voltarão a ser mostrados.
          </p>
        </div>
        <ul className="grid grid-cols-2 gap-2 font-mono text-sm sm:max-w-md">
          {codes.map((code) => (
            <li key={code} className="rounded-md bg-muted px-3 py-2 text-center">
              {code}
            </li>
          ))}
        </ul>
        <div className="flex flex-wrap gap-2">
          <Button type="button" variant="outline" onClick={handleCopy}>
            <Copy className="mr-2 h-4 w-4" />
            {copied ? 'Copiados' : 'Copiar'}
          </Button>
          <Button type="button" variant="outline" onClick={handleDownload}>
            <Download className="mr-2 h-4 w-4" />
            Descarregar
          </Button>
          <Button type="button" onClick={onDone} disabled={isFinishing}>
            {isFinishing ? <LoadingSpinner size={16} /> : 'Já guardei os códigos'}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function SecuritySettingsPage(): React.JSX.Element {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const mfaSetupRequired = useAuthStore((state) => state.mfaSetupRequired);
  const completeMfaSetup = useAuthStore((state) => state.completeMfaSetup);
  const logout = useAuthStore((state) => state.logout);

  const [setup, setSetup] = React.useState<MfaSetupResponse | null>(null);
  const [recoveryCodes, setRecoveryCodes] = React.useState<string[] | null>(null);
  const [isFinishing, setIsFinishing] = React.useState(false);
  const [finishError, setFinishError] = React.useState<string | null>(null);

  const { data: profile, isLoading } = useQuery({
    queryKey: PROFILE_QUERY_KEY,
    queryFn: fetchAuthProfile,
  });

  const startMutation = useMutation({
    mutationFn: startMfaSetup,
    onSuccess: (data) => {
      setSetup(data);
    },
  });

  const confirmMutation = useMutation({
    mutationFn: confirmMfaSetup,
    onSuccess: (data) => {
      setSetup(null);
      setRecoveryCodes(data.recoveryCodes);
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });

  const regenerateMutation = useMutation({
    mutationFn: regenerateRecoveryCodes,
    onSuccess: (data) => {
      setRecoveryCodes(data.recoveryCodes);
    },
  });

  const disableMutation = useMutation({
    mutationFn: disableMfa,
    onSuccess: async (data) => {
      // MFA obrigatório: o backend terminou também esta sessão (decisão P095-02).
      if (data.sessionEnded) {
        await logout();
        void navigate('/login');
        return;
      }
      void queryClient.invalidateQueries({ queryKey: PROFILE_QUERY_KEY });
    },
  });

  const handleCodesSaved = async (): Promise<void> => {
    if (!mfaSetupRequired) {
      setRecoveryCodes(null);
      return;
    }
    setIsFinishing(true);
    setFinishError(null);
    const ok = await completeMfaSetup();
    setIsFinishing(false);
    if (ok) {
      void navigate('/');
    } else {
      setFinishError(
        'O MFA foi ativado, mas não foi possível renovar a sessão. Inicie sessão novamente.',
      );
    }
  };

  const errorOf = (error: unknown, fallback: string): string | null =>
    error ? getErrorMessage(error, fallback) : null;

  if (isLoading || !profile) {
    return (
      <div className="flex justify-center py-12">
        <LoadingSpinner size={32} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Segurança"
        description="Gerir a autenticação multifator (MFA) da sua conta"
      />

      {mfaSetupRequired && (
        <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <AlertTriangle className="h-5 w-5 shrink-0" />
          <p>
            A autenticação multifator é obrigatória para administradores. Configure-a para aceder ao
            resto da aplicação.
          </p>
        </div>
      )}

      {recoveryCodes ? (
        <>
          <RecoveryCodesPanel
            codes={recoveryCodes}
            onDone={() => void handleCodesSaved()}
            isFinishing={isFinishing}
          />
          {finishError && <p className="text-sm text-red-600">{finishError}</p>}
        </>
      ) : (
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <KeyRound className="h-5 w-5 text-brand-800" />
              <CardTitle>Autenticação multifator</CardTitle>
              <StatusBadge
                label={profile.mfaEnabled ? 'Ativo' : 'Inativo'}
                variant={profile.mfaEnabled ? 'success' : 'neutral'}
              />
            </div>
            <CardDescription>
              Além da palavra-passe, o login passa a pedir um código de 6 dígitos gerado por uma
              aplicação autenticadora (Google Authenticator, Microsoft Authenticator, Authy…).
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {!profile.mfaEnabled && !setup && (
              <div className="space-y-2">
                {startMutation.error && (
                  <p className="text-sm text-red-600">
                    {errorOf(startMutation.error, 'Não foi possível iniciar a configuração.')}
                  </p>
                )}
                <Button
                  onClick={() => {
                    startMutation.mutate();
                  }}
                  disabled={startMutation.isPending}
                >
                  {startMutation.isPending ? <LoadingSpinner size={16} /> : 'Configurar MFA'}
                </Button>
              </div>
            )}

            {!profile.mfaEnabled && setup && (
              <div className="space-y-6">
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    1. Leia o código QR com a aplicação autenticadora
                  </p>
                  <img
                    src={setup.qrCodeDataUrl}
                    alt="Código QR para configurar a aplicação autenticadora"
                    className="h-48 w-48 rounded-md border"
                  />
                  <p className="text-sm text-muted-foreground">
                    Não consegue ler o código? Introduza esta chave manualmente:
                  </p>
                  <code className="block w-fit rounded-md bg-muted px-3 py-2 font-mono text-sm">
                    {formatSecret(setup.secret)}
                  </code>
                </div>
                <div className="space-y-3">
                  <p className="text-sm font-medium">
                    2. Confirme com o código que a aplicação mostra
                  </p>
                  <CodeForm
                    schema={totpSchema}
                    label="Código de verificação"
                    helperText="6 dígitos, renovado a cada 30 segundos"
                    submitLabel="Ativar MFA"
                    isPending={confirmMutation.isPending}
                    error={errorOf(confirmMutation.error, 'Não foi possível ativar o MFA.')}
                    onSubmit={(code) => {
                      confirmMutation.mutate(code);
                    }}
                  />
                </div>
              </div>
            )}

            {profile.mfaEnabled && (
              <>
                <div className="space-y-3">
                  <h3 className="text-sm font-semibold">Gerar novos códigos de recuperação</h3>
                  <p className="text-sm text-muted-foreground">
                    Os códigos atuais deixam de funcionar. Confirme com a aplicação autenticadora.
                  </p>
                  <CodeForm
                    schema={totpSchema}
                    label="Código da aplicação autenticadora"
                    helperText="6 dígitos"
                    submitLabel="Gerar novos códigos"
                    isPending={regenerateMutation.isPending}
                    error={errorOf(regenerateMutation.error, 'Não foi possível gerar os códigos.')}
                    onSubmit={(code) => {
                      regenerateMutation.mutate(code);
                    }}
                  />
                </div>
                <div className="space-y-3 border-t pt-6">
                  <h3 className="text-sm font-semibold">Desativar MFA</h3>
                  <p className="text-sm text-muted-foreground">
                    Perdeu o telemóvel? Use um código de recuperação para desativar e depois volte a
                    configurar o MFA.
                  </p>
                  {profile.mfaRequired && (
                    <div className="flex gap-3 rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
                      <AlertTriangle className="h-5 w-5 shrink-0" />
                      <p>
                        O MFA é obrigatório para administradores. Ao desativá-lo, a sessão termina e
                        no próximo login terá de o configurar de novo — por exemplo, num telemóvel
                        novo.
                      </p>
                    </div>
                  )}
                  <CodeForm
                    schema={disableSchema}
                    label="Código"
                    helperText="6 dígitos da aplicação, ou um código de recuperação"
                    submitLabel="Desativar MFA"
                    variant="destructive"
                    isPending={disableMutation.isPending}
                    error={errorOf(disableMutation.error, 'Não foi possível desativar o MFA.')}
                    onSubmit={(code) => {
                      disableMutation.mutate(code);
                    }}
                  />
                </div>
              </>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
