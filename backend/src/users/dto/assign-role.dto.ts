import { IsEnum } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';
import { RoleEnum } from '../../rbac/enums/role.enum';

export class AssignRoleDto {
  @ApiProperty({ description: 'Perfil de acesso a atribuir', enum: RoleEnum })
  @IsEnum(RoleEnum)
  role: RoleEnum;
}
