type RecordValue = Record<string, unknown>;
const record = (value: unknown): value is RecordValue => !!value && typeof value === 'object' && !Array.isArray(value);

export function referenceStatus(task: string, input: unknown, output: unknown): 'PASS' | 'VIOLATION' | 'UNKNOWN' {
  if (!record(input) || !record(output)) return 'UNKNOWN';
  const refs = (source: unknown, key: string): string[] | null => {
    if (!Array.isArray(source)) return null;
    const values: string[] = [];
    for (const item of source) {
      if (!record(item) || typeof item[key] !== 'string') return null;
      values.push(item[key] as string);
    }
    return values;
  };
  const check = (candidate: unknown, allowed: string[] | null): 'PASS' | 'VIOLATION' | 'UNKNOWN' => {
    if (allowed === null || !Array.isArray(candidate)) return 'UNKNOWN';
    let unknown = false;
    for (const id of candidate) {
      if (typeof id !== 'string') { unknown = true; continue; }
      if (!allowed.includes(id)) return 'VIOLATION';
    }
    return unknown ? 'UNKNOWN' : 'PASS';
  };
  if (task === 'STUDENT_LEARNING_ANALYSIS') {
    const allowed = refs(input.assessments, 'topicId');
    if (allowed === null) return 'UNKNOWN';
    if (!Array.isArray(output.priorityTopics)) return 'UNKNOWN';
    let unknown = false;
    for (const item of output.priorityTopics) {
      const status = record(item) ? check([item.topicId], allowed) : 'UNKNOWN';
      if (status === 'VIOLATION') return status;
      if (status === 'UNKNOWN') unknown = true;
    }
    return unknown ? 'UNKNOWN' : 'PASS';
  }
  if (task === 'STUDENT_STUDY_PLAN_GENERATION') {
    const allowed = refs(input.topics, 'topicId');
    if (allowed === null) return 'UNKNOWN';
    if (!Array.isArray(output.tasks)) return 'UNKNOWN';
    let unknown = false;
    for (const item of output.tasks) {
      const status = record(item) ? check([item.topicId], allowed) : 'UNKNOWN';
      if (status === 'VIOLATION') return status;
      if (status === 'UNKNOWN') unknown = true;
    }
    return unknown ? 'UNKNOWN' : 'PASS';
  }
  if (task === 'STUDENT_STUDY_PLAN_ADJUSTMENT') {
    const allowed = refs(input.todoTasks, 'taskId');
    if (allowed === null) return 'UNKNOWN';
    if (!Array.isArray(output.changes)) return 'UNKNOWN';
    let unknown = false;
    for (const item of output.changes) {
      const status = record(item) ? check([item.taskId], allowed) : 'UNKNOWN';
      if (status === 'VIOLATION') return status;
      if (status === 'UNKNOWN') unknown = true;
    }
    return unknown ? 'UNKNOWN' : 'PASS';
  }
  if (task === 'TEACHER_CLASS_ANALYSIS') {
    const topics = Array.isArray(input.topicAverageScores) && input.topicAverageScores.every((row) => record(row) && record(row.topic) && typeof row.topic.id === 'string')
      ? input.topicAverageScores.filter((row) => (row as RecordValue).weakTopic === true).map((row) => ((row as RecordValue).topic as RecordValue).id as string) : null;
    const students1 = refs(input.needsAttentionStudents, 'studentId');
    const students2 = refs(input.progressWarnings, 'studentId');
    const weak = Array.isArray(output.weakTopics) ? output.weakTopics.map((row) => record(row) ? row.topicId : null) : null;
    const progress = Array.isArray(output.progressIssues) ? output.progressIssues.map((row) => record(row) ? row.studentId : null) : null;
    const allStudents = students1 && students2 ? [...students1, ...students2] : null;
    const topicResult = check(weak, topics);
    const studentResult = check(progress, allStudents);
    if (topicResult === 'VIOLATION' || studentResult === 'VIOLATION') return 'VIOLATION';
    let unknown = topicResult === 'UNKNOWN' || studentResult === 'UNKNOWN';
    if (!Array.isArray(output.attentionGroups)) return 'UNKNOWN';
    for (const group of output.attentionGroups) {
      const result = record(group) ? check(group.studentIds, allStudents) : 'UNKNOWN';
      if (result === 'VIOLATION') return 'VIOLATION';
      if (result === 'UNKNOWN') unknown = true;
    }
    return unknown ? 'UNKNOWN' : 'PASS';
  }
  if (task === 'ADMIN_FEEDBACK_GROUPING_STAGE1') {
    const allowed = refs(input.feedback, 'feedbackId');
    if (allowed === null) return 'UNKNOWN';
    if (!Array.isArray(output.issueGroups)) return 'UNKNOWN';
    let unknown = false;
    for (const item of output.issueGroups) {
      const status = record(item) ? check(item.feedbackIds, allowed) : 'UNKNOWN';
      if (status === 'VIOLATION') return status;
      if (status === 'UNKNOWN') unknown = true;
    }
    return unknown ? 'UNKNOWN' : 'PASS';
  }
  if (task === 'ADMIN_FEEDBACK_SUMMARY_STAGE2') {
    const allowed = refs(input.feedback, 'feedbackId');
    if (allowed === null) return 'UNKNOWN';
    let unknown = false;
    if (!Array.isArray(input.issueGroups)) unknown = true;
    if (Array.isArray(input.issueGroups)) for (const group of input.issueGroups) {
        const status = record(group) ? check(group.feedbackIds, allowed) : 'UNKNOWN';
        if (status === 'VIOLATION') return status;
        if (status === 'UNKNOWN') unknown = true;
      }
    if (!Array.isArray(output.recommendations)) unknown = true;
    return unknown ? 'UNKNOWN' : 'PASS';
  }
  return 'UNKNOWN';
}
