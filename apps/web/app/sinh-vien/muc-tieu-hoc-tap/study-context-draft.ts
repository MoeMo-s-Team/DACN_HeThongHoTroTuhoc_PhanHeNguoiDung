export type StudyContextDraft = {
  goal: string;
  availableMinutesPerWeek: number;
  targetDeadline: string;
};

const DRAFT_KEY = 'studyContextDraft';

export function setStudyContextDraft(draft: StudyContextDraft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
}

export function getStudyContextDraft(): StudyContextDraft | null {
  const value = sessionStorage.getItem(DRAFT_KEY);
  if (!value) return null;
  try {
    return JSON.parse(value) as StudyContextDraft;
  } catch {
    sessionStorage.removeItem(DRAFT_KEY);
    return null;
  }
}

export function clearStudyContextDraft() {
  sessionStorage.removeItem(DRAFT_KEY);
}
