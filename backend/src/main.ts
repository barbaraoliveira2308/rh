import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { Logger, ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import * as compression from 'compression';
import * as fs from 'node:fs';
import * as path from 'node:path';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const logger = new Logger('Bootstrap');
  const nodeEnv = process.env.NODE_ENV ?? 'development';

  app.use(helmet());
  app.use(compression());

  app.enableCors({
    origin: configService.get<string>('BACKEND_CORS_ORIGIN', 'http://localhost:5173'),
    credentials: true,
    exposedHeaders: ['Content-Disposition'],
  });

  app.setGlobalPrefix('api');

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const swaggerEnabled = nodeEnv === 'development' || nodeEnv === 'staging';
  if (swaggerEnabled) {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('HR Suite API')
      .setDescription(
        'Sistema de Gestão de Recursos Humanos — Bridge351\n\n' +
          'Documentação completa das especificações em [specs/](../specs/README.md)',
      )
      .setVersion('1.0')
      .addBearerAuth()
      .addTag('Health', 'Health check do servidor')
      .addTag('Auth', 'Autenticação, MFA e gestão de sessão')
      .addTag('Users', 'Colaboradores, departamentos e cargos')
      .addTag('Teams', 'Equipas, membros e capacidade')
      .addTag('Clients', 'Clientes')
      .addTag('Contracts', 'Contratos e renovações')
      .addTag('Documents', 'Gestão documental e uploads')
      .addTag('Projects', 'Projetos, alocações e equipas')
      .addTag('Timesheets', 'Folhas de horas e lançamentos')
      .addTag('Absences', 'Ausências, férias e saldos')
      .addTag('Expenses', 'Despesas, categorias e reembolsos')
      .addTag('Analytics', 'Dashboards de recursos e financeiro')
      .addTag('Calendar', 'Calendário, feriados e eventos')
      .addTag('Helpdesk', 'Tickets, categorias e SLA')
      .addTag('Policies', 'Políticas internas e versões')
      .addTag('Reports', 'Relatórios operacionais e agendamentos')
      .addTag('Training', 'Formação, avaliações e competências')
      .addTag('GDPR', 'GDPR, consentimentos e pedidos de titular')
      .addTag('Notifications', 'Notificações in-app e preferências')
      .addTag('Workflow', 'Caixa de entrada e aprovações')
      .addTag('Audit', 'Auditoria e logs de ações')
      .addTag('Admin', 'Configurações globais, entidades legais, health e métricas')
      .build();

    const document = SwaggerModule.createDocument(app, swaggerConfig);

    const docsDir = path.resolve(__dirname, '../../docs');
    if (!fs.existsSync(docsDir)) {
      fs.mkdirSync(docsDir, { recursive: true });
    }
    fs.writeFileSync(path.join(docsDir, 'openapi.json'), JSON.stringify(document, null, 2));

    SwaggerModule.setup('api/docs', app, document);

    logger.log('Swagger docs available at /api/docs');
  }

  const port = configService.get<number>('BACKEND_PORT', 3000);
  await app.listen(port);

  logger.log(`Application running on http://localhost:${String(port)}`);
}

void bootstrap();
