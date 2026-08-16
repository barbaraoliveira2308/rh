import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of, throwError } from 'rxjs';
import { AuthAuditInterceptor, AuditEventHandler } from './auth-audit.interceptor';

describe('AuthAuditInterceptor', () => {
  let handler: jest.MockedFunction<AuditEventHandler>;
  let interceptor: AuthAuditInterceptor;

  const buildContext = (
    handlerName: string,
    overrides: Partial<{
      body: Record<string, unknown>;
      user: { sub: string };
      route: { path: string };
    }> = {},
  ): ExecutionContext => {
    const request = {
      method: 'POST',
      ip: '127.0.0.1',
      body: overrides.body ?? {},
      user: overrides.user,
      route: overrides.route ?? { path: `/auth/${handlerName}` },
      headers: { 'user-agent': 'jest' },
    };

    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({ name: handlerName }),
    } as unknown as ExecutionContext;
  };

  const buildCallHandler = (result: unknown, isError = false): CallHandler => ({
    handle: () => (isError ? throwError(() => result) : of(result)),
  });

  beforeEach(() => {
    handler = jest.fn();
    interceptor = new AuthAuditInterceptor(handler);
  });

  it('regista login bem-sucedido com o userId da resposta', (done) => {
    const context = buildContext('login', { body: { email: 'user@empresa.pt' } });
    const callHandler = buildCallHandler({ user: { id: 'user-1' } });

    interceptor.intercept(context, callHandler).subscribe(() => {
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({
          handlerName: 'login',
          success: true,
          userId: 'user-1',
          email: 'user@empresa.pt',
        }),
      );
      done();
    });
  });

  it('regista logout com o userId do request.user', (done) => {
    const context = buildContext('logout', { user: { sub: 'user-2' } });
    const callHandler = buildCallHandler({ message: 'Sessão terminada' });

    interceptor.intercept(context, callHandler).subscribe(() => {
      expect(handler).toHaveBeenCalledWith(
        expect.objectContaining({ handlerName: 'logout', success: true, userId: 'user-2' }),
      );
      done();
    });
  });

  it('regista login falhado com o email tentado', (done) => {
    const context = buildContext('login', { body: { email: 'invalido@empresa.pt' } });
    const callHandler = buildCallHandler(new Error('Credenciais inválidas'), true);

    interceptor.intercept(context, callHandler).subscribe({
      error: () => {
        expect(handler).toHaveBeenCalledWith(
          expect.objectContaining({
            handlerName: 'login',
            success: false,
            email: 'invalido@empresa.pt',
          }),
        );
        done();
      },
    });
  });

  it('não regista falhas de rotas que não sejam login', (done) => {
    const context = buildContext('changePassword', { user: { sub: 'user-3' } });
    const callHandler = buildCallHandler(new Error('Password atual inválida'), true);

    interceptor.intercept(context, callHandler).subscribe({
      error: () => {
        expect(handler).not.toHaveBeenCalled();
        done();
      },
    });
  });
});
