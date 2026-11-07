import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { feedbackFormToParams, parseFeedbackSearch } from './feedback-filters';

let previousTimezone: string | undefined;
beforeAll(() => { previousTimezone = process.env.TZ; process.env.TZ = 'Asia/Ho_Chi_Minh'; });
afterAll(() => { if (previousTimezone === undefined) delete process.env.TZ; else process.env.TZ = previousTimezone; });

describe('Feedback URL filters', () => {
  it('converts inclusive local calendar boundaries to UTC', () => {
    const params = feedbackFormToParams({ fromDate: '2026-10-01', toDate: '2026-10-02', rating: '2', tag: 'UI_UX' });
    expect(params.get('fromDate')).toBe('2026-09-30T17:00:00.000Z');
    expect(params.get('toDate')).toBe('2026-10-02T16:59:59.999Z');
    expect(params.get('rating')).toBe('2');
  });
  it('preserves exact applied URL timestamps and rebuilds local date inputs', () => {
    const parsed = parseFeedbackSearch(new URLSearchParams('fromDate=2026-09-30T17%3A00%3A00.000Z&tag=UI_UX&page=2&limit=1'));
    expect(parsed.error).toBeUndefined();
    expect(parsed.form.fromDate).toBe('2026-10-01');
    expect(parsed.filter.fromDate).toBe('2026-09-30T17:00:00.000Z');
    expect(parsed.page).toBe(2);
    expect(parsed.limit).toBe(1);
  });
  it('rejects malformed, duplicate, reversed and unsupported filters', () => {
    for (const query of ['fromDate=yesterday', 'fromDate=2026-02-30', 'fromDate=2026-10-02&toDate=2026-10-01', 'tag=UNKNOWN', 'rating=0', 'page=0', 'limit=101', 'tag=OTHER&tag=UI_UX', 'q=not-supported']) {
      expect(parseFeedbackSearch(new URLSearchParams(query)).error).toBeTruthy();
    }
    expect(() => feedbackFormToParams({ fromDate: '2026-10-02', toDate: '2026-10-01', rating: '', tag: '' })).toThrow();
  });
  it('defaults to the first page without fabricating filter values', () => {
    const parsed = parseFeedbackSearch(new URLSearchParams());
    expect(parsed).toMatchObject({ page: 1, limit: 20, filter: {}, form: { fromDate: '', toDate: '', rating: '', tag: '' } });
  });
});
