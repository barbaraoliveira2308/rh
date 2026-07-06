import { Controller, Post, Body, UseGuards, Get, Req } from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { LoginDto, RegisterDto, RefreshTokenDto, MfaVerifyDto } from './dto';
import { JwtAuthGuard } from './guards';

@ApiTags('Auth')
@Controller('api/v1/auth')
export class AuthController {
  @Post('login')
  @ApiOperation({ summary: 'Autenticar utilizador' })
  login(@Body() _dto: LoginDto): void {
    return;
  }

  @Post('register')
  @ApiOperation({ summary: 'Registar novo utilizador' })
  register(@Body() _dto: RegisterDto): void {
    return;
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Renovar access token' })
  refresh(@Body() _dto: RefreshTokenDto): void {
    return;
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Terminar sessão' })
  logout(): void {
    return;
  }

  @Post('mfa/verify')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Verificar código MFA' })
  verifyMfa(@Body() _dto: MfaVerifyDto): void {
    return;
  }

  @Get('me')
  @UseGuards(JwtAuthGuard)
  @ApiOperation({ summary: 'Obter perfil do utilizador autenticado' })
  getProfile(@Req() _req: unknown): void {
    return;
  }
}
