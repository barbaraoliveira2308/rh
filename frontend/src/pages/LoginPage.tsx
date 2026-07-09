import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { FormProvider } from 'react-hook-form';
import { Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/FormField';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { getSsoRedirectUrl } from '@/api/auth.api';
import { useAuthStore } from '@/stores/auth.store';

const loginSchema = z.object({
  email: z.string().email('Email inválido'),
  password: z.string().min(1, 'A palavra-passe é obrigatória'),
});

const mfaSchema = z.object({
  mfaCode: z.string().length(6, 'O código MFA deve ter 6 dígitos'),
});

type LoginForm = z.infer<typeof loginSchema>;
type MfaForm = z.infer<typeof mfaSchema>;

export function LoginPage(): React.JSX.Element {
  const navigate = useNavigate();
  const { login, verifyMfa, isLoading, error, pendingMfaEmail, clearError } = useAuthStore();
  const [showMfa, setShowMfa] = React.useState(false);

  const loginForm = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const mfaForm = useForm<MfaForm>({
    resolver: zodResolver(mfaSchema),
    defaultValues: { mfaCode: '' },
  });

  const onLoginSubmit = async (data: LoginForm): Promise<void> => {
    clearError();
    try {
      await login(data);
      if (useAuthStore.getState().pendingMfaEmail) {
        setShowMfa(true);
      } else {
        void navigate('/');
      }
    } catch {
      // error já está na store
    }
  };

  const onMfaSubmit = async (data: MfaForm): Promise<void> => {
    clearError();
    try {
      await verifyMfa(data.mfaCode);
      void navigate('/');
    } catch {
      // error já está na store
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
          <Shield className="h-6 w-6 text-brand-800" />
        </div>
        <CardTitle className="text-2xl font-bold">HR Suite</CardTitle>
        <CardDescription>
          {showMfa
            ? 'Introduza o código de verificação de 6 dígitos'
            : 'Inicie sessão na sua conta'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {!showMfa ? (
          <FormProvider {...loginForm}>
            <form
              onSubmit={(e) => void loginForm.handleSubmit(onLoginSubmit)(e)}
              className="space-y-4"
            >
              <FormField name="email" label="Email" type="email" placeholder="nome@empresa.pt" />
              <FormField
                name="password"
                label="Palavra-passe"
                type="password"
                placeholder="••••••••"
              />
              <div className="flex justify-end">
                <Link to="/auth/reset-password" className="text-sm text-brand-800 hover:underline">
                  Esqueci a palavra-passe
                </Link>
              </div>
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <LoadingSpinner size={16} /> : 'Iniciar sessão'}
              </Button>
              <Button
                type="button"
                variant="outline"
                className="w-full"
                onClick={() => {
                  window.location.href = getSsoRedirectUrl();
                }}
              >
                Entrar com SSO
              </Button>
            </form>
          </FormProvider>
        ) : (
          <FormProvider {...mfaForm}>
            <form onSubmit={(e) => void mfaForm.handleSubmit(onMfaSubmit)(e)} className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Foi enviado um código para {pendingMfaEmail}
              </p>
              <FormField
                name="mfaCode"
                label="Código MFA"
                type="text"
                placeholder="000000"
                maxLength={6}
                inputMode="numeric"
              />
              {error && <p className="text-sm text-red-600">{error}</p>}
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <LoadingSpinner size={16} /> : 'Verificar'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => {
                  setShowMfa(false);
                }}
              >
                Voltar ao login
              </Button>
            </form>
          </FormProvider>
        )}
      </CardContent>
    </Card>
  );
}
