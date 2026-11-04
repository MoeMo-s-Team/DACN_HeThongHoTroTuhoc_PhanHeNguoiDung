import { ForbiddenException, Injectable } from '@nestjs/common';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackRequestDto, CreateFeedbackResponseDto } from './feedback.dto';

function forbidden() {
  return new ForbiddenException({
    code: 'FORBIDDEN_RESOURCE',
    message: 'Không có quyền thực hiện thao tác này.',
    details: null,
  });
}

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, input: CreateFeedbackRequestDto): Promise<CreateFeedbackResponseDto> {
    if (user.role !== 'STUDENT' && user.role !== 'TEACHER') throw forbidden();

    return this.prisma.feedback.create({
      data: { userId: user.id, tag: input.tag, rating: input.rating, content: input.content },
      select: { id: true, tag: true, rating: true, content: true, createdAt: true },
    });
  }
}
