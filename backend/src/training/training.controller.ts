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
import { CreateCourseDto } from './dto/create-course.dto';
import { EnrollEmployeeDto } from './dto/enroll-employee.dto';
import { CompleteEnrollmentDto } from './dto/complete-enrollment.dto';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';
import { CreateCompetencyDto } from './dto/create-competency.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';

interface RequestWithUser extends Request {
  user?: { sub: string; role: RoleEnum };
}

@ApiTags('Training')
@Controller('training')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class TrainingController {
  constructor(private readonly trainingService: TrainingService) {}

  @Get('courses')
  @ApiOperation({ summary: 'Listar cursos' })
  async getCourses() {
    return this.trainingService.findCourses();
  }

  @Post('courses')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar curso' })
  async createCourse(@Body() dto: CreateCourseDto) {
    return this.trainingService.createCourse(dto);
  }

  @Post('courses/:id/enroll')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Inscrever colaborador num curso' })
  async enroll(
    @Param('id') courseId: string,
    @Body() dto: EnrollEmployeeDto,
    @Req() req: RequestWithUser,
  ) {
    this.ensureSelfOrAdmin(dto.employeeId, req);
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
  async getRecords(@Param('employeeId') employeeId: string, @Req() req: RequestWithUser) {
    this.ensureSelfOrAdmin(employeeId, req);
    return this.trainingService.findRecordsByEmployee(employeeId);
  }

  @Get('reviews')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Listar avaliações de desempenho' })
  async getReviews(
    @Query('employeeId') employeeId: string,
    @Query('teamId') teamId: string,
    @Req() req: RequestWithUser,
  ) {
    const options: { employeeId?: string; teamId?: string } = {};

    if (employeeId) {
      options.employeeId = employeeId;
    }

    if (teamId) {
      options.teamId = teamId;
    }

    return this.trainingService.findReviews(req.user?.sub ?? '', options);
  }

  @Post('reviews')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar avaliação de desempenho' })
  async createReview(@Body() dto: CreateReviewDto, @Req() req: RequestWithUser) {
    return this.trainingService.createReview(req.user?.sub ?? '', dto);
  }

  @Patch('reviews/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Editar avaliação em rascunho' })
  async updateReview(
    @Param('id') id: string,
    @Body() dto: UpdateReviewDto,
    @Req() req: RequestWithUser,
  ) {
    return this.trainingService.updateReview(req.user?.sub ?? '', id, dto);
  }

  @Post('reviews/:id/submit')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Submeter avaliação de desempenho' })
  async submitReview(@Param('id') id: string, @Req() req: RequestWithUser) {
    return this.trainingService.submitReview(req.user?.sub ?? '', id);
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

  private ensureSelfOrAdmin(employeeId: string, req: RequestWithUser): void {
    const user = req.user;

    if (!user) {
      throw new ForbiddenException('Utilizador não autenticado');
    }

    if (user.role === RoleEnum.ADMIN) {
      return;
    }

    if (user.sub === employeeId) {
      return;
    }

    throw new ForbiddenException('Acesso negado');
  }
}
