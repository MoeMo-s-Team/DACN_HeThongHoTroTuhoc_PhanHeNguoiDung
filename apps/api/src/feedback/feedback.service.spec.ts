import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../auth/auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { FeedbackService } from './feedback.service';

const student: AuthUser = {
  id: '10000000-0000-4000-8000-000000000001',
  fullName: 'Student One',
  email: 'student.one@example.test',
  role: 'STUDENT',
  status: 'ACTIVE',
};
const input = { tag: 'UI_UX' as const, rating: 3, content: '  Improve the navigation.  ' };
const createdAt = new Date('2026-11-04T03:00:00.000Z');

describe('FeedbackService', () => {
  it.each(['STUDENT', 'TEACHER'] as const)('stores feedback for an authenticated %s', async (role) => {
    const create = jest.fn().mockResolvedValue({ id: 'feedback-id', ...input, createdAt });
    const service = new FeedbackService({ feedback: { create } } as unknown as PrismaService);

    await expect(service.create({ ...student, role }, input)).resolves.toEqual({
      id: 'feedback-id', tag: 'UI_UX', rating: 3, content: input.content, createdAt,
    });
    expect(create).toHaveBeenCalledWith({
      data: { userId: student.id, ...input },
      select: { id: true, tag: true, rating: true, content: true, createdAt: true },
    });
  });

  it('rejects Administrator without writing feedback', async () => {
    const create = jest.fn();
    const service = new FeedbackService({ feedback: { create } } as unknown as PrismaService);

    await expect(service.create({ ...student, role: 'ADMINISTRATOR' }, input)).rejects.toBeInstanceOf(ForbiddenException);
    expect(create).not.toHaveBeenCalled();
  });

  it('propagates persistence failures for the API error filter', async () => {
    const create = jest.fn().mockRejectedValue(new Error('database unavailable'));
    const service = new FeedbackService({ feedback: { create } } as unknown as PrismaService);

    await expect(service.create(student, input)).rejects.toThrow('database unavailable');
  });
});
