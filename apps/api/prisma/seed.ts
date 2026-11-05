import * as argon2 from 'argon2';
import dotenv from 'dotenv';
import { Prisma, PrismaClient, Role, StudyPlanStatus, StudyTaskStatus, Priority, FeedbackTag } from '@prisma/client';
import { MVP_COURSE_ID } from '../src/common/mvp-course';

dotenv.config({ path: '../../.env' });
dotenv.config({ path: '../../.env.example' });

const prisma = new PrismaClient();
const fixedId = (prefix: string, suffix: number) => `${prefix}-0000-4000-8000-${String(suffix).padStart(12, '0')}`;
const ids = {
  studentOne: fixedId('10000000', 1),
  studentTwo: fixedId('10000000', 2),
  teacher: fixedId('10000000', 3),
  admin: fixedId('10000000', 4),
  disabled: fixedId('10000000', 5),
  students: Array.from({ length: 8 }, (_, index) => fixedId('10000000', index + 6)),
  teacherTwo: fixedId('10000000', 14),
  course: MVP_COURSE_ID,
  topics: [
    [fixedId('20000000', 2), 'Algorithms'],
    [fixedId('20000000', 3), 'Databases'],
    [fixedId('20000000', 4), 'Networking'],
    [fixedId('20000000', 5), 'Cấu trúc dữ liệu'],
    [fixedId('20000000', 6), 'JavaScript'],
    [fixedId('20000000', 7), 'Database'],
    [fixedId('20000000', 8), 'Testing'],
    [fixedId('20000000', 9), 'API'],
    [fixedId('20000000', 10), 'Git'],
  ] as const,
  classOne: fixedId('30000000', 1),
  classTwo: fixedId('30000000', 2),
  classThree: fixedId('30000000', 3),
  emptyTasksPlan: fixedId('40000000', 9),
} as const;

type SeedData = {
  users: Prisma.UserCreateManyInput[];
  courses: Prisma.CourseCreateManyInput[];
  topics: Prisma.TopicCreateManyInput[];
  classes: Prisma.ClassCreateManyInput[];
  members: Prisma.ClassMemberCreateManyInput[];
  assessments: Prisma.AssessmentResultCreateManyInput[];
  plans: Prisma.StudyPlanCreateManyInput[];
  tasks: Prisma.StudyTaskCreateManyInput[];
  feedback: Prisma.FeedbackCreateManyInput[];
};

const dayMs = 24 * 60 * 60 * 1000;
const offsetDays = (seedNow: Date, days: number) => new Date(seedNow.getTime() + days * dayMs);

