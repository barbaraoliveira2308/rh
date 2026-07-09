import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Course } from '../entities/course.entity';
import { CourseEnrollment } from '../entities/course-enrollment.entity';
import { TrainingRecord } from '../entities/training-record.entity';
import { PerformanceReview } from '../entities/performance-review.entity';
import { Competency } from '../entities/competency.entity';
import { EmployeeCompetency } from '../entities/employee-competency.entity';
import { CourseStatus } from '../entities/course-status.enum';
import { EnrollmentStatus } from '../entities/enrollment-status.enum';
import { ReviewStatus } from '../entities/review-status.enum';
import { Employee, EmployeeStatus } from '../../users/entities/employee.entity';
import { TeamMember } from '../../teams/entities/team-member.entity';
import { CreateCourseDto } from '../dto/create-course.dto';
import { CreateReviewDto } from '../dto/create-review.dto';
import { UpdateReviewDto } from '../dto/update-review.dto';
import { CreateCompetencyDto } from '../dto/create-competency.dto';

export interface CompetencyMatrixItem {
  employeeId: string;
  employeeName: string;
  competencyId: string;
  competencyName: string;
  level: number;
}

export interface NineBoxItem {
  employeeId: string;
  employeeName: string;
  performance: number;
  potential: number;
  performanceLevel: 'low' | 'medium' | 'high';
  potentialLevel: 'low' | 'medium' | 'high';
  box: string;
}

@Injectable()
export class TrainingService {
  constructor(
    @InjectRepository(Course)
    private readonly courseRepository: Repository<Course>,
    @InjectRepository(CourseEnrollment)
    private readonly enrollmentRepository: Repository<CourseEnrollment>,
    @InjectRepository(TrainingRecord)
    private readonly trainingRecordRepository: Repository<TrainingRecord>,
    @InjectRepository(PerformanceReview)
    private readonly reviewRepository: Repository<PerformanceReview>,
    @InjectRepository(Competency)
    private readonly competencyRepository: Repository<Competency>,
    @InjectRepository(EmployeeCompetency)
    private readonly employeeCompetencyRepository: Repository<EmployeeCompetency>,
    @InjectRepository(Employee)
    private readonly employeeRepository: Repository<Employee>,
    @InjectRepository(TeamMember)
    private readonly teamMemberRepository: Repository<TeamMember>,
  ) {}

  async createCourse(dto: CreateCourseDto): Promise<Course> {
    const course = this.courseRepository.create({
      name: dto.name,
      description: dto.description ?? null,
      provider: dto.provider ?? null,
      durationHours: dto.durationHours ?? null,
      isMandatory: dto.isMandatory ?? false,
      category: dto.category ?? null,
      startDate: dto.startDate ?? null,
      endDate: dto.endDate ?? null,
      status: dto.status ?? CourseStatus.PLANNED,
      prerequisiteCourseId: dto.prerequisiteCourseId ?? null,
    });

    return this.courseRepository.save(course);
  }

  async findCourses(): Promise<Course[]> {
    return this.courseRepository.find({ order: { createdAt: 'DESC' } });
  }

  async findOneCourse(id: string): Promise<Course> {
    const course = await this.courseRepository.findOne({ where: { id } });

    if (!course) {
      throw new NotFoundException('Curso não encontrado');
    }

    return course;
  }

  async enroll(employeeId: string, courseId: string): Promise<CourseEnrollment> {
    const employee = await this.employeeRepository.findOne({ where: { id: employeeId } });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    if (employee.status !== EmployeeStatus.ACTIVE) {
      throw new BadRequestException('Colaborador inativo não pode ser inscrito');
    }

    const course = await this.courseRepository.findOne({ where: { id: courseId } });

    if (!course) {
      throw new NotFoundException('Curso não encontrado');
    }

    if (course.status === CourseStatus.COMPLETED) {
      throw new BadRequestException('Não é possível inscrever num curso já concluído');
    }

    if (course.prerequisiteCourseId) {
      const prerequisiteCompleted = await this.enrollmentRepository.findOne({
        where: {
          courseId: course.prerequisiteCourseId,
          employeeId,
          status: EnrollmentStatus.COMPLETED,
        },
      });

      if (!prerequisiteCompleted) {
        throw new BadRequestException('Pré-requisito não cumprido');
      }
    }

    const existing = await this.enrollmentRepository.findOne({
      where: { courseId, employeeId },
    });

    if (existing) {
      throw new BadRequestException('Colaborador já inscrito neste curso');
    }

    const enrollment = this.enrollmentRepository.create({
      courseId,
      employeeId,
      status: EnrollmentStatus.ENROLLED,
      completionDate: null,
      score: null,
      certificateUrl: null,
    });

    return this.enrollmentRepository.save(enrollment);
  }

