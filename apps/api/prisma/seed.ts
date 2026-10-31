import * as argon2 from 'argon2';
import dotenv from 'dotenv';
import { PrismaClient, Role, StudyPlanStatus, StudyTaskStatus, Priority, FeedbackTag } from '@prisma/client';
import { MVP_COURSE_ID } from '../src/common/mvp-course';

dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../.env.example' });

const prisma = new PrismaClient();
const ids = {
  studentOne: '10000000-0000-4000-8000-000000000001',
  studentTwo: '10000000-0000-4000-8000-000000000002',
  teacher: '10000000-0000-4000-8000-000000000003',
  admin: '10000000-0000-4000-8000-000000000004',
  disabled: '10000000-0000-4000-8000-000000000005',
  course: MVP_COURSE_ID,
  algorithms: '20000000-0000-4000-8000-000000000002',
  databases: '20000000-0000-4000-8000-000000000003',
  networking: '20000000-0000-4000-8000-000000000004',
  dataStructures: '20000000-0000-4000-8000-000000000005',
  javascript: '20000000-0000-4000-8000-000000000006',
  database: '20000000-0000-4000-8000-000000000007',
  testing: '20000000-0000-4000-8000-000000000008',
  api: '20000000-0000-4000-8000-000000000009',
  git: '20000000-0000-4000-8000-000000000010',
  classOne: '30000000-0000-4000-8000-000000000001',
  classTwo: '30000000-0000-4000-8000-000000000002',
  activePlan: '40000000-0000-4000-8000-000000000001',
  archivedPlan: '40000000-0000-4000-8000-000000000002',
} as const;

async function upsertUser(id: string, fullName: string, email: string, role: Role, passwordHash: string, disabled = false) {
  return prisma.user.upsert({
    where: { id },
    update: { fullName, email, role, passwordHash, status: disabled ? 'DISABLED' : 'ACTIVE' },
    create: { id, fullName, email, role, passwordHash, status: disabled ? 'DISABLED' : 'ACTIVE' },
  });
}

