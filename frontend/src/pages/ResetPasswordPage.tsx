import * as React from 'react';
import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Link } from 'react-router-dom';
import { KeyRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FormField } from '@/components/FormField';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { requestPasswordReset } from '@/api/auth.api';

const resetPasswordSchema = z.object({
  email: z.string().email('Email inválido'),
});

type ResetPasswordForm = z.infer<typeof resetPasswordSchema>;

export function ResetPasswordPage(): React.JSX.Element {
  const [isLoading, setIsLoading] = React.useState(false);
  const [successMessage, setSuccessMessage] = React.useState<string | null>(null);
  const [errorMessage, setErrorMessage] = React.useState<string | null>(null);

  const form = useForm<ResetPasswordForm>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { email: '' },
  });

  const onSubmit = async (data: ResetPasswordForm): Promise<void> => {
    setIsLoading(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await requestPasswordReset({ email: data.email });
      setSuccessMessage(
        'Se existir uma conta com este email, irá receber instruções para repor a palavra-passe.',
      );
      form.reset();
    } catch {
      setErrorMessage('Ocorreu um erro ao processar o pedido. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Card className="w-full shadow-lg">
      <CardHeader className="space-y-1 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-brand-100">
          <KeyRound className="h-6 w-6 text-brand-800" />
        </div>
        <CardTitle className="text-2xl font-bold">Repor palavra-passe</CardTitle>
        <CardDescription>
          Introduza o seu email para receber instruções de reposição
        </CardDescription>
      </CardHeader>
      <CardContent>
        <FormProvider {...form}>
          <form onSubmit={(e) => void form.handleSubmit(onSubmit)(e)} className="space-y-4">
            <FormField
              name="email"
              label="Email"
              type="email"
              placeholder="nome@empresa.pt"
              disabled={isLoading}
            />
            {successMessage && <p className="text-sm text-green-600">{successMessage}</p>}
            {errorMessage && <p className="text-sm text-red-600">{errorMessage}</p>}
            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? <LoadingSpinner size={16} /> : 'Enviar instruções'}
            </Button>
            <Button type="button" variant="ghost" className="w-full" asChild>
              <Link to="/login">Voltar ao login</Link>
            </Button>
          </form>
        </FormProvider>
      </CardContent>
    </Card>
  );
}