  async complete(
    enrollmentId: string,
    score?: number,
    certificateUrl?: string,
  ): Promise<CourseEnrollment> {
    const enrollment = await this.enrollmentRepository.findOne({
      where: { id: enrollmentId },
      relations: ['course'],
    });

    if (!enrollment) {
      throw new NotFoundException('Inscrição não encontrada');
    }

    enrollment.status = EnrollmentStatus.COMPLETED;
    enrollment.completionDate = new Date().toISOString().split('T')[0];
    enrollment.score = score ?? null;
    enrollment.certificateUrl = certificateUrl ?? null;

    const saved = await this.enrollmentRepository.save(enrollment);

    const record = this.trainingRecordRepository.create({
      employeeId: enrollment.employeeId,
      courseId: enrollment.courseId,
      enrollmentId: enrollment.id,
      completedAt: new Date(),
      score: score ?? null,
      certificateUrl: certificateUrl ?? null,
    });

    await this.trainingRecordRepository.save(record);

    return saved;
  }

  async findRecordsByEmployee(employeeId: string): Promise<TrainingRecord[]> {
    return this.trainingRecordRepository.find({
      where: { employeeId },
      relations: ['course'],
      order: { completedAt: 'DESC' },
    });
  }

  async createReview(reviewerId: string, dto: CreateReviewDto): Promise<PerformanceReview> {
    const employee = await this.employeeRepository.findOne({ where: { id: dto.employeeId } });

    if (!employee) {
      throw new NotFoundException('Colaborador não encontrado');
    }

    const review = this.reviewRepository.create({
      employeeId: dto.employeeId,
      reviewerId,
      period: dto.period,
      status: ReviewStatus.DRAFT,
      overallRating: dto.overallRating ?? null,
      potentialRating: dto.potentialRating ?? null,
      strengths: dto.strengths ?? null,
      improvementAreas: dto.improvementAreas ?? null,
      objectivesNext: dto.objectivesNext ?? null,
    });

    return this.reviewRepository.save(review);
  }

  async updateReview(
    reviewerId: string,
    reviewId: string,
    dto: UpdateReviewDto,
  ): Promise<PerformanceReview> {
    const review = await this.reviewRepository.findOne({ where: { id: reviewId } });

    if (!review) {
      throw new NotFoundException('Avaliação não encontrada');
    }

    if (review.reviewerId !== reviewerId) {
      throw new ForbiddenException('Apenas o reviewer pode editar a avaliação');
    }

    if (review.status !== ReviewStatus.DRAFT) {
      throw new BadRequestException('Apenas avaliações em rascunho podem ser editadas');
    }

    if (dto.overallRating !== undefined) {
      review.overallRating = dto.overallRating;
    }

    if (dto.potentialRating !== undefined) {
      review.potentialRating = dto.potentialRating;
    }

    if (dto.strengths !== undefined) {
      review.strengths = dto.strengths;
    }

    if (dto.improvementAreas !== undefined) {
      review.improvementAreas = dto.improvementAreas;
    }

    if (dto.objectivesNext !== undefined) {
      review.objectivesNext = dto.objectivesNext;
    }

    return this.reviewRepository.save(review);
  }

  async submitReview(reviewerId: string, reviewId: string): Promise<PerformanceReview> {
    const review = await this.reviewRepository.findOne({ where: { id: reviewId } });

    if (!review) {
      throw new NotFoundException('Avaliação não encontrada');
    }

    if (review.reviewerId !== reviewerId) {
      throw new ForbiddenException('Apenas o reviewer pode submeter a avaliação');
    }

    review.status = ReviewStatus.SUBMITTED;

    return this.reviewRepository.save(review);
  }

