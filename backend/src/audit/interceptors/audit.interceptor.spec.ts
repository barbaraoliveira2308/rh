import { ExecutionContext, CallHandler } from '@nestjs/common';
import { of } from 'rxjs';
import { AuditInterceptor } from './audit.interceptor';
import { AuditService } from '../services/audit.service';
import { Reflector } from '@nestjs/core';
import { DataSource } from 'typeorm';
import { AuditMetadata } from '../decorators/audit.decorator';

describe('AuditInterceptor', () => {
  let interceptor: AuditInterceptor;
  let auditService: { log: jest.Mock };
  let reflector: { get: jest.Mock };
  let dataSource: { getRepository: jest.Mock };

  const buildContext = (
    method: string,
    params: Record<string, string> = {},
    user: { sub: string } | undefined = { sub: 'user-1' },
  ): ExecutionContext => {
    const request = {
      method,
      params,
      user,
      ip: '127.0.0.1',
      headers: { 'user-agent': 'jest' },
    };

    return {
      switchToHttp: () => ({ getRequest: () => request }),
      getHandler: () => ({}),
    } as unknown as ExecutionContext;
  };

  const buildCallHandler = (result: unknown): CallHandler => ({
    handle: () => of(result),
  });

  beforeEach(() => {
    auditService = { log: jest.fn() };
    reflector = { get: jest.fn() };
    dataSource = { getRepository: jest.fn().mockReturnValue({ findOne: jest.fn() }) };

    interceptor = new AuditInterceptor(
      auditService as unknown as AuditService,
      reflector as unknown as Reflector,
      dataSource as unknown as DataSource,
    );
  });

  it('não regista nada em rotas GET', (done) => {
    reflector.get.mockReturnValue(undefined);
    const context = buildContext('GET');

    interceptor.intercept(context, buildCallHandler({})).subscribe(() => {
      expect(auditService.log).not.toHaveBeenCalled();
      done();
    });
  });

  it('não regista nada quando a rota não tem @Audit(...)', (done) => {
    reflector.get.mockReturnValue(undefined);
    const context = buildContext('POST');

    interceptor.intercept(context, buildCallHandler({ id: 'entity-1' })).subscribe(() => {
      expect(auditService.log).not.toHaveBeenCalled();
      done();
    });
  });

  it('usa o :id da rota quando presente', (done) => {
    const meta: AuditMetadata = { action: 'Updated', entityType: 'Employee' };
    reflector.get.mockReturnValue(meta);
    const context = buildContext('PATCH', { id: 'emp-1' });

    interceptor.intercept(context, buildCallHandler({ id: 'emp-1', name: 'Ana' })).subscribe(() => {
      expect(auditService.log).toHaveBeenCalledWith(
        expect.objectContaining({ action: 'Updated', entityType: 'Employee', entityId: 'emp-1' }),
      );
      done();
    });
  });

  it('cai para o id do corpo da resposta quando a rota não tem :id (ex: criação)', (done) => {
    const meta: AuditMetadata = { action: 'Created', entityType: 'Employee' };
    reflector.get.mockReturnValue(meta);
    const context = buildContext('POST', {});

    interceptor
      .intercept(context, buildCallHandler({ id: 'emp-novo', name: 'Bruno' }))
      .subscribe(() => {
        expect(auditService.log).toHaveBeenCalledWith(
          expect.objectContaining({
            action: 'Created',
            entityType: 'Employee',
            entityId: 'emp-novo',
          }),
        );
        done();
      });
  });

  it('não regista (sem lançar erro) quando nenhum id é resolvível', (done) => {
    const meta: AuditMetadata = { action: 'ConfigChanged', entityType: 'SystemSetting' };
    reflector.get.mockReturnValue(meta);
    const context = buildContext('PUT', {});

    interceptor.intercept(context, buildCallHandler({ message: 'ok, sem id' })).subscribe(() => {
      expect(auditService.log).not.toHaveBeenCalled();
      done();
    });
  });
});
