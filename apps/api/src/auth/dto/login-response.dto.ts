import { ApiProperty } from '@nestjs/swagger';
import { UserSummaryDto } from './user-summary.dto';

export class LoginResponseDto {
  @ApiProperty({ type: String })
  accessToken!: string;

  @ApiProperty({ type: UserSummaryDto })
  user!: UserSummaryDto;
}
