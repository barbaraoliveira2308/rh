import { ApiProperty } from '@nestjs/swagger';

class PendingPolicySummaryDto {
  @ApiProperty()
  id: string;

  @ApiProperty()
  title: string;

  @ApiProperty()
  version: number;
}

export class PendingAcceptanceUserDto {
  @ApiProperty()
  userId: string;

  @ApiProperty()
  email: string;

  @ApiProperty()
  username: string;

  @ApiProperty({ type: [PendingPolicySummaryDto] })
  pendingPolicies: PendingPolicySummaryDto[];
}
