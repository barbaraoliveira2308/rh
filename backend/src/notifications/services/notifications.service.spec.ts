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

describe('NotificationsService', () => {
  let service: NotificationsService;
  let mockNotificationRepo: Record<string, jest.Mock>;
  let mockTemplateRepo: Record<string, jest.Mock>;
  let mockPreferenceRepo: Record<string, jest.Mock>;

  beforeEach(async () => {
    mockNotificationRepo = {
      findOne: jest.fn(),
      findAndCount: jest.fn(),
      create: jest.fn(),
      save: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
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

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        NotificationsService,
        { provide: getRepositoryToken(Notification), useValue: mockNotificationRepo },
        { provide: getRepositoryToken(NotificationTemplate), useValue: mockTemplateRepo },
        { provide: getRepositoryToken(NotificationPreference), useValue: mockPreferenceRepo },
        { provide: getRepositoryToken(Employee), useValue: {} },
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
});
