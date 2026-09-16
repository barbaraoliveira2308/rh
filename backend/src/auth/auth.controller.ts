import {
  Controller,
  Post,
  Body,
  UseGuards,
  Get,
  Req,
  Query,
  UseInterceptors,
  HttpCode,
  HttpStatus,
  Redirect,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiQuery } from '@nestjs/swagger';
import { Request } from 'express';
import { AuthService } from './services/auth.service';
import { JwtService } from './services/jwt.service';
import { KeycloakService } from './keycloak/keycloak.service';
import {
  LoginDto,
  RefreshTokenDto,
  MfaVerifyDto,
  ChangePasswordDto,
  ResetPasswordDto,
  ConfirmResetPasswordDto,
  MfaDisableDto,
} from './dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RateLimitGuard } from './guards/rate-limit.guard';
import { AuthAuditInterceptor } from './interceptors/auth-audit.interceptor';
import { JwtPayload } from './interfaces/jwt-payload.interface';
import { AllowMfaSetup } from './decorators';

@ApiTags('Auth')
@Controller('auth')
@UseInterceptors(AuthAuditInterceptor)
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly jwtService: JwtService,
    private readonly keycloakService: KeycloakService,
    private readonly configService: ConfigService,
  ) {}

  @Get('sso/redirect')
  @ApiOperation({ summary: 'Redirecionar para Keycloak SSO' })
  @Redirect()
  ssoRedirect(): { url: string; statusCode: number } {
    const redirectUri = `${this.configService.get<string>('APP_URL', 'http://localhost:3000')}/auth/sso/callback`;
    const url = this.keycloakService.getAuthorizationUrl(redirectUri);
    return { url, statusCode: 302 };
  }

  @Get('sso/callback')
  @ApiOperation({ summary: 'Callback do Keycloak SSO' })
  @ApiQuery({ name: 'code', required: true })
  @ApiQuery({ name: 'state', required: false })
  @HttpCode(HttpStatus.OK)
  async ssoCallback(
    @Query('code') code: string,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.ssoLogin(code, this.keycloakService);
  }

  @Post('login')
  @UseGuards(RateLimitGuard)
  @ApiOperation({ summary: 'Autenticar utilizador' })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
  ): Promise<{
    accessToken: string;
    refreshToken: string;
    user: { id: string; email: string; username: string; roles: string[] };
  }> {
    return this.authService.login(
      dto.email,
      dto.password,
      dto.mfaCode,
      req.ip,
      req.headers['user-agent'],
    );
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @AllowMfaSetup()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Terminar sessão' })
  @HttpCode(HttpStatus.OK)
  async logout(@Req() req: Request): Promise<{ message: string }> {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
      return { message: 'Sessão terminada' };
    }
    const token = authHeader.split(' ')[1];
    const tokenHash = this.jwtService.computeTokenHash(token);
    await this.authService.logout(tokenHash);
    return { message: 'Sessão terminada' };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token' })
  @HttpCode(HttpStatus.OK)
  async refresh(
    @Body() dto: RefreshTokenDto,
  ): Promise<{ accessToken: string; refreshToken: string }> {
    return this.authService.refresh(dto.refreshToken);
  }

  @Post('mfa/enable')
  @UseGuards(JwtAuthGuard)
  @AllowMfaSetup()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Iniciar configuração MFA' })
  @HttpCode(HttpStatus.OK)
  async enableMfa(@Req() req: Request): Promise<{ secret: string; qrCodeUrl: string }> {
    const user = req.user as JwtPayload;
    return this.authService.enableMfa(user.sub);
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @AllowMfaSetup()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verificar código MFA e ativar' })
  @HttpCode(HttpStatus.OK)
  async verifyMfa(@Req() req: Request, @Body() dto: MfaVerifyDto): Promise<{ message: string }> {
    const user = req.user as JwtPayload;
    await this.authService.verifyMfa(user.sub, dto.code);
    return { message: 'MFA ativado com sucesso' };
  }

  @Post('mfa/disable')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Desativar MFA' })
  @HttpCode(HttpStatus.OK)
  async disableMfa(@Req() req: Request, @Body() dto: MfaDisableDto): Promise<{ message: string }> {
    const user = req.user as JwtPayload;
    await this.authService.disableMfa(user.sub, dto.code);
    return { message: 'MFA desativado' };
  }

  @Post('password/change')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Alterar password' })
  @HttpCode(HttpStatus.OK)
  async changePassword(
    @Req() req: Request,
    @Body() dto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const user = req.user as JwtPayload;
    await this.authService.changePassword(user.sub, dto.oldPassword, dto.newPassword);
    return { message: 'Password alterada com sucesso' };
  }

  @Post('password/reset-request')
  @ApiOperation({ summary: 'Solicitar reset de password' })
  @HttpCode(HttpStatus.OK)
  async resetPassword(@Body() dto: ResetPasswordDto): Promise<{ message: string }> {
    await this.authService.resetPassword(dto.email);
    return { message: 'Email enviado se a conta existir' };
  }

  @Post('password/reset')
  @ApiOperation({ summary: 'Definir nova password com token de reset' })
  @HttpCode(HttpStatus.OK)
  async confirmResetPassword(@Body() dto: ConfirmResetPasswordDto): Promise<{ message: string }> {
    await this.authService.confirmResetPassword(dto.token, dto.newPassword);
    return { message: 'Password alterada com sucesso' };
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @AllowMfaSetup()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Obter perfil do utilizador autenticado' })
  @HttpCode(HttpStatus.OK)
  async getProfile(@Req() req: Request): Promise<{
    id: string;
    email: string;
    username: string;
    isActive: boolean;
    mfaEnabled: boolean;
    lastLoginAt: Date | null;
    roles: string[];
  }> {
    const user = req.user as JwtPayload;
    return this.authService.getProfile(user.sub);
  }
}
