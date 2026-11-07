import { tagLabels } from '../admin-ui';

export type FeedbackForm = { fromDate: string; toDate: string; rating: string; tag: string };
type Filter = Partial<Record<keyof FeedbackForm, string>>;
const emptyForm: FeedbackForm = { fromDate: '', toDate: '', rating: '', tag: '' };

function validCalendarDate(value: string): boolean {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(value);
  if (!match) return false;
  const [, year, month, day] = match.map(Number);
  const date = new Date(0);
  date.setUTCFullYear(year, month - 1, day);
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day && !Number.isNaN(new Date(value).getTime());
}

function localDateInput(value: string): string {
  const date = new Date(value);
  return `${String(date.getFullYear()).padStart(4, '0')}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

function localBoundary(value: string, end: boolean): string {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || !validCalendarDate(value)) throw new Error('Ngày không hợp lệ.');
  const [year, month, day] = value.split('-').map(Number);
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(end ? 23 : 0, end ? 59 : 0, end ? 59 : 0, end ? 999 : 0);
  return date.toISOString();
}

function validateFilter(filter: Filter): void {
  if (filter.rating !== undefined && !/^[1-5]$/.test(filter.rating)) throw new Error('Rating phải từ 1 đến 5.');
  if (filter.tag !== undefined && !Object.prototype.hasOwnProperty.call(tagLabels, filter.tag)) throw new Error('Tag không hợp lệ.');
  for (const field of ['fromDate', 'toDate'] as const) if (filter[field] !== undefined && !validCalendarDate(filter[field]!)) throw new Error('Ngày không hợp lệ.');
  if (filter.fromDate && filter.toDate && new Date(filter.fromDate) > new Date(filter.toDate)) throw new Error('Từ ngày phải trước hoặc bằng đến ngày.');
}

export function feedbackFormToParams(form: FeedbackForm): URLSearchParams {
  const filter: Filter = {
    ...(form.fromDate ? { fromDate: localBoundary(form.fromDate, false) } : {}),
    ...(form.toDate ? { toDate: localBoundary(form.toDate, true) } : {}),
    ...(form.rating ? { rating: form.rating } : {}), ...(form.tag ? { tag: form.tag } : {}),
  };
  validateFilter(filter);
  return new URLSearchParams(filter);
}

export function parseFeedbackSearch(params: URLSearchParams) {
  const parsed: { filter: Filter; form: FeedbackForm; page: number; limit: number; error?: string } = { filter: {}, form: { ...emptyForm }, page: 1, limit: 20 };
  try {
    const keys = ['fromDate', 'toDate', 'rating', 'tag', 'page', 'limit'];
    for (const key of params.keys()) if (!keys.includes(key) || params.getAll(key).length !== 1) throw new Error('Tham số không hợp lệ.');
    for (const field of ['page', 'limit'] as const) {
      const value = params.get(field);
      if (value !== null) {
        if (!/^[1-9]\d*$/.test(value) || !Number.isSafeInteger(Number(value)) || (field === 'limit' && Number(value) > 100)) throw new Error('Phân trang không hợp lệ.');
        parsed[field] = Number(value);
      }
    }
    for (const field of ['fromDate', 'toDate', 'rating', 'tag'] as const) {
      const value = params.get(field);
      if (value !== null) parsed.filter[field] = value;
    }
    validateFilter(parsed.filter);
    parsed.form = {
      fromDate: parsed.filter.fromDate ? localDateInput(parsed.filter.fromDate) : '',
      toDate: parsed.filter.toDate ? localDateInput(parsed.filter.toDate) : '',
      rating: parsed.filter.rating ?? '', tag: parsed.filter.tag ?? '',
    };
  } catch {
    parsed.error = 'Bộ lọc không hợp lệ. Hãy kiểm tra ngày, rating, tag và phân trang hoặc xóa bộ lọc.';
  }
  return parsed;
}