function buildSeedData(seedNow: Date, passwordHash: string): SeedData {
  const studentRows: Prisma.UserCreateManyInput[] = [
    { id: ids.studentOne, fullName: 'Student One', email: 'student.one@example.test', role: Role.STUDENT, passwordHash },
    { id: ids.studentTwo, fullName: 'Student Two', email: 'student.two@example.test', role: Role.STUDENT, passwordHash },
    { id: fixedId('10000000', 3), fullName: 'Demo Teacher', email: 'teacher@example.test', role: Role.TEACHER, passwordHash },
    { id: fixedId('10000000', 4), fullName: 'Demo Administrator', email: 'admin@example.test', role: Role.ADMINISTRATOR, passwordHash },
    { id: fixedId('10000000', 5), fullName: 'Disabled Student', email: 'disabled.student@example.test', role: Role.STUDENT, status: 'DISABLED', passwordHash },
    { id: ids.teacherTwo, fullName: 'Demo Teacher Two', email: 'teacher.two@example.test', role: Role.TEACHER, passwordHash },
    ...ids.students.map((id, index) => ({
      id,
      fullName: `Student ${String(index + 3).padStart(2, '0')}`,
      email: `student.${String(index + 3).padStart(2, '0')}@example.test`,
      role: Role.STUDENT,
      passwordHash,
    })),
  ];
  const users: Prisma.UserCreateManyInput[] = studentRows;
  const courses: Prisma.CourseCreateManyInput[] = [{ id: ids.course, name: 'Computer Science Foundations', description: 'Seed course for local development.' }];
  const topics: Prisma.TopicCreateManyInput[] = ids.topics.map(([id, name]) => ({ id, courseId: ids.course, name }));
  const classes: Prisma.ClassCreateManyInput[] = [
    { id: ids.classOne, name: 'Class A', teacherId: fixedId('10000000', 3) },
    { id: ids.classTwo, name: 'Class B', teacherId: fixedId('10000000', 3) },
    { id: ids.classThree, name: 'Class C - Chưa đủ dữ liệu', teacherId: ids.teacherTwo },
  ];
  const members: Prisma.ClassMemberCreateManyInput[] = [
    { classId: ids.classOne, studentId: ids.studentOne },
    { classId: ids.classOne, studentId: ids.studentTwo },
    { classId: ids.classTwo, studentId: ids.studentOne },
    ...ids.students.map((studentId, index) => ({
      classId: index < 4 ? ids.classOne : index < 6 ? ids.classTwo : ids.classThree,
      studentId,
    })),
  ];

  const assessments: Prisma.AssessmentResultCreateManyInput[] = [
    { id: fixedId('50000000', 1), studentId: ids.studentOne, topicId: ids.topics[3][0], score: new Prisma.Decimal('55'), evaluatedAt: new Date('2026-10-20T00:00:00.000Z') },
    { id: fixedId('50000000', 2), studentId: ids.studentOne, topicId: ids.topics[3][0], score: new Prisma.Decimal('85'), evaluatedAt: new Date('2026-10-25T00:00:00.000Z') },
    { id: fixedId('50000000', 3), studentId: ids.studentOne, topicId: ids.topics[5][0], score: new Prisma.Decimal('79.99'), evaluatedAt: new Date('2026-10-25T00:00:00.000Z') },
    { id: fixedId('50000000', 4), studentId: ids.studentTwo, topicId: ids.topics[0][0], score: new Prisma.Decimal('62.25'), evaluatedAt: new Date('2026-10-26T08:00:00.000Z') },
    { id: fixedId('50000000', 5), studentId: ids.studentOne, topicId: ids.topics[4][0], score: new Prisma.Decimal('60'), evaluatedAt: new Date('2026-10-25T00:00:00.000Z') },
    { id: fixedId('50000000', 6), studentId: ids.studentOne, topicId: ids.topics[6][0], score: new Prisma.Decimal('59.99'), evaluatedAt: new Date('2026-10-25T00:00:00.000Z') },
    { id: fixedId('50000000', 7), studentId: ids.studentOne, topicId: ids.topics[7][0], score: new Prisma.Decimal('80'), evaluatedAt: new Date('2026-10-25T00:00:00.000Z') },
  ];
  let assessmentNumber = 8;
  const addHistory = (studentId: string, topicId: string, finalScore: number, offsets: number[], shifts: number[]) => {
    offsets.forEach((weeksAgo, index) => {
      assessments.push({
        id: fixedId('50000000', assessmentNumber++),
        studentId,
        topicId,
        score: new Prisma.Decimal(String(Math.max(0, Math.min(100, finalScore + shifts[index])))),
        evaluatedAt: offsetDays(seedNow, -weeksAgo * 7),
      });
    });
  };
  const strongFinalScores = [
    [80, 77, 89, 74, 82, 78, 86, 83, 75],
    [72, 75, 78, 81, 84, 87, 90, 73, 76],
    [94, 88, 92, 85, 89, 96, 91, 87, 93],
    [77, 74, 79, 71, 75, 78, 73, 82, 76],
  ];
  const strongHistories = [
    { offsets: [8, 4, 1], shifts: [-24, -10, 0] },
    { offsets: [6, 1], shifts: [14, 0] },
    { offsets: [8, 4, 1], shifts: [-8, -3, 0] },
    { offsets: [6, 1], shifts: [-6, 0] },
  ];
  strongFinalScores.forEach((scores, studentIndex) => scores.forEach((score, topicIndex) => {
    const history = strongHistories[studentIndex];
    addHistory(ids.students[studentIndex], ids.topics[topicIndex][0], score, history.offsets, history.shifts);
  }));

  const concernTopics = [ids.topics[3][0], ids.topics[4][0], ids.topics[5][0], ids.topics[6][0], ids.topics[7][0]];
  const concernScores = [
    [32, 38, 34, 29, 40],
    [42, 40, 39, 35, 44],
  ];
  concernScores.forEach((scores, studentIndex) => scores.forEach((score, topicIndex) => {
    const shifts = studentIndex === 0 ? [18, 9, 0] : [-8, -3, 0];
    addHistory(ids.students[studentIndex + 4], concernTopics[topicIndex], score, [8, 4, 1], shifts);
  }));

  const plans: Prisma.StudyPlanCreateManyInput[] = [
    { id: fixedId('40000000', 1), studentId: ids.studentOne, title: 'Foundations study plan', goal: 'Build core computing knowledge', availableMinutesPerWeek: 300, startDate: new Date('2026-10-01T00:00:00.000Z'), endDate: new Date('2026-12-31T23:59:59.000Z'), status: StudyPlanStatus.ACTIVE },
    { id: fixedId('40000000', 2), studentId: ids.studentTwo, title: 'Archived study plan', goal: 'Review introductory topics', availableMinutesPerWeek: 120, startDate: new Date('2026-10-01T00:00:00.000Z'), endDate: new Date('2026-12-31T23:59:59.000Z'), status: StudyPlanStatus.ARCHIVED },
    { id: fixedId('40000000', 3), studentId: ids.students[0], title: 'Build strong foundations', goal: 'Practice core topics and retain a steady routine', availableMinutesPerWeek: 240, startDate: offsetDays(seedNow, -30), endDate: offsetDays(seedNow, 30), status: StudyPlanStatus.ACTIVE },
    { id: fixedId('40000000', 4), studentId: ids.students[1], title: 'Strengthen problem solving', goal: 'Improve accuracy through regular practice', availableMinutesPerWeek: 300, startDate: offsetDays(seedNow, -30), endDate: offsetDays(seedNow, 30), status: StudyPlanStatus.ACTIVE },
    { id: fixedId('40000000', 5), studentId: ids.students[2], title: 'Core topics completed', goal: 'Complete the planned review of core topics', availableMinutesPerWeek: 180, startDate: offsetDays(seedNow, -45), endDate: offsetDays(seedNow, -5), status: StudyPlanStatus.COMPLETED },
    { id: fixedId('40000000', 6), studentId: ids.students[3], title: 'Earlier review plan', goal: 'Review introductory material', availableMinutesPerWeek: 120, startDate: offsetDays(seedNow, -70), endDate: offsetDays(seedNow, -35), status: StudyPlanStatus.ARCHIVED },
    { id: fixedId('40000000', 7), studentId: ids.students[4], title: 'Recovery plan', goal: 'Rebuild weak topics and catch up on overdue practice', availableMinutesPerWeek: 240, startDate: offsetDays(seedNow, -30), endDate: offsetDays(seedNow, 30), status: StudyPlanStatus.ACTIVE },
    { id: fixedId('40000000', 8), studentId: ids.students[5], title: 'Focused review completed', goal: 'Complete focused practice in priority topics', availableMinutesPerWeek: 180, startDate: offsetDays(seedNow, -45), endDate: offsetDays(seedNow, -2), status: StudyPlanStatus.COMPLETED },
    { id: ids.emptyTasksPlan, studentId: ids.students[6], title: 'Plan without tasks', goal: 'Review a plan with no tasks yet', availableMinutesPerWeek: 120, startDate: offsetDays(seedNow, -1), endDate: offsetDays(seedNow, 30), status: StudyPlanStatus.ACTIVE },
  ];

  const tasks: Prisma.StudyTaskCreateManyInput[] = [
    { id: fixedId('60000000', 1), studyPlanId: fixedId('40000000', 1), topicId: ids.topics[0][0], title: 'Review sorting', goal: 'Complete: Review sorting', expectedMinutes: 45, dueDate: new Date('2026-10-20T12:00:00.000Z'), priority: Priority.HIGH, status: StudyTaskStatus.TODO },
    { id: fixedId('60000000', 2), studyPlanId: fixedId('40000000', 1), topicId: ids.topics[1][0], title: 'Practice SQL joins', goal: 'Complete: Practice SQL joins', expectedMinutes: 45, dueDate: new Date('2026-10-24T12:00:00.000Z'), priority: Priority.MEDIUM, status: StudyTaskStatus.COMPLETED, completedAt: new Date('2026-10-26T08:00:00.000Z') },
    { id: fixedId('60000000', 3), studyPlanId: fixedId('40000000', 1), topicId: ids.topics[2][0], title: 'Read network layers', goal: 'Complete: Read network layers', expectedMinutes: 45, dueDate: new Date('2026-10-28T12:00:00.000Z'), priority: Priority.LOW, status: StudyTaskStatus.TODO },
  ];
  let taskNumber = 4;
  const addTask = (planId: string, topicId: string, title: string, status: StudyTaskStatus, dueInDays: number, completedInDays?: number) => {
    tasks.push({
      id: fixedId('60000000', taskNumber++),
      studyPlanId: planId,
      topicId,
      title,
      goal: `Complete: ${title}`,
      expectedMinutes: 30 + taskNumber % 4 * 15,
      dueDate: offsetDays(seedNow, dueInDays),
      priority: [Priority.LOW, Priority.MEDIUM, Priority.HIGH][taskNumber % 3],
      status,
      completedAt: completedInDays === undefined ? null : offsetDays(seedNow, completedInDays),
    });
  };
  const completedTask = (planId: string, topicIndex: number, title: string, dueDays: number) => addTask(planId, ids.topics[topicIndex][0], title, StudyTaskStatus.COMPLETED, dueDays, dueDays + 1);
  const todoTask = (planId: string, topicIndex: number, title: string, dueDays: number) => addTask(planId, ids.topics[topicIndex][0], title, StudyTaskStatus.TODO, dueDays);

  const planThree = fixedId('40000000', 3);
  completedTask(planThree, 0, 'Practice sorting patterns', -14);
  completedTask(planThree, 3, 'Review data structures', -7);
  todoTask(planThree, 4, 'Practice JavaScript functions', 1);
  todoTask(planThree, 5, 'Review database keys', 5);
  const planFour = fixedId('40000000', 4);
  completedTask(planFour, 1, 'Practice relational queries', -20);
  completedTask(planFour, 2, 'Review network layers', -12);
  completedTask(planFour, 3, 'Practice data structures', -6);
  todoTask(planFour, 7, 'Review API contracts', 5);
  const planFive = fixedId('40000000', 5);
  completedTask(planFive, 0, 'Complete sorting review', -20);
  completedTask(planFive, 5, 'Complete database review', -14);
  completedTask(planFive, 6, 'Complete testing review', -10);
  const planSix = fixedId('40000000', 6);
  completedTask(planSix, 0, 'Finish introductory algorithms', -60);
  todoTask(planSix, 1, 'Revisit database basics', -52);
  todoTask(planSix, 2, 'Review network concepts', -44);
  const planSeven = fixedId('40000000', 7);
  completedTask(planSeven, 3, 'Finish one priority exercise', -16);
  completedTask(planSeven, 4, 'Finish a second priority exercise', -13);
  todoTask(planSeven, 5, 'Catch up on database practice', -7);
  todoTask(planSeven, 6, 'Complete testing exercises', -4);
  todoTask(planSeven, 7, 'Review overdue API work', -2);
  todoTask(planSeven, 8, 'Practice Git workflows', 1);
  todoTask(planSeven, 0, 'Plan the next algorithms session', 8);
  const planEight = fixedId('40000000', 8);
  completedTask(planEight, 3, 'Complete data structures practice', -20);
  completedTask(planEight, 4, 'Complete JavaScript practice', -14);
  completedTask(planEight, 5, 'Complete database practice', -8);
  completedTask(planEight, 7, 'Complete API practice', -4);

  const feedback: Prisma.FeedbackCreateManyInput[] = Object.values(FeedbackTag).map((tag, index) => ({
    id: fixedId('70000000', index + 1),
    userId: index % 2 ? fixedId('10000000', 3) : ids.studentOne,
    tag,
    rating: index + 1,
    content: `Seed feedback for ${tag.toLowerCase().replaceAll('_', ' ')}.`,
  }));

  return { users, courses, topics, classes, members, assessments, plans, tasks, feedback };
}

