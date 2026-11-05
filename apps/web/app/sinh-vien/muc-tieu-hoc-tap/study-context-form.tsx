'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../auth/api';
import { setStudyContextDraft } from './study-context-draft';

type FormValues = { goal: string; availableHoursPerWeek: string; targetDeadline: string };

function deadlineAtLocalDayEnd(date: string) {
  const [year, month, day] = date.split('-').map(Number);
  return new Date(year, month - 1, day, 23, 59, 59, 999).toISOString();
}

export function StudyContextForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState('');
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm<FormValues>({
    defaultValues: { goal: '', availableHoursPerWeek: '8', targetDeadline: '' },
  });

  const submit = handleSubmit(async (values) => {
    setServerError('');
    try {
      const draft = await apiRequest<components['schemas']['ValidateStudyContextResponseDto']>(
        '/student/study-context/validate',
        {
          method: 'POST',
          body: JSON.stringify({
            goal: values.goal.trim(),
            availableHoursPerWeek: Number(values.availableHoursPerWeek),
            targetDeadline: deadlineAtLocalDayEnd(values.targetDeadline),
          }),
        },
      );
      setStudyContextDraft(draft);
      router.push('/sinh-vien/ke-hoach-hoc-tap');
    } catch {
      setServerError('Không thể xác nhận dữ liệu lúc này. Vui lòng thử lại.');
    }
  });

  const today = new Date();
  const minDeadline = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  return <form className="mt-6 max-w-2xl space-y-5" onSubmit={submit} noValidate>
    <div>
      <label className="mb-2 block text-sm font-semibold" htmlFor="goal">Mục tiêu học tập *</label>
      <textarea id="goal" rows={4} aria-invalid={!!errors.goal} aria-describedby={errors.goal ? 'goal-error' : undefined}
        className="w-full border border-ink bg-white px-3 py-3 focus-visible:outline-2 focus-visible:outline-teal"
        {...register('goal', { validate: (value) => !!value.trim() || 'Nhập mục tiêu học tập.' })} />
      {errors.goal && <p id="goal-error" className="mt-1 text-sm text-red-800">{errors.goal.message}</p>}
    </div>
    <div>
      <label className="mb-2 block text-sm font-semibold" htmlFor="availableHoursPerWeek">Số giờ có thể học / tuần *</label>
      <div className="flex items-center gap-3">
        <input id="availableHoursPerWeek" type="number" inputMode="decimal" step="any" min="0" aria-invalid={!!errors.availableHoursPerWeek}
          aria-describedby={errors.availableHoursPerWeek ? 'hours-error' : undefined}
          className="w-full border border-ink bg-white px-3 py-3 focus-visible:outline-2 focus-visible:outline-teal"
          {...register('availableHoursPerWeek', { validate: (value) => Number.isFinite(Number(value)) && Number(value) > 0 || 'Số giờ học mỗi tuần phải lớn hơn 0.' })} />
        <span>giờ</span>
      </div>
      {errors.availableHoursPerWeek && <p id="hours-error" className="mt-1 text-sm text-red-800">{errors.availableHoursPerWeek.message}</p>}
    </div>
    <div>
      <label className="mb-2 block text-sm font-semibold" htmlFor="targetDeadline">Deadline mục tiêu *</label>
      <input id="targetDeadline" type="date" min={minDeadline} aria-invalid={!!errors.targetDeadline}
        aria-describedby={errors.targetDeadline ? 'deadline-error' : undefined}
        className="w-full border border-ink bg-white px-3 py-3 focus-visible:outline-2 focus-visible:outline-teal"
        {...register('targetDeadline', { validate: (value) => {
          if (!value) return 'Chọn thời hạn trong tương lai.';
          return new Date(deadlineAtLocalDayEnd(value)) > new Date() || 'Chọn thời hạn trong tương lai.';
        } })} />
      {errors.targetDeadline && <p id="deadline-error" className="mt-1 text-sm text-red-800">{errors.targetDeadline.message}</p>}
    </div>
    {serverError && <p role="alert" className="border-l-4 border-red-800 bg-white p-3 text-sm text-red-800">{serverError}</p>}
    <button type="submit" disabled={isSubmitting}
      className="min-h-11 border border-ink bg-accent px-5 py-3 font-semibold shadow-[2px_2px_0_#000] hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
      {isSubmitting ? 'Đang xác nhận…' : 'Xác nhận & tiếp tục'}
    </button>
  </form>;
}
