'use client';

import { useEffect, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { ApiError, apiRequest } from '../../auth/api';
import { StudentNavigation } from '../student-navigation';
import { getStudyContextDraft, StudyContextDraft } from '../muc-tieu-hoc-tap/study-context-draft';

type AssessmentResults = { items: Array<{ topic: { id: string; name: string }; score: number; classification: string; evaluatedAt: string }> };
type Analysis = { strengths: string[]; areasToImprove: string[]; priorityTopics: Array<{ topicId: string; topicName: string; reason: string }>; reasons: string[] };

function errorText(error: unknown) {
  return error instanceof ApiError ? error.message : 'Không thể xử lý yêu cầu. Kiểm tra kết nối rồi thử lại.';
}

export function LearningAnalysis() {
  const [draft, setDraft] = useState<StudyContextDraft | null>(null);
  const assessments = useQuery({ queryKey: ['student', 'assessment-results'], queryFn: () => apiRequest<AssessmentResults>('/student/assessment-results') });
  const analysis = useMutation({
    mutationFn: () => apiRequest<Analysis>('/student/ai/learning-analysis', {
      method: 'POST', body: JSON.stringify(draft?.goal ? { goal: draft.goal } : {}),
    }),
  });
  useEffect(() => setDraft(getStudyContextDraft()), []);

  return <div className="grid w-full gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6">
    <StudentNavigation currentPath="/sinh-vien/phan-tich-ai" />
    <section aria-labelledby="learning-analysis-title" className="min-w-0">
      <header className="border-b border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-teal">Student · AI hỗ trợ học tập</p>
        <h1 id="learning-analysis-title" className="mt-2 text-3xl font-bold sm:text-4xl">Phân tích học tập bằng AI</h1>
      </header>

      {assessments.isPending && <p role="status" className="mt-6 border border-ink bg-white p-5">Đang tải kết quả học tập…</p>}
      {assessments.isError && <p role="alert" className="mt-6 border border-ink bg-white p-5">{errorText(assessments.error)}</p>}
      {assessments.data && <section className="mt-6 max-w-3xl border border-ink bg-white p-5">
        <h2 className="text-lg font-bold">Dữ liệu dùng để phân tích</h2>
        {draft?.goal && <p className="mt-2">Mục tiêu: {draft.goal}</p>}
        <ul className="mt-3 space-y-1 text-sm">
          {assessments.data.items.map((item) => <li key={item.topic.id}>{item.topic.name} · {item.score.toFixed(1)} · {item.classification}</li>)}
        </ul>
        {!assessments.data.items.length ? <p className="mt-4" role="status">Chưa có kết quả đánh giá. Hãy hoàn thành bài đánh giá trước.</p> : <button
          type="button" disabled={analysis.isPending} className="mt-5 min-h-11 border border-ink bg-accent px-4 py-2 font-semibold disabled:opacity-60"
          onClick={() => analysis.mutate()}>
          {analysis.isPending ? 'Đang phân tích…' : 'Phân tích bằng AI'}
        </button>}
      </section>}

      {analysis.isError && <p role="alert" className="mt-4 max-w-3xl border border-ink border-l-4 border-l-teal bg-white p-4">{errorText(analysis.error)}</p>}
      {analysis.data && <section aria-labelledby="analysis-result-title" className="mt-6 max-w-3xl space-y-4">
        <h2 id="analysis-result-title" className="text-xl font-bold">Nhận định AI</h2>
        <p className="text-sm">Đây là nhận định từ dữ liệu học tập hiện có; điểm số và tiến độ được hệ thống tính riêng.</p>
        <article className="border border-ink bg-white p-5"><h3 className="font-bold">Điểm mạnh</h3><ul className="mt-2 list-disc pl-5">{analysis.data.strengths.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></article>
        <article className="border border-ink bg-white p-5"><h3 className="font-bold">Nội dung cần củng cố</h3><ul className="mt-2 list-disc pl-5">{analysis.data.areasToImprove.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></article>
        <article className="border border-ink bg-white p-5"><h3 className="font-bold">Chủ đề ưu tiên</h3><ul className="mt-2 list-disc pl-5">{analysis.data.priorityTopics.map((item) => <li key={item.topicId}><strong>{item.topicName}</strong> — {item.reason}</li>)}</ul></article>
        <article className="border border-ink bg-white p-5"><h3 className="font-bold">Cơ sở phân tích</h3><ul className="mt-2 list-disc pl-5">{analysis.data.reasons.map((item, index) => <li key={`${index}-${item}`}>{item}</li>)}</ul></article>
      </section>}
    </section>
  </div>;
}
