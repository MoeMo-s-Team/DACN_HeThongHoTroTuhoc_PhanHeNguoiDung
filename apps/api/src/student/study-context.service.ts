import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth.service';
import { ValidateStudyContextRequestDto, ValidateStudyContextResponseDto } from './study-context.dto';

@Injectable()
export class StudyContextService {
  validate(user: AuthUser, input: ValidateStudyContextRequestDto, now = new Date()): ValidateStudyContextResponseDto {
    if (user.role !== 'STUDENT') {
      throw new ForbiddenException({ code: 'FORBIDDEN_RESOURCE', message: 'Không có quyền truy cập tài nguyên này.', details: null });
    }

    const goal = input.goal.trim();
    if (!goal) throw new BadRequestException(['goal must not be empty']);
    if (new Date(input.targetDeadline) <= now) throw new BadRequestException(['targetDeadline must be in the future']);

    return {
      goal,
      availableMinutesPerWeek: input.availableHoursPerWeek * 60,
      targetDeadline: input.targetDeadline,
    };
  }
}
