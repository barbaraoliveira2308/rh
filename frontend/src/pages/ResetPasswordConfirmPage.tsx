import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link, useSearchParams } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/FormField';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { confirmPasswordReset } from '@/api/auth.api';
import { getErrorMessage } from '@/lib/utils';

// Mesma política do backend (BR-AUTH-004 / ConfirmResetPasswordDto). A confirmação da password
// é validada só aqui: o endpoint não recebe confirm_password (ver Notas de Implementação,
// decisão P091-05) — é proteção contra gralhas, não um controlo de segurança.
const confirmResetSchema = z
  .object({
    newPassword: z
      .string()
      .min(10, 'A palavra-passe deve ter pelo menos 10 caracteres')
      .max(128, 'A palavra-passe não pode exceder 128 caracteres')
      .regex(
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]).+$/,
        'Deve conter maiúsculas, minúsculas, números e um caracter especial',
      ),
    confirmPassword: z.string(),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: 'As palavras-passe não coincidem',
    path: ['confirmPassword'],
  });

type ConfirmResetForm = z.infer<typeof confirmResetSchema>;

export function ResetPasswordConfirmPage(): React.JSX.Element {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');

  const [isLoading, setIsLoading] = React.useState(false);
  const [isDone, setIsDone] = React.useState(false);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);
  const [isExpired, setIsExpired] = React.useState(false);

  const form = useForm<ConfirmResetForm>({
    resolver: zodResolver(confirmResetSchema),
    defaultValues: { newPassword: '', confirmPassword: '' },
  });

  const onSubmit = async (data: ConfirmResetForm): Promise<void> => {
    if (!token) return;
    setIsLoading(true);
    setErrorMessage(null);
    setIsExpired(false);
    try {
      await confirmPasswordReset({ token, newPassword: data.newPassword });
      setIsDone(true);
      form.reset();
    } catch (err) {
      const message = getErrorMessage(err, 'Não foi possível repor a palavra-passe.');
      // UC-AUTH-003 fluxo alternativo 3a: token expirado tem de levar a pedir um novo link,
      // não a um beco sem saída. O backend distingue as duas mensagens desde P-091.
      setIsExpired(message.toLowerCase().includes('expirado'));
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Link inválido</CardTitle>
          <CardDescription>
            Este endereço não inclui um código de reposição. Verifica se copiaste o link completo do
            email.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" asChild>
            <Link to="/auth/reset-password">Pedir novo link</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  if (isDone) {
    return (
      <Card className="w-full shadow-lg">
        <CardHeader className="space-y-1 text-center">
          <CardTitle className="text-2xl font-bold">Palavra-passe alterada</CardTitle>
          <CardDescription>
            As sessões abertas noutros dispositivos foram terminadas. Inicia sessão com a nova
            palavra-passe.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button className="w-full" asChild>
            <Link to="/login">Ir para o login</Link>
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
          <KeyRound className="h-6 w-6 text-brand-800" />
        </div>
        <CardTitle className="text-2xl font-bold">Definir nova palavra-passe</CardTitle>
        <CardDescription>
          Mínimo 10 caracteres, com maiúsculas, minúsculas, números e um caracter especial
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormField
              name="newPassword"
              label="Nova palavra-passe"
              type="password"
              autoComplete="new-password"
              disabled={isLoading}
            />
            <FormField
              name="confirmPassword"
              label="Confirmar palavra-passe"
              type="password"
              autoComplete="new-password"
              disabled={isLoading}
            />
            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
            {isExpired ? (
              <Button type="button" className="w-full" asChild>
                <Link to="/auth/reset-password">Pedir novo link</Link>
              </Button>
            ) : (
              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? <LoadingSpinner size={16} /> : 'Alterar palavra-passe'}
              </Button>
            )}
            <Button type="button" variant="ghost" className="w-full" asChild>
              <Link to="/login">Voltar ao login</Link>
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