function failPreflight(reason: string): never {
  throw new Error(`Seed preflight failed: ${reason}`);
}

async function allFixtureRowsExist(data: SeedData, excludedPlanIds: string[] = []): Promise<boolean> {
  const planIds = data.plans.map(({ id }) => id!).filter((id) => !excludedPlanIds.includes(id));
  const [users, courses, topics, classes, members, assessments, plans, tasks, feedback] = await Promise.all([
    prisma.user.count({ where: { id: { in: data.users.map(({ id }) => id!) } } }),
    prisma.course.count({ where: { id: { in: data.courses.map(({ id }) => id!) } } }),
    prisma.topic.count({ where: { id: { in: data.topics.map(({ id }) => id!) } } }),
    prisma.class.count({ where: { id: { in: data.classes.map(({ id }) => id!) } } }),
    prisma.classMember.count({ where: { OR: data.members.map(({ classId, studentId }) => ({ classId, studentId })) } }),
    prisma.assessmentResult.count({ where: { id: { in: data.assessments.map(({ id }) => id!) } } }),
    prisma.studyPlan.count({ where: { id: { in: planIds } } }),
    prisma.studyTask.count({ where: { id: { in: data.tasks.map(({ id }) => id!) } } }),
    prisma.feedback.count({ where: { id: { in: data.feedback.map(({ id }) => id!) } } }),
  ]);
  return users === data.users.length
    && courses === data.courses.length
    && topics === data.topics.length
    && classes === data.classes.length
    && members === data.members.length
    && assessments === data.assessments.length
    && plans === planIds.length
    && tasks === data.tasks.length
    && feedback === data.feedback.length;
}