async function seed() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12) throw new Error('SEED_PASSWORD must contain at least 12 characters');
  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });

  await upsertUser(ids.studentOne, 'Student One', 'student.one@example.test', Role.STUDENT, passwordHash);
  await upsertUser(ids.studentTwo, 'Student Two', 'student.two@example.test', Role.STUDENT, passwordHash);
  await upsertUser(ids.teacher, 'Demo Teacher', 'teacher@example.test', Role.TEACHER, passwordHash);
  await upsertUser(ids.admin, 'Demo Administrator', 'admin@example.test', Role.ADMINISTRATOR, passwordHash);
  await upsertUser(ids.disabled, 'Disabled Student', 'disabled.student@example.test', Role.STUDENT, passwordHash, true);

  await prisma.course.upsert({
    where: { id: ids.course },
    update: { name: 'Computer Science Foundations', description: 'Seed course for local development.' },
    create: { id: ids.course, name: 'Computer Science Foundations', description: 'Seed course for local development.' },
  });
  for (const [id, name] of [
    [ids.algorithms, 'Algorithms'], [ids.databases, 'Databases'], [ids.networking, 'Networking'],
    [ids.dataStructures, 'Cấu trúc dữ liệu'], [ids.javascript, 'JavaScript'], [ids.database, 'Database'],
    [ids.testing, 'Testing'], [ids.api, 'API'], [ids.git, 'Git'],
  ] as const) {
    await prisma.topic.upsert({ where: { id }, update: { courseId: ids.course, name }, create: { id, courseId: ids.course, name } });
  }

  for (const [id, name] of [[ids.classOne, 'Class A'], [ids.classTwo, 'Class B']] as const) {
    await prisma.class.upsert({ where: { id }, update: { name, teacherId: ids.teacher }, create: { id, name, teacherId: ids.teacher } });
  }
  for (const [classId, studentId] of [[ids.classOne, ids.studentOne], [ids.classOne, ids.studentTwo], [ids.classTwo, ids.studentOne]] as const) {
    await prisma.classMember.upsert({ where: { classId_studentId: { classId, studentId } }, update: {}, create: { classId, studentId } });
  }

  const dates = {
    now: new Date('2026-10-26T08:00:00.000Z'),
    oldAssessment: new Date('2026-10-20T00:00:00.000Z'),
    latestAssessment: new Date('2026-10-25T00:00:00.000Z'),
    start: new Date('2026-10-01T00:00:00.000Z'),
    end: new Date('2026-12-31T23:59:59.000Z'),
  };
  const assessments = [
    ['50000000-0000-4000-8000-000000000001', ids.studentOne, ids.dataStructures, '55', dates.oldAssessment],
    ['50000000-0000-4000-8000-000000000002', ids.studentOne, ids.dataStructures, '85', dates.latestAssessment],
    ['50000000-0000-4000-8000-000000000003', ids.studentOne, ids.database, '79.99', dates.latestAssessment],
    ['50000000-0000-4000-8000-000000000004', ids.studentTwo, ids.algorithms, '62.25', dates.now],
    ['50000000-0000-4000-8000-000000000005', ids.studentOne, ids.javascript, '60', dates.latestAssessment],
    ['50000000-0000-4000-8000-000000000006', ids.studentOne, ids.testing, '59.99', dates.latestAssessment],
    ['50000000-0000-4000-8000-000000000007', ids.studentOne, ids.api, '80', dates.latestAssessment],
  ] as const;
  for (const [id, studentId, topicId, score, evaluatedAt] of assessments) {
    await prisma.assessmentResult.upsert({ where: { id }, update: { studentId, topicId, score, evaluatedAt }, create: { id, studentId, topicId, score, evaluatedAt } });
  }

  await prisma.studyPlan.upsert({
    where: { id: ids.activePlan },
    update: { status: StudyPlanStatus.ACTIVE },
    create: { id: ids.activePlan, studentId: ids.studentOne, title: 'Foundations study plan', goal: 'Build core computing knowledge', availableMinutesPerWeek: 300, startDate: dates.start, endDate: dates.end, status: StudyPlanStatus.ACTIVE },
  });
  await prisma.studyPlan.upsert({
    where: { id: ids.archivedPlan },
    update: { status: StudyPlanStatus.ARCHIVED },
    create: { id: ids.archivedPlan, studentId: ids.studentTwo, title: 'Archived study plan', goal: 'Review introductory topics', availableMinutesPerWeek: 120, startDate: dates.start, endDate: dates.end, status: StudyPlanStatus.ARCHIVED },
  });
  const tasks = [
    ['60000000-0000-4000-8000-000000000001', ids.algorithms, 'Review sorting', Priority.HIGH, StudyTaskStatus.TODO, new Date('2026-10-20T12:00:00.000Z'), null],
    ['60000000-0000-4000-8000-000000000002', ids.databases, 'Practice SQL joins', Priority.MEDIUM, StudyTaskStatus.COMPLETED, new Date('2026-10-24T12:00:00.000Z'), dates.now],
    ['60000000-0000-4000-8000-000000000003', ids.networking, 'Read network layers', Priority.LOW, StudyTaskStatus.TODO, new Date('2026-10-28T12:00:00.000Z'), null],
  ] as const;
  for (const [id, topicId, title, priority, status, dueDate, completedAt] of tasks) {
    await prisma.studyTask.upsert({
      where: { id },
      update: { status, dueDate, completedAt },
      create: { id, studyPlanId: ids.activePlan, topicId, title, goal: `Complete: ${title}`, expectedMinutes: 45, dueDate, priority, status, completedAt },
    });
  }

  for (const [index, tag] of Object.values(FeedbackTag).entries()) {
    const id = `70000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`;
    await prisma.feedback.upsert({
      where: { id },
      update: { tag, rating: index + 1 },
      create: { id, userId: index % 2 ? ids.teacher : ids.studentOne, tag, rating: index + 1, content: `Seed feedback for ${tag.toLowerCase().replaceAll('_', ' ')}.` },
    });
  }
}

seed()
  .then(() => console.log('Development seed data applied.'))
  .catch((error: unknown) => {
    console.error('Development seed failed.');
    throw error;
  })
  .finally(() => prisma.$disconnect());
