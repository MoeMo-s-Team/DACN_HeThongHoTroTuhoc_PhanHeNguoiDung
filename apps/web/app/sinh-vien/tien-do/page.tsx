import { AuthenticatedHome } from '../../auth/authenticated-home';
import { StudentProgress } from './student-progress';

export default function StudentProgressPage() {
  return <AuthenticatedHome role="STUDENT"><StudentProgress /></AuthenticatedHome>;
}