async function preflight(data: SeedData, seedNow: Date): Promise<boolean> {
  const emails = data.users.map(({ email }) => email!);
  const userIds = data.users.map(({ id }) => id!);
  const existingUsers = await prisma.user.findMany({
    where: { OR: [{ id: { in: userIds } }, { email: { in: emails } }] },
    select: { id: true, email: true, role: true },
  });
  for (const expected of data.users) {
    const byId = existingUsers.find((user) => user.id === expected.id);
    const byEmail = existingUsers.find((user) => user.email === expected.email);
    if ((byId && (byId.email !== expected.email || byId.role !== expected.role))
      || (byEmail && byEmail.id !== expected.id)) {
      failPreflight('a seeded User ID/email belongs to a different account');
    }
  }

  const [existingTopics, existingNewClass, existingAssessments, existingPlans, existingTasks, existingFeedback] = await Promise.all([
    prisma.topic.findMany({ where: { id: { in: data.topics.map(({ id }) => id!) } }, select: { id: true, courseId: true } }),
    prisma.class.findUnique({ where: { id: ids.classThree }, select: { teacherId: true } }),
    prisma.assessmentResult.findMany({ where: { id: { in: data.assessments.map(({ id }) => id!) } }, select: { id: true, studentId: true, topicId: true } }),
    prisma.studyPlan.findMany({ where: { id: { in: data.plans.map(({ id }) => id!) } }, select: { id: true, studentId: true } }),
    prisma.studyTask.findMany({ where: { id: { in: data.tasks.map(({ id }) => id!) } }, select: { id: true, studyPlanId: true, topicId: true } }),
    prisma.feedback.findMany({ where: { id: { in: data.feedback.map(({ id }) => id!) } }, select: { id: true, userId: true } }),
  ]);
  if (existingTopics.some((topic) => topic.courseId !== ids.course)) failPreflight('an MVP Topic ID belongs to another Course');
  if (existingNewClass && existingNewClass.teacherId !== ids.teacherTwo) failPreflight('the new Class ID belongs to another Teacher');
  if (existingAssessments.some((row) => {
    const expected = data.assessments.find(({ id }) => id === row.id)!;
    return row.studentId !== expected.studentId || row.topicId !== expected.topicId;
  })) failPreflight('an AssessmentResult ID belongs to another Student or Topic');
  if (existingPlans.some((row) => {
    const expected = data.plans.find(({ id }) => id === row.id)!;
    return row.studentId !== expected.studentId;
  })) failPreflight('a StudyPlan ID belongs to another Student');
  if (existingTasks.some((row) => {
    const expected = data.tasks.find(({ id }) => id === row.id)!;
    return row.studyPlanId !== expected.studyPlanId || row.topicId !== expected.topicId;
  })) failPreflight('a StudyTask ID belongs to another StudyPlan or Topic');
  if (existingFeedback.some((row) => {
    const expected = data.feedback.find(({ id }) => id === row.id)!;
    return row.userId !== expected.userId;
  })) failPreflight('a Feedback ID belongs to another User');

  const isComplete = await allFixtureRowsExist(data);
  if (isComplete) return true;

  if (await allFixtureRowsExist(data, [ids.emptyTasksPlan])) {
    const student = await prisma.user.findUnique({ where: { id: ids.students[6] }, select: { role: true, status: true } });
    if (student?.role !== Role.STUDENT || student.status !== 'ACTIVE') failPreflight('the empty-plan fixture requires an ACTIVE Student');
    const currentPlan = await prisma.studyPlan.findFirst({
      where: { studentId: ids.students[6], status: { in: [StudyPlanStatus.ACTIVE, StudyPlanStatus.COMPLETED] } },
      select: { id: true },
    });
    if (currentPlan) failPreflight('Student 09 already has a current StudyPlan');
    return false;
  }

  const currentPlanSeeds = data.plans.filter(({ status }) => status === StudyPlanStatus.ACTIVE || status === StudyPlanStatus.COMPLETED);
  const currentByStudent = new Map<string, Set<string>>();
  const existingCurrentPlans = await prisma.studyPlan.findMany({
    where: { studentId: { in: currentPlanSeeds.map(({ studentId }) => studentId) }, status: { in: [StudyPlanStatus.ACTIVE, StudyPlanStatus.COMPLETED] } },
    select: { id: true, studentId: true },
  });
  for (const plan of existingCurrentPlans) {
    currentByStudent.set(plan.studentId, new Set([...(currentByStudent.get(plan.studentId) ?? []), plan.id]));
  }
  for (const plan of currentPlanSeeds) {
    const existingIds = currentByStudent.get(plan.studentId) ?? new Set<string>();
    if ([...existingIds].some((id) => id !== plan.id)) failPreflight('a Student already has a different current plan');
    existingIds.add(plan.id!);
    currentByStudent.set(plan.studentId, existingIds);
  }

  const seedStudentIds = [ids.studentOne, ids.studentTwo, ...ids.students];
  const [existingUsersForScenarios, existingMembers] = await Promise.all([
    prisma.user.findMany({ where: { id: { in: seedStudentIds } }, select: { id: true, role: true, status: true } }),
    prisma.classMember.findMany({ where: { classId: { in: [ids.classOne, ids.classTwo, ids.classThree] } } }),
  ]);
  const usersById = new Map(existingUsersForScenarios.map((user) => [user.id, user]));
  for (const expected of data.users.filter(({ id }) => seedStudentIds.includes(id!))) {
    const existing = usersById.get(expected.id!);
    if (!existing && expected.status !== 'DISABLED') usersById.set(expected.id!, { id: expected.id!, role: expected.role!, status: 'ACTIVE' });
  }
  if (seedStudentIds.filter((id) => usersById.get(id)?.role === Role.STUDENT && usersById.get(id)?.status === 'ACTIVE').length !== 10) {
    failPreflight('the ten demo Student accounts cannot all be ACTIVE without changing existing rows');
  }

  const allMembers = new Map<string, Prisma.ClassMemberCreateManyInput>();
  for (const member of [...existingMembers, ...data.members]) allMembers.set(`${member.classId}:${member.studentId}`, member);
  const membershipsByClass = new Map<string, Set<string>>();
  for (const member of allMembers.values()) {
    membershipsByClass.set(member.classId, new Set([...(membershipsByClass.get(member.classId) ?? []), member.studentId]));
  }
  const classStudentIds = [...new Set([...membershipsByClass.values()].flatMap((memberIds) => [...memberIds]))];
  const [existingClassResults, existingAllResults, existingPlansForScenarios] = await Promise.all([
    prisma.assessmentResult.findMany({ where: { studentId: { in: classStudentIds }, topic: { courseId: ids.course } } }),
    prisma.assessmentResult.findMany({ where: { studentId: { in: classStudentIds } }, select: { studentId: true } }),
    prisma.studyPlan.findMany({ where: { studentId: { in: classStudentIds } }, include: { tasks: true } }),
  ]);
  const resultsById = new Map(existingClassResults.map((result) => [result.id, result]));
  for (const result of data.assessments) if (!resultsById.has(result.id!)) {
    resultsById.set(result.id!, result as typeof existingClassResults[number]);
  }
  const latestResults = new Map<string, typeof existingClassResults[number]>();
  for (const result of [...resultsById.values()].sort((a, b) => b.evaluatedAt.getTime() - a.evaluatedAt.getTime())) {
    const key = `${result.studentId}:${result.topicId}`;
    if (!latestResults.has(key)) latestResults.set(key, result);
  }
  const averagesForClass = (classId: string) => {
    const members = membershipsByClass.get(classId) ?? new Set<string>();
    const scoresByTopic = new Map<string, number[]>();
    for (const result of latestResults.values()) {
      if (!members.has(result.studentId)) continue;
      scoresByTopic.set(result.topicId, [...(scoresByTopic.get(result.topicId) ?? []), Number(result.score)]);
    }
    return [...scoresByTopic.values()].map((scores) => scores.reduce((sum, score) => sum + score, 0) / scores.length);
  };
  const classAverages = averagesForClass(ids.classOne);
  if (classAverages.length !== data.topics.length || classAverages.some((average) => average < 60)) {
    failPreflight('Class A cannot meet the no-Weak-Topic scenario without changing existing results');
  }
  if (!averagesForClass(ids.classTwo).some((average) => average < 60)) failPreflight('Class B cannot meet the Weak Topic scenario without changing existing results');

  const candidatePlans = new Map(existingPlansForScenarios.map((plan) => [plan.id, plan]));
  const existingTaskIds = new Set(existingTasks.map(({ id }) => id));
  for (const expectedPlan of data.plans) {
    const existingPlan = candidatePlans.get(expectedPlan.id!);
    if (existingPlan && existingPlan.status !== expectedPlan.status
      && data.tasks.some((task) => task.studyPlanId === expectedPlan.id && !existingTaskIds.has(task.id!))) {
      failPreflight('a changed StudyPlan has missing fixture tasks; refusing to alter its progress');
    }
  }
  for (const plan of data.plans) if (!candidatePlans.has(plan.id!)) {
    candidatePlans.set(plan.id!, { ...plan, tasks: data.tasks.filter((task) => task.studyPlanId === plan.id) } as typeof existingPlansForScenarios[number]);
  }
  const seedPlanIds = new Set(data.plans.map(({ id }) => id!));
  const resultingTasks = new Map<string, { id: string; studyPlanId: string; dueDate: Date; status: StudyTaskStatus; completedAt: Date | null }>();
  for (const plan of candidatePlans.values()) for (const task of plan.tasks) resultingTasks.set(task.id, {
    id: task.id,
    studyPlanId: task.studyPlanId,
    dueDate: new Date(task.dueDate),
    status: task.status,
    completedAt: task.completedAt ? new Date(task.completedAt) : null,
  });
  for (const task of data.tasks) if (!resultingTasks.has(task.id!)) resultingTasks.set(task.id!, {
    id: task.id!,
    studyPlanId: task.studyPlanId,
    dueDate: new Date(task.dueDate!),
    status: task.status!,
    completedAt: task.completedAt ? new Date(task.completedAt) : null,
  });
  for (const task of resultingTasks.values()) {
    if (!seedPlanIds.has(task.studyPlanId)) continue;
    const plan = candidatePlans.get(task.studyPlanId)!;
    if (task.dueDate < plan.startDate || task.dueDate > plan.endDate) failPreflight('a seeded task deadline is outside its plan dates');
    if ((task.status === StudyTaskStatus.COMPLETED) !== (task.completedAt !== null)) {
      failPreflight('a seeded task has an invalid status/completedAt combination');
    }
  }
  for (const plan of candidatePlans.values()) if (seedPlanIds.has(plan.id) && plan.status === StudyPlanStatus.COMPLETED
    && [...resultingTasks.values()].some((task) => task.studyPlanId === plan.id && task.status !== StudyTaskStatus.COMPLETED)) {
    failPreflight('a COMPLETED StudyPlan contains a non-COMPLETED task');
  }

  const classCStudentIds = membershipsByClass.get(ids.classThree) ?? new Set<string>();
  if (existingAllResults.some(({ studentId }) => classCStudentIds.has(studentId))) failPreflight('Class C Students already have assessment results');
  const currentClassCPlans = [...candidatePlans.values()].filter((plan) => classCStudentIds.has(plan.studentId)
    && (plan.status === StudyPlanStatus.ACTIVE || plan.status === StudyPlanStatus.COMPLETED)
    && plan.tasks.length > 0);
  if (currentClassCPlans.length) failPreflight('Class C already has a current plan with tasks');

  const studentSevenId = ids.students[4];
  const studentSevenResults = [...latestResults.values()].filter((result) => result.studentId === studentSevenId).map(({ score }) => Number(score));
  const studentSevenAverage = studentSevenResults.length ? studentSevenResults.reduce((sum, score) => sum + score, 0) / studentSevenResults.length : null;
  const studentSevenPlan = [...candidatePlans.values()].find((plan) => plan.studentId === studentSevenId
    && (plan.status === StudyPlanStatus.ACTIVE || plan.status === StudyPlanStatus.COMPLETED));
  if (studentSevenAverage === null || !studentSevenPlan) failPreflight('Student 7 lacks results or a current plan for teacher metrics');
  const studentSevenTasks = [...resultingTasks.values()].filter((task) => task.studyPlanId === studentSevenPlan.id);
  if (!studentSevenTasks.length) failPreflight('Student 7 lacks results or a current plan for teacher metrics');
  const completedTasks = studentSevenTasks.filter((task) => task.status === StudyTaskStatus.COMPLETED).length;
  const actualProgress = completedTasks / studentSevenTasks.length * 100;
  const dueTasks = studentSevenTasks.filter((task) => task.dueDate <= seedNow).length;
  const expectedProgress = dueTasks / studentSevenTasks.length * 100;
  const overdueTasks = studentSevenTasks.filter((task) => task.status === StudyTaskStatus.TODO && task.dueDate < seedNow).length;
  const nearDueTasks = studentSevenTasks.filter((task) => task.status === StudyTaskStatus.TODO
    && task.dueDate > seedNow && task.dueDate <= offsetDays(seedNow, 2)).length;
  const averageNeedsAttention = studentSevenAverage < 60;
  const progressNeedsAttention = actualProgress < 50;
  if (!averageNeedsAttention && !progressNeedsAttention && overdueTasks < 2) failPreflight('Student 7 does not meet Needs Attention rules');
  if (!(actualProgress < expectedProgress - 20)) failPreflight('Student 7 does not meet the Progress Warning rule');
  if (overdueTasks < 2 || nearDueTasks < 1) failPreflight('Student 7 lacks overdue or near-due TODO tasks');

  for (const [studentIndex, topicIndexes] of [[0, ids.topics.map((_, index) => index)], [1, ids.topics.map((_, index) => index)], [2, ids.topics.map((_, index) => index)], [3, ids.topics.map((_, index) => index)], [4, [3, 4, 5, 6, 7]], [5, [3, 4, 5, 6, 7]]] as const) {
    for (const topicIndex of topicIndexes) {
      const count = [...resultsById.values()].filter((result) => result.studentId === ids.students[studentIndex] && result.topicId === ids.topics[topicIndex][0]).length;
      if (count < 2 || count > 4) failPreflight('a seeded assessment history does not contain 2–4 attempts');
    }
  }
  if (existingPlansForScenarios.some((plan) => (currentByStudent.get(plan.studentId)?.size ?? 0) > 1)) failPreflight('a Student would have more than one current StudyPlan');
  return false;
}

