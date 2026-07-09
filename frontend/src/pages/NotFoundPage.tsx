import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';

export function NotFoundPage(): React.JSX.Element {
  return (
    <div className="flex min-h-[80vh] flex-col items-center justify-center text-center">
      <h1 className="text-6xl font-bold text-brand-800">404</h1>
      <p className="mt-4 text-xl text-muted-foreground">Página não encontrada</p>
      <Button asChild className="mt-6">
        <Link to="/">Voltar ao Dashboard</Link>
      </Button>
    </div>
  );
}
