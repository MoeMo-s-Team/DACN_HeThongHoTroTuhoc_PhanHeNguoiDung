'use client';

import { useEffect, useState } from 'react';
import { StudentNavigation } from '../student-navigation';
import { getStudyContextDraft, StudyContextDraft } from '../muc-tieu-hoc-tap/study-context-draft';

export function StudyPlanHandoff() {
  const [draft, setDraft] = useState<StudyContextDraft | null>(null);
  useEffect(() => setDraft(getStudyContextDraft()), []);

  return <div className="grid w-full gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6">
    <StudentNavigation currentPath="/sinh-vien/ke-hoach-hoc-tap" />
    <section aria-labelledby="study-plan-title" className="min-w-0">
      <header className="border-b border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-teal">Student · Học tập</p>
        <h1 id="study-plan-title" className="mt-2 text-3xl font-bold sm:text-4xl">Kế hoạch học tập</h1>
      </header>
      {draft ? <div className="mt-6 max-w-2xl border border-ink bg-white p-5">
        <p className="text-sm font-bold uppercase tracking-widest">Dữ liệu đã xác nhận</p>
        <p className="mt-4">{draft.goal}</p>
        <p className="mt-2 text-sm">{draft.availableMinutesPerWeek} phút / tuần · Hạn {new Date(draft.targetDeadline).toLocaleDateString('vi-VN')}</p>
        <p role="status" className="mt-5 border-t border-ink/30 pt-4 text-sm">Tạo kế hoạch học tập chưa được triển khai.</p>
      </div> : <p className="mt-6 border border-ink bg-white p-5">Chưa có dữ liệu mục tiêu đã xác nhận. Hãy nhập mục tiêu học tập trước.</p>}
    </section>
  </div>;
}