async function seed() {
  const password = process.env.SEED_PASSWORD;
  if (!password || password.length < 12) throw new Error('SEED_PASSWORD must contain at least 12 characters');
  const seedNow = new Date();
  const data = buildSeedData(seedNow, 'seed-password-placeholder');
  const complete = await preflight(data, seedNow);
  if (complete) return;

  const passwordHash = await argon2.hash(password, {
    type: argon2.argon2id,
    memoryCost: 19456,
    timeCost: 2,
    parallelism: 1,
  });
  data.users = data.users.map((user) => ({ ...user, passwordHash }));
  await prisma.$transaction(async (tx) => {
    await tx.user.createMany({ data: data.users, skipDuplicates: true });
    await tx.course.createMany({ data: data.courses, skipDuplicates: true });
    await tx.topic.createMany({ data: data.topics, skipDuplicates: true });
    await tx.class.createMany({ data: data.classes, skipDuplicates: true });
    await tx.classMember.createMany({ data: data.members, skipDuplicates: true });
    await tx.assessmentResult.createMany({ data: data.assessments, skipDuplicates: true });
    await tx.studyPlan.createMany({ data: data.plans, skipDuplicates: true });
    await tx.studyTask.createMany({ data: data.tasks, skipDuplicates: true });
    await tx.feedback.createMany({ data: data.feedback, skipDuplicates: true });
  });
}

seed()
  .then(() => console.log('Development seed data applied.'))
  .catch((error: unknown) => {
    console.error('Development seed failed.');
    throw error;
  })
  .finally(() => prisma.$disconnect());
