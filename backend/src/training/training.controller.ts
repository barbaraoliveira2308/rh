import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  UseGuards,
  Req,
  HttpCode,
  HttpStatus,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { TrainingService } from './services/training.service';
import { Course } from './entities/course.entity';
import { CourseEnrollment } from './entities/course-enrollment.entity';
import { CreateCourseDto } from './dto/create-course.dto';
import { UpdateCourseDto } from './dto/update-course.dto';
import { EnrollEmployeeDto } from './dto/enroll-employee.dto';
import { CompleteEnrollmentDto } from './dto/complete-enrollment.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { AssessCompetencyDto } from './dto/assess-competency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmployeeIdentityService } from '../auth/services/employee-identity.service';

@ApiTags('Training')
@Controller('training')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TrainingController {
  constructor(
    private readonly trainingService: TrainingService,
    private readonly employeeIdentity: EmployeeIdentityService,
  ) {}

  @Get('courses')
  @ApiOperation({ summary: 'Listar cursos' })
  async getCourses() {
    return this.trainingService.findCourses();
  }

  @Get('me')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar cursos em que o colaborador autenticado está inscrito' })
  async getMyEnrollments(@Req() req: Request): Promise<CourseEnrollment[]> {
    const user = req.user as JwtPayload;
    const employeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.trainingService.findEnrollmentsByEmployee(employeeId);
  }

  @Post('courses')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar curso' })
  async createCourse(@Body() dto: CreateCourseDto): Promise<Course> {
    return this.trainingService.createCourse(dto);
  }

  @Patch('courses/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Editar curso de formação (admin ou gestor)' })
  async updateCourse(@Param('id') id: string, @Body() dto: UpdateCourseDto): Promise<Course> {
    return this.trainingService.updateCourse(id, dto);
  }

  @Post('courses/:id/enroll')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscrever colaborador num curso' })
  async enroll(@Param('id') courseId: string, @Body() dto: EnrollEmployeeDto, @Req() req: Request) {
    await this.ensureSelfOrPrivileged(dto.employeeId, req);
    return this.trainingService.enroll(dto.employeeId, courseId);
  }

  @Post('enrollments/:id/complete')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Marcar inscrição como concluída' })
  async completeEnrollment(@Param('id') enrollmentId: string, @Body() dto: CompleteEnrollmentDto) {
    return this.trainingService.complete(enrollmentId, dto.score, dto.certificateUrl);
  }

  @Get('records/:employeeId')
  @ApiOperation({ summary: 'Histórico de formação de um colaborador' })
  async getRecords(@Param('employeeId') employeeId: string, @Req() req: Request) {
    await this.ensureSelfOrPrivileged(employeeId, req);
    return this.trainingService.findRecordsByEmployee(employeeId);
  }

  @Get('reviews')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Listar avaliações de desempenho' })
  async getReviews(
    @Query('employeeId') employeeId: string,
    @Query('teamId') teamId: string,
    @Req() req: Request,
  ) {
    const user = req.user as JwtPayload;
    const options: { employeeId?: string; teamId?: string } = {};

    if (employeeId) {
      options.employeeId = employeeId;
    }

    if (teamId) {
      options.teamId = teamId;
    }

    return this.trainingService.findReviews(user.sub, options);
  }

  @Post('reviews')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar avaliação de desempenho' })
  async createReview(@Body() dto: CreateReviewDto, @Req() req: Request) {
    const user = req.user as JwtPayload;
    const reviewerId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.trainingService.createReview(reviewerId, dto);
  }

  @Patch('reviews/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Editar avaliação em rascunho' })
  async updateReview(@Param('id') id: string, @Body() dto: UpdateReviewDto, @Req() req: Request) {
    const user = req.user as JwtPayload;
    const reviewerId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.trainingService.updateReview(reviewerId, id, dto);
  }

  @Post('reviews/:id/submit')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submeter avaliação de desempenho' })
  async submitReview(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as JwtPayload;
    const reviewerId = await this.employeeIdentity.resolveEmployeeId(user.sub);
    return this.trainingService.submitReview(reviewerId, id);
  }

  @Get('nine-box')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Matriz 9-box da equipa' })
  async getNineBox(@Query('teamId') teamId: string, @Query('reviewCycle') reviewCycle: string) {
    return this.trainingService.getNineBoxMatrix(teamId, reviewCycle);
  }

  @Get('competencies')
  @ApiOperation({ summary: 'Listar competências' })
  async getCompetencies() {
    return this.trainingService.findCompetencies();
  }

  @Post('competencies')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar competência' })
  async createCompetency(@Body() dto: CreateCompetencyDto) {
    return this.trainingService.createCompetency(dto);
  }

  @Get('competencies/matrix')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Matriz de competências da equipa' })
  async getCompetencyMatrix(@Query('teamId') teamId: string) {
    return this.trainingService.getCompetencyMatrix(teamId);
  }

  @Post('competencies/:employeeId/assess')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Atribuir/atualizar o nível de uma competência a um colaborador' })
  async assessCompetency(
    @Param('employeeId') employeeId: string,
    @Body() dto: AssessCompetencyDto,
  ) {
    return this.trainingService.assessCompetency(employeeId, dto);
  }

  private async ensureSelfOrPrivileged(employeeId: string, req: Request): Promise<void> {
    const user = req.user as JwtPayload | undefined;

    if (!user) {
      throw new ForbiddenException('Utilizador não autenticado');
    }

    if (user.roles.includes(RoleEnum.ADMIN) || user.roles.includes(RoleEnum.MANAGER)) {
      return;
    }

    const callerEmployeeId = await this.employeeIdentity.resolveEmployeeId(user.sub);

    if (callerEmployeeId === employeeId) {
      return;
    }

    throw new ForbiddenException('Acesso negado');
  }
}
