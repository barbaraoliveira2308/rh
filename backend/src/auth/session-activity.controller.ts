import { Controller, Post, UseGuards, HttpCode, HttpStatus } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { AllowMfaSetup } from './decorators';

// Fora do AuthController de propósito: o AuthAuditInterceptor regista cada pedido daquele
// controller, e este endpoint é chamado até uma vez por minuto por utilizador ativo.
@ApiTags('Auth')
@Controller('auth')
export class SessionActivityController {
  // O trabalho é todo do JwtAuthGuard, que renova a atividade da sessão (BR-AUTH-005). O frontend
  // chama-o quando o utilizador interage sem gerar pedidos à API (ex.: a ler uma página longa).
  @Post('activity')
  @UseGuards(JwtAuthGuard)
  @AllowMfaSetup()
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Registar atividade do utilizador (timeout por inatividade)' })
  @HttpCode(HttpStatus.NO_CONTENT)
  activity(): void {
    return;
  }
}
