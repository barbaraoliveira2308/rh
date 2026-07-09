import { Outlet } from 'react-router-dom';

export function AuthLayout(): React.JSX.Element {
  return (
    <div className="flex min-h-screen items-center justify-center bg-brand-50 p-4">
      <div className="w-full max-w-md">
        <Outlet />
      </div>
    </div>
  );
}
