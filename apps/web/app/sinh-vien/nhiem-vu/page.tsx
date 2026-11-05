import { AuthenticatedHome } from '../../auth/authenticated-home';
import { StudentTasks } from './student-tasks';

export default function StudentTasksPage() {
  return <AuthenticatedHome role="STUDENT"><StudentTasks /></AuthenticatedHome>;
}
