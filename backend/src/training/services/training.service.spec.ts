import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { DataSource } from 'typeorm';
import { TrainingService } from './training.service';
import { Course } from '../entities/course.entity';
import { CourseEnrollment } from '../entities/course-enrollment.entity';
import { TrainingRecord } from '../entities/training-record.entity';
import { PerformanceReview } from '../entities/performance-review.entity';
import { Competency } from '../entities/competency.entity';
import { EmployeeCompetency } from '../entities/employee-competency.entity';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { CourseStatus } from '../entities/course-status.enum';
import { EnrollmentStatus } from '../entities/enrollment-status.enum';

const createMockRepository = () => ({
  findOne: jest.fn(),
  find: jest.fn().mockResolvedValue([]),
  save: jest.fn().mockImplementation((entity: unknown) => Promise.resolve(entity)),
  create: jest.fn().mockImplementation((dto: unknown) => dto),
  count: jest.fn().mockResolvedValue(0),
});

const mockDataSource = {
  getRepository: jest.fn().mockReturnValue({
    find: jest.fn().mockResolvedValue([]),
    findOne: jest.fn().mockResolvedValue(null),
  }),
};

describe('TrainingService', () => {
  let service: TrainingService;
  let courseRepository: ReturnType<typeof createMockRepository>;
  let enrollmentRepository: ReturnType<typeof createMockRepository>;
  let employeeRepository: ReturnType<typeof createMockRepository>;
  let competencyRepository: ReturnType<typeof createMockRepository>;
  let employeeCompetencyRepository: ReturnType<typeof createMockRepository>;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: getRepositoryToken(Course), useValue: createMockRepository() },
        { provide: getRepositoryToken(CourseEnrollment), useValue: createMockRepository() },
        { provide: getRepositoryToken(TrainingRecord), useValue: createMockRepository() },
        { provide: getRepositoryToken(PerformanceReview), useValue: createMockRepository() },
        { provide: getRepositoryToken(Competency), useValue: createMockRepository() },
        { provide: getRepositoryToken(EmployeeCompetency), useValue: createMockRepository() },
        { provide: getRepositoryToken(Employee), useValue: createMockRepository() },
        { provide: getRepositoryToken(TeamMember), useValue: createMockRepository() },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    service = module.get<TrainingService>(TrainingService);
    courseRepository = module.get(getRepositoryToken(Course));
    enrollmentRepository = module.get(getRepositoryToken(CourseEnrollment));
    employeeRepository = module.get(getRepositoryToken(Employee));
    competencyRepository = module.get(getRepositoryToken(Competency));
    employeeCompetencyRepository = module.get(getRepositoryToken(EmployeeCompetency));

    jest.clearAllMocks();
  });

  it('should create a course', async () => {
    const dto = { name: 'Test Course', durationHours: 10 };
    courseRepository.create.mockReturnValue({ ...dto, id: 'course-1' });

    const result = await service.createCourse(dto);

    expect(result.name).toBe('Test Course');
    expect(courseRepository.save).toHaveBeenCalled();
  });

  it('should enroll an active employee', async () => {
    const employee = new Employee();
    employee.id = 'emp-1';
    employee.status = EmployeeStatus.ACTIVE;

    const course = new Course();
    course.id = 'course-1';
    course.status = CourseStatus.ONGOING;

    employeeRepository.findOne.mockResolvedValue(employee);
    courseRepository.findOne.mockResolvedValue(course);
    enrollmentRepository.findOne.mockResolvedValue(null);
    enrollmentRepository.create.mockReturnValue({
      courseId: 'course-1',
      employeeId: 'emp-1',
      status: EnrollmentStatus.ENROLLED,
    });

    const result = await service.enroll('emp-1', 'course-1');

    expect(result.employeeId).toBe('emp-1');
    expect(result.status).toBe(EnrollmentStatus.ENROLLED);
  });

  it('should reject enrollment in completed course', async () => {
    const employee = new Employee();
    employee.id = 'emp-1';
    employee.status = EmployeeStatus.ACTIVE;

    const course = new Course();
    course.id = 'course-1';
    course.status = CourseStatus.COMPLETED;

    employeeRepository.findOne.mockResolvedValue(employee);
    courseRepository.findOne.mockResolvedValue(course);

    await expect(service.enroll('emp-1', 'course-1')).rejects.toThrow(
      'Não é possível inscrever num curso já concluído',
    );
  });

  it('should calculate 9-box levels correctly', async () => {
    const employee = new Employee();
    employee.id = 'emp-1';
    employee.firstName = 'Alice';
    employee.lastName = 'Silva';

    const teamMember = new TeamMember();
    teamMember.employeeId = 'emp-1';
    teamMember.teamId = 'team-1';
    teamMember.employee = employee;

    const review = new PerformanceReview();
    review.employeeId = 'emp-1';
    review.period = '2025-Q1';
    review.overallRating = 4;
    review.potentialRating = 5;
    review.status = 'submitted' as unknown as never;
    review.employee = employee;

    const teamMemberRepository = {
      find: jest.fn().mockResolvedValue([teamMember]),
    };

    const reviewRepository = {
      find: jest.fn().mockResolvedValue([review]),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TrainingService,
        { provide: getRepositoryToken(Course), useValue: createMockRepository() },
        { provide: getRepositoryToken(CourseEnrollment), useValue: createMockRepository() },
        { provide: getRepositoryToken(TrainingRecord), useValue: createMockRepository() },
        { provide: getRepositoryToken(PerformanceReview), useValue: reviewRepository },
        { provide: getRepositoryToken(Competency), useValue: createMockRepository() },
        { provide: getRepositoryToken(EmployeeCompetency), useValue: createMockRepository() },
        { provide: getRepositoryToken(Employee), useValue: createMockRepository() },
        { provide: getRepositoryToken(TeamMember), useValue: teamMemberRepository },
        { provide: DataSource, useValue: mockDataSource },
      ],
    }).compile();

    const testService = module.get<TrainingService>(TrainingService);
    const matrix = await testService.getNineBoxMatrix('team-1', '2025-Q1');

    expect(matrix).toHaveLength(1);
    expect(matrix[0].performanceLevel).toBe('high');
    expect(matrix[0].potentialLevel).toBe('high');
    expect(matrix[0].box).toBe('high-high');
  });

  describe('assessCompetency', () => {
    const employee = new Employee();
    employee.id = 'emp-1';

    const competency = new Competency();
    competency.id = 'comp-1';
    competency.name = 'Comunicação';

    it('deve lançar erro se o colaborador não existir', async () => {
      employeeRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assessCompetency('emp-1', { competencyId: 'comp-1', level: 3 }),
      ).rejects.toThrow('Colaborador não encontrado');
    });

    it('deve lançar erro se a competência não existir', async () => {
      employeeRepository.findOne.mockResolvedValue(employee);
      competencyRepository.findOne.mockResolvedValue(null);

      await expect(
        service.assessCompetency('emp-1', { competencyId: 'comp-1', level: 3 }),
      ).rejects.toThrow('Competência não encontrada');
    });

    it('deve criar uma nova avaliação quando não existe nenhuma para o par colaborador/competência', async () => {
      employeeRepository.findOne.mockResolvedValue(employee);
      competencyRepository.findOne.mockResolvedValue(competency);
      employeeCompetencyRepository.findOne.mockResolvedValue(null);
      employeeCompetencyRepository.create.mockImplementation((data: unknown) => data);

      const result = await service.assessCompetency('emp-1', {
        competencyId: 'comp-1',
        level: 4,
        assessedAt: '2026-01-15',
      });

      expect(employeeCompetencyRepository.create).toHaveBeenCalledWith({
        employeeId: 'emp-1',
        competencyId: 'comp-1',
        level: 4,
        assessedAt: '2026-01-15',
      });
      expect(result).toEqual(
        expect.objectContaining({ employeeId: 'emp-1', competencyId: 'comp-1', level: 4 }),
      );
    });

    it('deve atualizar o nível de uma avaliação já existente em vez de duplicar', async () => {
      const existing = {
        employeeId: 'emp-1',
        competencyId: 'comp-1',
        level: 2,
        assessedAt: '2025-01-01',
      };
      employeeRepository.findOne.mockResolvedValue(employee);
      competencyRepository.findOne.mockResolvedValue(competency);
      employeeCompetencyRepository.findOne.mockResolvedValue(existing);

      const result = await service.assessCompetency('emp-1', {
        competencyId: 'comp-1',
        level: 5,
        assessedAt: '2026-01-15',
      });

      expect(employeeCompetencyRepository.create).not.toHaveBeenCalled();
      expect(result).toEqual(expect.objectContaining({ level: 5, assessedAt: '2026-01-15' }));
    });
  });
});