  async findReviews(
    _requesterId: string,
    options: { employeeId?: string; teamId?: string } = {},
  ): Promise<PerformanceReview[]> {
    const where: Record<string, unknown> = {};

    if (options.employeeId) {
      where.employeeId = options.employeeId;
    }

    if (options.teamId) {
      const members = await this.teamMemberRepository.find({
        where: { teamId: options.teamId },
      });

      const employeeIds = members.map((member) => member.employeeId);

      if (employeeIds.length === 0) {
        return [];
      }

      where.employeeId = In(employeeIds);
    }

    return this.reviewRepository.find({
      where,
      relations: ['employee', 'reviewer'],
      order: { createdAt: 'DESC' },
    });
  }

  async getCompetencyMatrix(teamId: string): Promise<CompetencyMatrixItem[]> {
    const members = await this.teamMemberRepository.find({
      where: { teamId },
      relations: ['employee'],
    });

    const employeeIds = members.map((member) => member.employeeId);

    if (employeeIds.length === 0) {
      return [];
    }

    const competencies = await this.employeeCompetencyRepository.find({
      where: { employeeId: In(employeeIds) },
      relations: ['employee', 'competency'],
    });

    return competencies.map((item) => ({
      employeeId: item.employeeId,
      employeeName: item.employee.firstName + ' ' + item.employee.lastName,
      competencyId: item.competencyId,
      competencyName: item.competency.name,
      level: item.level,
    }));
  }

  async getNineBoxMatrix(teamId: string, reviewCycle: string): Promise<NineBoxItem[]> {
    const members = await this.teamMemberRepository.find({
      where: { teamId },
      relations: ['employee'],
    });

    const employeeIds = members.map((member) => member.employeeId);

    if (employeeIds.length === 0) {
      return [];
    }

    const reviews = await this.reviewRepository.find({
      where: {
        employeeId: In(employeeIds),
        period: reviewCycle,
        status: ReviewStatus.SUBMITTED,
      },
      relations: ['employee'],
    });

    const reviewsByEmployee = new Map<string, PerformanceReview[]>();

    for (const review of reviews) {
      const list = reviewsByEmployee.get(review.employeeId) ?? [];
      list.push(review);
      reviewsByEmployee.set(review.employeeId, list);
    }

    const result: NineBoxItem[] = [];

    for (const employeeId of employeeIds) {
      const employee = members.find((member) => member.employeeId === employeeId)?.employee;

      if (!employee) {
        continue;
      }

      const employeeReviews = reviewsByEmployee.get(employeeId) ?? [];
      const performance = this.average(employeeReviews.map((review) => review.overallRating));
      const potential = this.average(employeeReviews.map((review) => review.potentialRating));

      if (performance === null || potential === null) {
        continue;
      }

      const performanceLevel = this.toLevel(performance);
      const potentialLevel = this.toLevel(potential);

      result.push({
        employeeId,
        employeeName: employee.firstName + ' ' + employee.lastName,
        performance,
        potential,
        performanceLevel,
        potentialLevel,
        box: potentialLevel + '-' + performanceLevel,
      });
    }

    return result;
  }

  async createCompetency(dto: CreateCompetencyDto): Promise<Competency> {
    const competency = this.competencyRepository.create({
      name: dto.name,
      category: dto.category ?? null,
      description: dto.description ?? null,
    });

    return this.competencyRepository.save(competency);
  }

  async findCompetencies(): Promise<Competency[]> {
    return this.competencyRepository.find({ order: { name: 'ASC' } });
  }

  private average(values: (number | null)[]): number | null {
    const valid = values.filter((value): value is number => value !== null);

    if (valid.length === 0) {
      return null;
    }

    return valid.reduce((sum, value) => sum + value, 0) / valid.length;
  }

  private toLevel(value: number): 'low' | 'medium' | 'high' {
    if (value <= 2) {
      return 'low';
    }

    if (value <= 3) {
      return 'medium';
    }

    return 'high';
  }
}
