import { AuthenticatedHome } from '../../auth/authenticated-home';
import { StudentDashboard } from './student-dashboard';

export default function StudentHome() {
  return <AuthenticatedHome role="STUDENT"><StudentDashboard /></AuthenticatedHome>;
}
