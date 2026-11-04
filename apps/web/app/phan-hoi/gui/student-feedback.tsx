'use client';

import { useRef } from 'react';
import { useMutation } from '@tanstack/react-query';
import { useForm } from 'react-hook-form';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../auth/api';
import { StudentNavigation } from '../../sinh-vien/student-navigation';

type CreateFeedbackRequest = components['schemas']['CreateFeedbackRequestDto'];
type CreateFeedbackResponse = components['schemas']['CreateFeedbackResponseDto'];
type FeedbackTag = CreateFeedbackRequest['tag'];
type FormValues = { tag: FeedbackTag | ''; rating: string; content: string };

const tags: Array<{ value: FeedbackTag; label: string }> = [
  { value: 'AI_PERFORMANCE', label: 'AI hỗ trợ' },
  { value: 'STUDY_PLAN', label: 'Kế hoạch học tập' },
  { value: 'UI_UX', label: 'Giao diện & trải nghiệm' },
  { value: 'LEARNING_ANALYTICS', label: 'Kết quả & tiến độ học tập' },
  { value: 'OTHER', label: 'Khác' },
];

export function StudentFeedback() {
  const submitting = useRef(false);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<FormValues>({
    defaultValues: { tag: '', rating: '', content: '' },
  });
  const mutation = useMutation({
    mutationFn: (input: CreateFeedbackRequest) => apiRequest<CreateFeedbackResponse>('/feedback', {
      method: 'POST',
      body: JSON.stringify(input),
    }),
    onSuccess: () => reset(),
  });

  const submit = handleSubmit(async (values) => {
    if (submitting.current) return;
    submitting.current = true;
    try {
      await mutation.mutateAsync({ tag: values.tag as FeedbackTag, rating: Number(values.rating), content: values.content }).catch(() => undefined);
    } finally {
      submitting.current = false;
    }
  });

  return <div className="grid w-full gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6">
    <StudentNavigation currentPath="/phan-hoi/gui" />
    <section aria-labelledby="feedback-title" className="min-w-0">
      <header className="border-b border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-teal">Student · Học tập</p>
        <h1 id="feedback-title" className="mt-2 text-3xl font-bold sm:text-4xl">Gửi phản hồi</h1>
        <p className="mt-3 max-w-2xl">Chia sẻ trải nghiệm của bạn để hệ thống hỗ trợ học tập tốt hơn.</p>
      </header>

      <form className="mt-6 max-w-2xl space-y-5" onSubmit={submit} noValidate onChange={() => { if (mutation.isSuccess) mutation.reset(); }}>
        <div>
          <label className="mb-2 block text-sm font-semibold" htmlFor="feedback-tag">Nhóm phản hồi *</label>
          <select id="feedback-tag" aria-invalid={!!errors.tag} aria-describedby={errors.tag ? 'feedback-tag-error' : undefined}
            className="min-h-11 w-full border border-ink bg-white px-3 py-2 focus-visible:outline-2 focus-visible:outline-teal"
            {...register('tag', { required: 'Chọn nhóm phản hồi.' })}>
            <option value="">Chọn nhóm phản hồi</option>
            {tags.map((tag) => <option key={tag.value} value={tag.value}>{tag.label}</option>)}
          </select>
          {errors.tag && <p id="feedback-tag-error" role="alert" className="mt-1 text-sm text-red-800">{errors.tag.message}</p>}
        </div>

        <fieldset aria-describedby={errors.rating ? 'feedback-rating-error' : undefined}>
          <legend className="mb-2 text-sm font-semibold">Mức đánh giá *</legend>
          <div className="flex flex-wrap gap-2">
            {[1, 2, 3, 4, 5].map((rating) => <label key={rating} className="inline-flex min-h-11 cursor-pointer items-center gap-2 border border-ink bg-white px-3 py-2 focus-within:outline-2 focus-within:outline-teal">
              <input type="radio" value={rating} aria-label={`${rating} sao`}
                {...register('rating', {
                  required: 'Chọn mức đánh giá từ 1 đến 5.',
                  validate: (value) => ['1', '2', '3', '4', '5'].includes(value) || 'Chọn mức đánh giá từ 1 đến 5.',
                })} />
              <span>{rating}</span>
            </label>)}
          </div>
          {errors.rating && <p id="feedback-rating-error" role="alert" className="mt-1 text-sm text-red-800">{errors.rating.message}</p>}
        </fieldset>

        <div>
          <label className="mb-2 block text-sm font-semibold" htmlFor="feedback-content">Nội dung phản hồi *</label>
          <textarea id="feedback-content" rows={5} aria-invalid={!!errors.content} aria-describedby={errors.content ? 'feedback-content-error' : undefined}
            className="w-full border border-ink bg-white px-3 py-3 focus-visible:outline-2 focus-visible:outline-teal"
            {...register('content', { validate: (value) => !!value.trim() || 'Nội dung phản hồi không được để trống.' })} />
          {errors.content && <p id="feedback-content-error" role="alert" className="mt-1 text-sm text-red-800">{errors.content.message}</p>}
        </div>

        {mutation.isSuccess && <p role="status" className="border-l-4 border-teal bg-white p-3">Đã gửi phản hồi. Cảm ơn bạn!</p>}
        {mutation.isError && <p role="alert" className="border-l-4 border-red-800 bg-white p-3 text-red-800">Không thể gửi phản hồi. Vui lòng thử lại.</p>}

        <button type="submit" disabled={mutation.isPending}
          onClick={() => { if (mutation.isSuccess) mutation.reset(); }}
          className="min-h-11 border border-ink bg-accent px-5 py-3 font-semibold hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 disabled:cursor-not-allowed disabled:opacity-60">
          {mutation.isPending ? 'Đang gửi…' : 'Gửi phản hồi'}
        </button>
      </form>
    </section>
  </div>;
}
