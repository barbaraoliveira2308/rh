import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { NotificationsService } from './notifications.service';
import { Notification } from '../entities/notification.entity';
import { NotificationTemplate } from '../entities/notification-template.entity';
import { NotificationPreference } from '../entities/notification-preference.entity';
import { Employee } from '../../users/entities/employee.entity';
import { TimesheetPeriod } from '../../timesheets/entities/timesheet-period.entity';
import { AbsenceRequest } from '../../absences/entities/absence-request.entity';
import { Project } from '../../projects/entities/project.entity';
import { NotificationStatus } from '../entities/notification-status.enum';
import { NotificationChannel } from '../entities/notification-channel.enum';
import { DataSubjectRequestCompletedEvent } from '../../gdpr/events/data-subject-request-completed.event';
import { PersonalDataExportedEvent } from '../../gdpr/events/personal-data-exported.event';

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockNotificationRepo: Record<string, jest.Mock>;
  let mockTemplateRepo: Record<string, jest.Mock>;
  let mockPreferenceRepo: Record<string, jest.Mock>;
  let mockEmployeeRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockNotificationRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    };

    mockTemplateRepo = {
      findOne: jest.fn(),
    };

    mockPreferenceRepo = {
      findOne: jest.fn(),
      find: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
    };

    mockEmployeeRepo = {
      findOne: jest.fn(),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: mockNotificationRepo },
        { provide: getRepositoryToken(NotificationTemplate), useValue: mockTemplateRepo },
        { provide: getRepositoryToken(NotificationPreference), useValue: mockPreferenceRepo },
        { provide: getRepositoryToken(Employee), useValue: mockEmployeeRepo },
        { provide: getRepositoryToken(TimesheetPeriod), useValue: {} },
        { provide: getRepositoryToken(AbsenceRequest), useValue: {} },
        { provide: getRepositoryToken(Project), useValue: {} },
      ],
    }).compile();

    service = module.get<NotificationsService>(NotificationsService);
  });

  describe('sendInApp', () => {
    it('deve criar notificação in-app', async () => {
      mockPreferenceRepo.findOne.mockResolvedValue({
        employeeId: 'emp-1',
        notificationType: 'test',
        emailEnabled: true,
        inAppEnabled: true,
      });

      const createdNotification = {
        id: 'notif-1',
        recipientId: 'emp-1',
        type: 'test',
        title: 'Título',
        body: 'Mensagem',
        status: NotificationStatus.SENT,
      };

      mockNotificationRepo.create.mockReturnValue(createdNotification);
      mockNotificationRepo.save.mockResolvedValue(createdNotification);

      const result = await service.sendInApp(
        'emp-1',
        'test',
        'Título',
        'Mensagem',
        'ref-1',
        'Test',
      );

      expect(result.recipientId).toBe('emp-1');
      expect(mockNotificationRepo.save).toHaveBeenCalled();
    });
  });

  describe('markAsRead', () => {
    it('deve marcar notificação como lida', async () => {
      const notification = {
        id: 'notif-1',
        recipientId: 'emp-1',
        status: NotificationStatus.SENT,
      };

      mockNotificationRepo.findOne.mockResolvedValue(notification);
      mockNotificationRepo.save.mockResolvedValue({
        ...notification,
        status: NotificationStatus.READ,
      });

      const result = await service.markAsRead('notif-1', 'emp-1');

      expect(result.status).toBe(NotificationStatus.READ);
    });

    it('deve lançar erro se notificação não pertencer ao utilizador', async () => {
      mockNotificationRepo.findOne.mockResolvedValue({
        id: 'notif-1',
        recipientId: 'emp-2',
      });

      await expect(service.markAsRead('notif-1', 'emp-1')).rejects.toThrow();
    });
  });

  describe('countUnread', () => {
    it('deve contar notificações in-app por ler', async () => {
      mockNotificationRepo.count.mockResolvedValue(3);

      const result = await service.countUnread('emp-1');

      expect(result).toBe(3);
      expect(mockNotificationRepo.count).toHaveBeenCalledWith({
        where: {
          recipientId: 'emp-1',
          channel: NotificationChannel.IN_APP,
          status: NotificationStatus.SENT,
        },
      });
    });
  });

  describe('cleanupExpiredNotifications', () => {
    it('deve eliminar notificações in-app com mais de 90 dias', async () => {
      await service.cleanupExpiredNotifications();

      expect(mockNotificationRepo.delete).toHaveBeenCalledWith(
        expect.objectContaining({ channel: NotificationChannel.IN_APP }),
      );
    });
  });

  describe('handleGdprRequestCompleted', () => {
    it('não deve notificar se o titular dos dados não existir', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await service.handleGdprRequestCompleted(
        new DataSubjectRequestCompletedEvent('req-1', 'emp-1', 'access'),
      );

      expect(mockNotificationRepo.save).not.toHaveBeenCalled();
    });

    it('deve notificar o titular dos dados quando o pedido é concluído', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'emp-1', firstName: 'João' });
      mockPreferenceRepo.findOne.mockResolvedValue({
        employeeId: 'emp-1',
        notificationType: 'gdpr.request.completed',
        emailEnabled: false,
        inAppEnabled: true,
      });

      const createdNotification = { id: 'notif-1', recipientId: 'emp-1' };
      mockNotificationRepo.create.mockReturnValue(createdNotification);
      mockNotificationRepo.save.mockResolvedValue(createdNotification);

      await service.handleGdprRequestCompleted(
        new DataSubjectRequestCompletedEvent('req-1', 'emp-1', 'access'),
      );

      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ recipientId: 'emp-1', type: 'gdpr.request.completed' }),
      );
      expect(mockNotificationRepo.save).toHaveBeenCalled();
    });
  });

  describe('handleGdprDataExported', () => {
    it('não deve notificar se o titular dos dados não existir', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue(null);

      await service.handleGdprDataExported(
        new PersonalDataExportedEvent('emp-1', 'req-1', 'access'),
      );

      expect(mockNotificationRepo.save).not.toHaveBeenCalled();
    });

    it('deve notificar o titular dos dados quando os dados são exportados', async () => {
      mockEmployeeRepo.findOne.mockResolvedValue({ id: 'emp-1', firstName: 'João' });
      mockPreferenceRepo.findOne.mockResolvedValue({
        employeeId: 'emp-1',
        notificationType: 'gdpr.data.exported',
        emailEnabled: false,
        inAppEnabled: true,
      });

      const createdNotification = { id: 'notif-1', recipientId: 'emp-1' };
      mockNotificationRepo.create.mockReturnValue(createdNotification);
      mockNotificationRepo.save.mockResolvedValue(createdNotification);

      await service.handleGdprDataExported(
        new PersonalDataExportedEvent('emp-1', 'req-1', 'portability'),
      );

      expect(mockNotificationRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ recipientId: 'emp-1', type: 'gdpr.data.exported' }),
      );
      expect(mockNotificationRepo.save).toHaveBeenCalled();
    });
  });
});
