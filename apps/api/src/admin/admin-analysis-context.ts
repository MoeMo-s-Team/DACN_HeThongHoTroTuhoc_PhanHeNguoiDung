import { createHash } from 'node:crypto';
import { FeedbackTag, Prisma } from '@prisma/client';
import { isISO8601 } from 'class-validator';

const tags = Object.values(FeedbackTag);
const filterKeys = ['fromDate', 'toDate', 'rating', 'tag'] as const;

function isObject(value: unknown): value is Prisma.JsonObject {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isText(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function isTextArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every(isText);
}

export function isAnalysisTimestamp(value: unknown): value is string {
  return typeof value === 'string' && isISO8601(value, { strict: true, strictSeparator: true })
    && Number.isFinite(Date.parse(value));
}

function normalizeFilter(value: unknown): Prisma.JsonObject | null {
  if (!isObject(value) || Object.keys(value).some((key) => !filterKeys.some((field) => field === key))) return null;
  const { fromDate, toDate, rating, tag } = value;
  const result: Prisma.JsonObject = {};
  if (fromDate != null) {
    if (!isAnalysisTimestamp(fromDate)) return null;
    result.fromDate = new Date(fromDate).toISOString();
  }
  if (toDate != null) {
    if (!isAnalysisTimestamp(toDate)) return null;
    result.toDate = new Date(toDate).toISOString();
  }
  if (typeof result.fromDate === 'string' && typeof result.toDate === 'string'
    && Date.parse(result.fromDate) > Date.parse(result.toDate)) return null;
  if (rating != null) {
    if (typeof rating !== 'number' || !Number.isInteger(rating) || rating < 1 || rating > 5) return null;
    result.rating = rating;
  }
  if (tag != null) {
    if (!tags.some((candidate) => candidate === tag)) return null;
    result.tag = tag;
  }
  return result;
}

function validateGroups(value: unknown, ids: Set<string>): boolean {
  if (!Array.isArray(value)) return false;
  const seen = new Set<string>();
  for (const group of value) {
    if (!isObject(group) || !isText(group.title) || !isText(group.summary) || !isTextArray(group.feedbackIds)
      || !group.feedbackIds.length || group.count !== group.feedbackIds.length) return false;
    for (const id of group.feedbackIds) {
      if (!ids.has(id) || seen.has(id)) return false;
      seen.add(id);
    }
  }
  return true;
}

export function readAnalysisContext(payload: Prisma.JsonValue) {
  if (!isObject(payload)) return null;
  const { inputSnapshot, analysisResult } = payload;
  if (!isObject(inputSnapshot) || !isObject(analysisResult)) return null;
  const filter = normalizeFilter(inputSnapshot.filter);
  const { feedbackIds, totalFeedback, tagStatistics } = inputSnapshot;
  if (!filter || !isTextArray(feedbackIds) || !feedbackIds.length || totalFeedback !== feedbackIds.length
    || !isObject(tagStatistics) || Object.keys(tagStatistics).length !== tags.length) return null;
  const ids = new Set(feedbackIds);
  if (ids.size !== feedbackIds.length) return null;
  let totalByTag = 0;
  for (const tag of tags) {
    const count = tagStatistics[tag];
    if (typeof count !== 'number' || !Number.isSafeInteger(count) || count < 0) return null;
    totalByTag += count;
  }
  if (totalByTag !== totalFeedback || !validateGroups(analysisResult.issueGroups, ids)
    || !isText(analysisResult.summary) || !isTextArray(analysisResult.priorityAreas)
    || !Array.isArray(analysisResult.recommendations)
    || !analysisResult.recommendations.every((item) => isObject(item) && isText(item.title) && isText(item.description))) return null;

  const fingerprint = createHash('sha256').update(JSON.stringify({ filter, feedbackIds: [...ids].sort() })).digest('hex');
  return { inputSnapshot, analysisResult, resourceKey: `feedback-dataset:${fingerprint}` };
}
