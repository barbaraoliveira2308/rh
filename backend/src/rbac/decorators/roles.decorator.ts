import { SetMetadata } from '@nestjs/common';
import { ROLES_KEY } from '../constants';
import { RoleEnum } from '../enums/role.enum';

export const Roles = (...roles: RoleEnum[]) => SetMetadata(ROLES_KEY, roles);
