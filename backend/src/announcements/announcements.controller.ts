import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Req,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';
import { EmployeeIdentityService } from '../auth/services/employee-identity.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { AnnouncementsService } from './announcements.service';
import {
  AnnouncementQueryDto,
  CreateAnnouncementAssetDto,
  CreateAnnouncementDto,
  CreateAnnouncementFormResponseDto,
  UpdateAnnouncementDto,
} from './dto/announcement.dto';
import { AnnouncementAssetType } from './entities/announcement-asset.entity';

@Controller('announcements')
@ApiTags('Announcements')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
export class AnnouncementsController {
  constructor(
    private readonly announcementsService: AnnouncementsService,
    private readonly employeeIdentity: EmployeeIdentityService,
  ) {}

  @Get()
  list(@Query() query: AnnouncementQueryDto) {
    return this.announcementsService.list(query);
  }

  @Post()
  async create(@Body() dto: CreateAnnouncementDto, @Req() req: Request) {
    return this.announcementsService.create(dto, await this.employeeId(req));
  }

  @Patch(':id')
  async update(@Param('id') id: string, @Body() dto: UpdateAnnouncementDto, @Req() req: Request) {
    return this.announcementsService.update(id, dto, await this.employeeId(req));
  }

  @Post(':id/archive')
  async archive(@Param('id') id: string, @Req() req: Request) {
    return this.announcementsService.archive(id, await this.employeeId(req));
  }

  @Post(':id/assets/link')
  async addLink(
    @Param('id') id: string,
    @Body() dto: CreateAnnouncementAssetDto,
    @Req() req: Request,
  ) {
    return this.announcementsService.addLink(id, dto, await this.employeeId(req));
  }

  @Post(':id/assets/upload')
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  upload(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
    @Query('assetType') assetType: AnnouncementAssetType,
    @Req() req: Request,
  ): Promise<unknown> {
    return this.employeeId(req).then((employeeId) =>
      this.announcementsService.uploadAsset(id, file, employeeId, assetType),
    );
  }

  @Post('forms/:formId/responses')
  async respond(
    @Param('formId') formId: string,
    @Body() dto: CreateAnnouncementFormResponseDto,
    @Req() req: Request,
  ) {
    return this.announcementsService.respond(formId, dto, await this.employeeId(req));
  }

  @Get('forms/:formId/responses')
  async responses(@Param('formId') formId: string, @Req() req: Request) {
    return this.announcementsService.listResponses(formId, await this.employeeId(req));
  }

  @Get('assets/:assetId/download')
  async downloadAsset(@Param('assetId') assetId: string, @Res() res: Response): Promise<void> {
    const file = await this.announcementsService.getAssetStream(assetId);
    res.setHeader('Content-Disposition', 'inline; filename="' + file.filename + '"');
    res.setHeader('Content-Type', file.contentType);
    file.stream.pipe(res);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.announcementsService.findOne(id);
  }

  private async employeeId(req: Request): Promise<string> {
    const user = req.user as JwtPayload;
    return this.employeeIdentity.resolveEmployeeId(user.sub);
  }
}
