import {
  Controller,
  Get,
  Patch,
  Post,
  Body,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  Param,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { NotificationsService } from './services/notifications.service';
import { Notification } from './entities/notification.entity';
import { NotificationPreference } from './entities/notification-preference.entity';
import { UpdatePreferenceDto } from './dto/update-preferences.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller()
@ApiTags('Notifications')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar notificações do utilizador autenticado' })
  @HttpCode(HttpStatus.OK)
  async findByUser(
    @Req() req: Request,
    @Query('page') page = '1',
    @Query('limit') limit = '20',
  ): Promise<{ items: Notification[]; total: number }> {
    const user = req.user as JwtPayload;
    return this.notificationsService.findByUser(user.sub, {
      page: Number.parseInt(page, 10),
      limit: Number.parseInt(limit, 10),
    });
  }

  @Get('notifications/unread-count')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Contar notificações in-app por ler' })
  @HttpCode(HttpStatus.OK)
  async countUnread(@Req() req: Request): Promise<{ count: number }> {
    const user = req.user as JwtPayload;
    const count = await this.notificationsService.countUnread(user.sub);
    return { count };
  }

  @Patch('notifications/:id/read')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Marcar notificação como lida' })
  @HttpCode(HttpStatus.OK)
  async markAsRead(@Param('id') id: string, @Req() req: Request): Promise<Notification> {
    const user = req.user as JwtPayload;
    return this.notificationsService.markAsRead(id, user.sub);
  }

  @Post('notifications/read-all')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Marcar todas as notificações como lidas' })
  @HttpCode(HttpStatus.OK)
  async markAllAsRead(@Req() req: Request): Promise<void> {
    const user = req.user as JwtPayload;
    return this.notificationsService.markAllAsRead(user.sub);
  }

  @Get('notifications/preferences')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Obter preferências de notificação' })
  @HttpCode(HttpStatus.OK)
  async getPreferences(@Req() req: Request): Promise<NotificationPreference[]> {
    const user = req.user as JwtPayload;
    return this.notificationsService.getPreferences(user.sub);
  }

  @Patch('notifications/preferences')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Actualizar preferências de notificação' })
  @HttpCode(HttpStatus.OK)
  async updatePreferences(
    @Req() req: Request,
    @Body() dto: UpdatePreferenceDto[],
  ): Promise<NotificationPreference[]> {
    const user = req.user as JwtPayload;
    return this.notificationsService.updatePreferences(user.sub, dto);
  }
}
