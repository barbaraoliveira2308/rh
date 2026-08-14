import {
  Controller,
  Get,
  Post,
  Patch,
  Param,
  Body,
  Query,
  Req,
  HttpCode,
  HttpStatus,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiBearerAuth, ApiOperation, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { HelpdeskService } from './helpdesk.service';
import { CreateTicketDto } from './dto/create-ticket.dto';
import { CreateTicketCategoryDto } from './dto/create-ticket-category.dto';
import { AddCommentDto } from './dto/add-comment.dto';
import { AssignTicketDto } from './dto/assign-ticket.dto';
import { UpdateTicketDto } from './dto/update-ticket.dto';

@ApiTags('Helpdesk')
@Controller('helpdesk')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class HelpdeskController {
  constructor(private readonly helpdeskService: HelpdeskService) {}

  @Get('tickets')
  @ApiOperation({ summary: 'Listar tickets' })
  @ApiQuery({ name: 'status', required: false })
  @ApiQuery({ name: 'priority', required: false })
  @ApiQuery({ name: 'categoryId', required: false })
  async findAll(
    @Req() req: Request,
    @Query('status') status?: string,
    @Query('priority') priority?: string,
    @Query('categoryId') categoryId?: string,
  ) {
    const user = req.user as JwtPayload;
    const role = user.roles.includes(RoleEnum.ADMIN)
      ? 'admin'
      : user.roles.includes(RoleEnum.MANAGER)
        ? 'manager'
        : 'employee';
    return this.helpdeskService.findAll(user.sub, role, { status, priority, categoryId });
  }

  @Post('tickets')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar ticket' })
  async create(@Body() dto: CreateTicketDto, @Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.helpdeskService.create(dto, user.sub);
  }

  @Get('tickets/:id')
  @ApiOperation({ summary: 'Obter ticket por ID' })
  async findOne(@Param('id') id: string) {
    return this.helpdeskService.findOne(id);
  }

  @Patch('tickets/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @ApiOperation({ summary: 'Atualizar ticket (admin/manager)' })
  async update(@Param('id') id: string, @Body() dto: UpdateTicketDto) {
    return this.helpdeskService.update(id, dto);
  }

  @Get('tickets/:id/comments')
  @ApiOperation({ summary: 'Listar comentários de um ticket' })
  async findComments(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as JwtPayload;
    const isAgentOrAdmin =
      user.roles.includes(RoleEnum.ADMIN) || user.roles.includes(RoleEnum.MANAGER);
    return this.helpdeskService.findComments(id, isAgentOrAdmin);
  }

  @Post('tickets/:id/comments')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Adicionar comentário a ticket' })
  async addComment(@Param('id') id: string, @Body() dto: AddCommentDto, @Req() req: Request) {
    const user = req.user as JwtPayload;
    return this.helpdeskService.addComment(id, user.sub, dto);
  }

  @Post('tickets/:id/assign')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Atribuir ticket a agente (admin)' })
  async assign(@Param('id') id: string, @Body() dto: AssignTicketDto) {
    return this.helpdeskService.assign(id, dto);
  }

  @Post('tickets/:id/escalate')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Escalar ticket para urgente (admin/manager)' })
  async escalate(@Param('id') id: string) {
    return this.helpdeskService.escalate(id);
  }

  @Post('tickets/:id/close')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Fechar ticket (admin, manager, ou próprio)' })
  async close(@Param('id') id: string, @Req() req: Request) {
    const user = req.user as JwtPayload;
    const role = user.roles.includes(RoleEnum.ADMIN)
      ? 'admin'
      : user.roles.includes(RoleEnum.MANAGER)
        ? 'manager'
        : 'employee';
    return this.helpdeskService.close(id, user.sub, role);
  }

  @Get('categories')
  @ApiOperation({ summary: 'Listar categorias de tickets' })
  async findCategories() {
    return this.helpdeskService.findCategories();
  }

  @Post('categories')
  @Roles(RoleEnum.ADMIN)
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Criar categoria (admin)' })
  async createCategory(@Body() dto: CreateTicketCategoryDto) {
    return this.helpdeskService.createCategory(dto);
  }
}
