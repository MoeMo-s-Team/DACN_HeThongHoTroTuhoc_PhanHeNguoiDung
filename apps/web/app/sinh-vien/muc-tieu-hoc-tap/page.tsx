import { AuthenticatedHome } from '../../auth/authenticated-home';
import { StudyContextForm } from './study-context-form';
import { StudentNavigation } from '../student-navigation';

export default function StudyContextPage() {
  return <AuthenticatedHome role="STUDENT"><div className="grid w-full gap-8 px-5 py-8 sm:px-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:px-6">
    <StudentNavigation currentPath="/sinh-vien/muc-tieu-hoc-tap" />
    <section aria-labelledby="study-context-title" className="min-w-0">
      <header className="border-b border-ink pb-6">
        <p className="text-sm font-bold uppercase tracking-widest text-teal">Student · Học tập</p>
        <h1 id="study-context-title" className="mt-2 text-3xl font-bold sm:text-4xl">Mục tiêu & khả năng học</h1>
        <p className="mt-3 max-w-2xl">Cho biết mục tiêu và thời gian bạn có thể dành cho việc học mỗi tuần.</p>
      </header>
      <StudyContextForm />
    </section>
  </div></AuthenticatedHome>;
}
