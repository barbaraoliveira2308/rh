import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  Patch,
  Delete,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
  ParseIntPipe,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { Request } from 'express';
import { CalendarService, CalendarEvent } from './services/calendar.service';
import { PublicHoliday } from './entities/public-holiday.entity';
import { CompanyEvent } from './entities/company-event.entity';
import { BlockedPeriod } from './entities/blocked-period.entity';
import { CreatePublicHolidayDto } from './dto/create-public-holiday.dto';
import { CreateCompanyEventDto } from './dto/create-company-event.dto';
import { CreateBlockedPeriodDto } from './dto/create-blocked-period.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller()
@ApiTags('Calendar')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CalendarController {
  constructor(private readonly calendarService: CalendarService) {}

  @Get('calendar')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Vista mensal do calendário organizacional' })
  @HttpCode(HttpStatus.OK)
  async getMonthView(
    @Query('year', ParseIntPipe) year: number,
    @Query('month', ParseIntPipe) month: number,
    @Query('teamId') teamId?: string,
  ): Promise<CalendarEvent[]> {
    return this.calendarService.getMonthView(year, month, teamId);
  }

  @Get('calendar/holidays')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar feriados públicos' })
  @HttpCode(HttpStatus.OK)
  async findHolidays(
    @Query('year', ParseIntPipe) year: number,
    @Query('countryCode') countryCode?: string,
  ): Promise<PublicHoliday[]> {
    return this.calendarService.findHolidays(year, countryCode);
  }

  @Post('calendar/holidays/import')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Importar feriados de Portugal via API pública' })
  @HttpCode(HttpStatus.CREATED)
  async importHolidays(@Query('year', ParseIntPipe) year: number): Promise<{ imported: number }> {
    const imported = await this.calendarService.importPortugalHolidays(year);
    return { imported };
  }

  @Post('calendar/holidays')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Criar feriado manualmente' })
  @HttpCode(HttpStatus.CREATED)
  async createHoliday(@Body() dto: CreatePublicHolidayDto): Promise<PublicHoliday> {
    return this.calendarService.createHoliday(dto);
  }

  @Post('calendar/events')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Criar evento de empresa' })
  @HttpCode(HttpStatus.CREATED)
  async createEvent(
    @Body() dto: CreateCompanyEventDto,
    @Req() req: Request,
  ): Promise<CompanyEvent> {
    const user = req.user as JwtPayload;
    return this.calendarService.createCompanyEvent(dto, user.sub);
  }

  @Patch('calendar/events/:id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Atualizar evento de empresa' })
  @HttpCode(HttpStatus.OK)
  async updateEvent(
    @Param('id') id: string,
    @Body() dto: CreateCompanyEventDto,
  ): Promise<CompanyEvent> {
    return this.calendarService.updateCompanyEvent(id, dto);
  }

  @Delete('calendar/events/:id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Remover evento de empresa' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeEvent(@Param('id') id: string): Promise<void> {
    return this.calendarService.removeCompanyEvent(id);
  }

  @Post('calendar/blocked-periods')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Bloquear período para ausências/timesheets' })
  @HttpCode(HttpStatus.CREATED)
  async createBlockedPeriod(
    @Body() dto: CreateBlockedPeriodDto,
    @Req() req: Request,
  ): Promise<BlockedPeriod> {
    const user = req.user as JwtPayload;
    return this.calendarService.createBlockedPeriod(dto, user.sub);
  }

  @Delete('calendar/blocked-periods/:id')
  @Roles(RoleEnum.ADMIN)
  @ApiOperation({ summary: 'Remover período bloqueado' })
  @HttpCode(HttpStatus.NO_CONTENT)
  async removeBlockedPeriod(@Param('id') id: string): Promise<void> {
    return this.calendarService.removeBlockedPeriod(id);
  }
}
