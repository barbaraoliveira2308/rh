import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';
import { JwtService } from '../services/jwt.service';
import { JwtPayload } from '../interfaces/jwt-payload.interface';

describe('JwtAuthGuard (R-061)', () => {
  const payload = { sub: 'user-1', email: 'a@b.pt', roles: ['EMPLOYEE'] } as unknown as JwtPayload;
  let jwtService: { verifyAccessToken: jest.Mock; computeTokenHash: jest.Mock };
  let sessions: { validate: jest.Mock; touch: jest.Mock };
  let reflector: { getAllAndOverride: jest.Mock };
  let guard: JwtAuthGuard;

  interface FakeRequest {
    headers: Record<string, string>;
    user?: unknown;
  }

  const contextFor = (
    headers: Record<string, string>,
  ): { context: ExecutionContext; request: FakeRequest } => {
    const request: FakeRequest = { headers };
    const context = {
      switchToHttp: (): { getRequest: () => FakeRequest } => ({ getRequest: () => request }),
      getHandler: () => undefined,
      getClass: () => undefined,
    } as unknown as ExecutionContext;
    return { context, request };
  };

  beforeEach(() => {
    jwtService = {
      verifyAccessToken: jest.fn().mockReturnValue(payload),
      computeTokenHash: jest.fn().mockReturnValue('hash-1'),
    };
    sessions = {
      validate: jest.fn().mockResolvedValue({ id: 'session-1' }),
      touch: jest.fn().mockResolvedValue(undefined),
    };
    reflector = { getAllAndOverride: jest.fn() };
    guard = new JwtAuthGuard(
      jwtService as unknown as JwtService,
      sessions,
      reflector as unknown as Reflector,
    );
  });

  it('deve aceitar uma sessão válida, registar a atividade e anexar o payload ao pedido', async () => {
    const { context, request } = contextFor({ authorization: 'Bearer token-1' });

    await expect(guard.canActivate(context)).resolves.toBe(true);

    expect(sessions.validate).toHaveBeenCalledWith('hash-1');
    expect(sessions.touch).toHaveBeenCalledWith('session-1');
    expect(request.user).toBe(payload);
  });

  it('não deve registar atividade em pedidos automáticos (X-Background-Request)', async () => {
    const { context } = contextFor({
      authorization: 'Bearer token-1',
      'x-background-request': '1',
    });

    await expect(guard.canActivate(context)).resolves.toBe(true);
    expect(sessions.touch).not.toHaveBeenCalled();
  });

  it('deve recusar um JWT inválido sem consultar a base de dados', async () => {
    jwtService.verifyAccessToken.mockImplementation(() => {
      throw new UnauthorizedException('Token de acesso inválido ou expirado');
    });
    const { context } = contextFor({ authorization: 'Bearer forged' });

    await expect(guard.canActivate(context)).rejects.toThrow(
      'Token de acesso inválido ou expirado',
    );
    expect(sessions.validate).not.toHaveBeenCalled();
  });

  it('deve recusar um pedido sem token', async () => {
    const { context } = contextFor({});

    await expect(guard.canActivate(context)).rejects.toThrow('Token de autenticação não fornecido');
    expect(sessions.validate).not.toHaveBeenCalled();
  });

  // Sessão revogada, expirada ou inativa: o SessionsService devolve null nos três casos e a resposta
  // é a mesma de antes de R-061 (401 com esta mensagem), da qual o useIdleLogout depende.
  it.each(['revogada', 'expirada', 'inativa'])(
    'deve responder 401 "Sessão inválida ou expirada" a uma sessão %s',
    async () => {
      sessions.validate.mockResolvedValue(null);
      const { context } = contextFor({ authorization: 'Bearer token-1' });

      const error = (await guard
        .canActivate(context)
        .catch((err: unknown) => err)) as UnauthorizedException;

      expect(error).toBeInstanceOf(UnauthorizedException);
      expect(error.getResponse()).toEqual({
        statusCode: 401,
        message: 'Sessão inválida ou expirada',
        error: 'Unauthorized',
      });
      expect(sessions.touch).not.toHaveBeenCalled();
    },
  );

  it('deve continuar a bloquear rotas fora da configuração de MFA obrigatória', async () => {
    jwtService.verifyAccessToken.mockReturnValue({ ...payload, mfaSetupRequired: true });
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const { context } = contextFor({ authorization: 'Bearer token-1' });

    await expect(guard.canActivate(context)).rejects.toBeInstanceOf(ForbiddenException);
  });
});
