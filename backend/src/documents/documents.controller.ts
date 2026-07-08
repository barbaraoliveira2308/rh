import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Req,
  HttpCode,
  HttpStatus,
  Res,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiConsumes } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { DocumentsService } from './services/documents.service';
import { UploadDocumentDto } from './dto/upload-document.dto';
import { Document } from './entities/document.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../rbac/guards/roles.guard';
import { Roles } from '../rbac/decorators/roles.decorator';
import { RoleEnum } from '../rbac/enums/role.enum';
import { JwtPayload } from '../auth/interfaces/jwt-payload.interface';

@Controller()
@ApiTags('Documents')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class DocumentsController {
  constructor(private readonly documentsService: DocumentsService) {}

  @Post('documents')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Upload de documento' })
  @ApiConsumes('multipart/form-data')
  @UseInterceptors(FileInterceptor('file'))
  @HttpCode(HttpStatus.CREATED)
  async upload(
    @UploadedFile() file: Express.Multer.File,
    @Body() metadata: UploadDocumentDto,
    @Req() req: Request,
  ): Promise<Document> {
    const user = req.user as JwtPayload;
    return this.documentsService.upload(file, metadata, user.sub);
  }

  @Get('documents')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Listar documentos' })
  @HttpCode(HttpStatus.OK)
  async findAll(
    @Query('category') category?: string,
    @Query('ownerId') ownerId?: string,
  ): Promise<Document[]> {
    return this.documentsService.findAll({ category, ownerId });
  }

  @Get('documents/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Obter documento por ID' })
  @HttpCode(HttpStatus.OK)
  async findOne(@Param('id') id: string): Promise<Document> {
    return this.documentsService.findOne(id);
  }

  @Get('documents/:id/download')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.APPROVER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Download de documento (redirect para presigned URL)' })
  @HttpCode(HttpStatus.FOUND)
  async download(@Param('id') id: string, @Res() res: Response): Promise<void> {
    const url = await this.documentsService.getPresignedUrl(id);
    res.redirect(HttpStatus.FOUND, url);
  }

  @Delete('documents/:id')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Mover documento para a lixeira' })
  @HttpCode(HttpStatus.OK)
  async moveToTrash(@Param('id') id: string): Promise<{ message: string }> {
    await this.documentsService.moveToTrash(id);
    return { message: 'Documento movido para a lixeira' };
  }

  @Post('documents/:id/restore')
  @Roles(RoleEnum.ADMIN, RoleEnum.MANAGER, RoleEnum.EMPLOYEE)
  @ApiOperation({ summary: 'Restaurar documento da lixeira' })
  @HttpCode(HttpStatus.OK)
  async restore(@Param('id') id: string): Promise<Document> {
    return this.documentsService.restore(id);
  }
}
