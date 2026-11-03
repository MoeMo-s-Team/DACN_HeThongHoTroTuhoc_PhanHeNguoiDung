'use client';

import Link from 'next/link';
import { useQuery } from '@tanstack/react-query';
import type { components } from '@dacn/contracts';
import { apiRequest } from '../../auth/api';
import { StudentNavigation } from '../student-navigation';

type Results = components['schemas']['StudentAssessmentResultsResponseDto'];

const classificationLabel: Record<components['schemas']['AssessmentResultViewDto']['classification'], string> = {
  GOOD: 'Tốt',
  NEEDS_REINFORCEMENT: 'Cần củng cố',
  PRIORITY: 'Cần ưu tiên',
};

function formatDate(value: string) {
  return new Date(value).toLocaleString('vi-VN');
}

export function StudentAssessmentResults() {
  const query = useQuery({
    queryKey: ['student', 'assessment-results'],
    queryFn: () => apiRequest<Results>('/student/assessment-results'),
  });

  return <div className="grid w-full gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6">
    <StudentNavigation currentPath="/sinh-vien/ket-qua-hoc-tap" />
    <section aria-labelledby="results-title" className="min-w-0">
      <header className="border-b border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-teal">Student · Học tập</p>
        <h1 id="results-title" className="mt-2 text-3xl font-bold sm:text-4xl">Kết quả học tập</h1>
        <p className="mt-3 max-w-2xl">Kết quả mới nhất theo từng chủ đề.</p>
      </header>

      {query.isPending && <div role="status" className="mt-6 border border-ink bg-white p-6">
        <p className="font-semibold">Đang tải kết quả học tập…</p>
      </div>}

      {query.isError && <div role="alert" className="mt-6 border border-ink border-l-4 border-l-teal bg-white p-6">
        <h2 className="font-bold">Không thể tải kết quả học tập.</h2>
        <p className="mt-2 text-sm">Kiểm tra kết nối rồi thử lại.</p>
        <button className="mt-4 min-h-11 border border-ink bg-accent px-4 py-2 font-semibold hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2" onClick={() => void query.refetch()}>
          Thử lại
        </button>
      </div>}

      {query.data && <>
        {query.data.items.length ? <div className="mt-6 overflow-x-auto border-t border-ink">
          <table className="w-full border-collapse text-left text-sm">
            <thead><tr className="border-b border-ink">
              <th scope="col" className="py-3 pr-4">Chủ đề</th>
              <th scope="col" className="py-3 pr-4">Điểm</th>
              <th scope="col" className="py-3 pr-4">Đánh giá</th>
              <th scope="col" className="py-3">Cập nhật</th>
            </tr></thead>
            <tbody>{query.data.items.map((result) => <tr key={result.topic.id} className="border-b border-ink/30">
              <th scope="row" className="py-3 pr-4 font-semibold">{result.topic.name}</th>
              <td className="py-3 pr-4">{result.score}</td>
              <td className="py-3 pr-4"><span className="inline-block border border-ink px-2 py-1">{classificationLabel[result.classification]}</span></td>
              <td className="whitespace-nowrap py-3">{formatDate(result.evaluatedAt)}</td>
            </tr>)}</tbody>
          </table>
        </div> : <p className="mt-6 border-t border-ink pt-5">Chưa có kết quả học tập.</p>}

        <div className="mt-6 flex justify-end">
          <Link href="/sinh-vien/phan-tich-ai" className="inline-flex min-h-11 items-center border border-ink bg-accent px-4 py-2 font-semibold hover:bg-teal hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2">
            Phân tích bằng AI
          </Link>
        </div>
      </>}
    </section>
  </div>;
}
