import { ForbiddenException } from '@nestjs/common';
import { AuthUser } from '../auth/auth.service';
import { StudyContextService } from './study-context.service';

const student: AuthUser = {
  id: '10000000-0000-4000-8000-000000000001',
  fullName: 'Student One',
  email: 'student.one@example.test',
  role: 'STUDENT',
  status: 'ACTIVE',
};

describe('StudyContextService', () => {
  const service = new StudyContextService();

  it('trims the goal and normalizes fractional weekly hours into minutes', () => {
    expect(service.validate(student, {
      goal: '  Học cấu trúc dữ liệu  ',
      availableHoursPerWeek: 7.5,
      targetDeadline: '2026-12-01T00:00:00.000Z',
    }, new Date('2026-11-01T00:00:00.000Z'))).toEqual({
      goal: 'Học cấu trúc dữ liệu',
      availableMinutesPerWeek: 450,
      targetDeadline: '2026-12-01T00:00:00.000Z',
    });
  });

  it('rejects a non-Student before processing the request', () => {
    expect(() => service.validate({ ...student, role: 'TEACHER' }, {
      goal: 'Goal', availableHoursPerWeek: 1, targetDeadline: '2026-12-01T00:00:00.000Z',
    })).toThrow(ForbiddenException);
  });
});
